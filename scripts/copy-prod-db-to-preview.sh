#!/usr/bin/env bash
#
# Copy the production database over the preview database.
#
# Production is only ever read (pg_dump). The preview database is dropped and
# recreated from that dump, so it ends up an exact clone: schema, data, and
# drizzle migration state.
#
# Connection strings are read from .env:
#   PRODUCTION_DATABASE_URL  (source, read-only)
#   PREVIEW_DATABASE_URL     (target, DESTROYED and rebuilt)
#
# Usage: scripts/copy-prod-db-to-preview.sh [options]
#   -y, --yes        skip the confirmation prompt
#   -n, --dry-run    probe both ends and print the plan, change nothing
#       --keep-dump  don't delete the dump file; print where it landed
#   -h, --help       show this help

set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
CONNECT_TIMEOUT=15

ASSUME_YES=0
DRY_RUN=0
KEEP_DUMP=0

# ---------------------------------------------------------------- output ------

if [[ -t 1 ]]; then
	B=$'\033[1m' DIM=$'\033[2m' RED=$'\033[31m' GRN=$'\033[32m' YLW=$'\033[33m' CYN=$'\033[36m' R=$'\033[0m'
else
	B='' DIM='' RED='' GRN='' YLW='' CYN='' R=''
fi

step() { printf '%s==>%s %s%s%s\n' "$CYN" "$R" "$B" "$*" "$R"; }
info() { printf '    %s\n' "$*"; }
note() { printf '    %s%s%s\n' "$DIM" "$*" "$R"; }
warn() { printf '%s warn%s %s\n' "$YLW" "$R" "$*" >&2; }
ok() { printf '%s  ok%s %s\n' "$GRN" "$R" "$*"; }
die() {
	printf '%serror%s %s\n' "$RED" "$R" "$*" >&2
	exit 1
}

# Prints the header comment above, minus the shebang, stopping at the first line
# that isn't a comment.
usage() {
	awk 'NR == 1 { next } /^#/ { sub(/^#[[:space:]]?/, ""); print; next } { exit }' \
		"${BASH_SOURCE[0]}"
}

# ------------------------------------------------------------------ args ------

while [[ $# -gt 0 ]]; do
	case $1 in
		-y | --yes) ASSUME_YES=1 ;;
		-n | --dry-run) DRY_RUN=1 ;;
		--keep-dump) KEEP_DUMP=1 ;;
		-h | --help)
			usage
			exit 0
			;;
		*) die "unknown option: $1 (try --help)" ;;
	esac
	shift
done

# --------------------------------------------------------------- env file -----

[[ -f $ENV_FILE ]] || die "no env file at $ENV_FILE"

# Pull one KEY=value out of the env file without sourcing it (the file holds
# secrets with characters a shell would happily interpret).
read_env() {
	local key=$1 line value
	line=$(grep -E "^[[:space:]]*(export[[:space:]]+)?${key}=" "$ENV_FILE" | tail -n1) || true
	[[ -n $line ]] || return 1
	value=${line#*=}
	value=${value%$'\r'}
	value=${value%"${value##*[![:space:]]}"} # rstrip
	# strip one layer of matching quotes
	if [[ ${#value} -ge 2 && $value == \"*\" ]]; then
		value=${value:1:${#value}-2}
	elif [[ ${#value} -ge 2 && $value == \'*\' ]]; then
		value=${value:1:${#value}-2}
	fi
	printf '%s' "$value"
}

# Percent-decode, so credentials work whether or not they're URL-encoded.
pct_decode() {
	local s=$1
	s=${s//\\/\\\\}
	printf '%b' "${s//%/\\x}"
}

# Parse a postgres URL into PARSED_{USER,PASS,HOST,PORT,DB}.
#
# Splits userinfo from host on the LAST '@' rather than the first, so a password
# containing a literal '@' still parses. libpq itself splits on the first '@'
# and would read the rest of the password as part of the hostname.
parse_url() {
	local url=$1 rest userinfo hostinfo hostport
	[[ $url == postgres://* || $url == postgresql://* ]] ||
		die "not a postgres:// URL: $url"
	rest=${url#*://}
	rest=${rest%%\?*} # drop any query string

	[[ $rest == *@* ]] || die "URL has no credentials: $url"
	userinfo=${rest%@*}
	hostinfo=${rest##*@}

	PARSED_USER=$(pct_decode "${userinfo%%:*}")
	if [[ $userinfo == *:* ]]; then
		PARSED_PASS=$(pct_decode "${userinfo#*:}")
	else
		PARSED_PASS=''
	fi

	hostport=${hostinfo%%/*}
	PARSED_HOST=${hostport%%:*}
	if [[ $hostport == *:* ]]; then
		PARSED_PORT=${hostport##*:}
	else
		PARSED_PORT=5432
	fi

	[[ $hostinfo == */* ]] || die "URL has no database name: $url"
	PARSED_DB=$(pct_decode "${hostinfo#*/}")

	[[ -n $PARSED_HOST && -n $PARSED_DB ]] || die "could not parse URL: $url"
}

SRC_URL=$(read_env PRODUCTION_DATABASE_URL) ||
	die "PRODUCTION_DATABASE_URL is not set in $ENV_FILE"
TGT_URL=$(read_env PREVIEW_DATABASE_URL) ||
	die "PREVIEW_DATABASE_URL is not set in $ENV_FILE"

parse_url "$SRC_URL"
SRC_USER=$PARSED_USER SRC_PASS=$PARSED_PASS
SRC_HOST=$PARSED_HOST SRC_PORT=$PARSED_PORT SRC_DB=$PARSED_DB

parse_url "$TGT_URL"
TGT_USER=$PARSED_USER TGT_PASS=$PARSED_PASS
TGT_HOST=$PARSED_HOST TGT_PORT=$PARSED_PORT TGT_DB=$PARSED_DB

# Refuse to point the destructive half of this script at production.
if [[ $SRC_HOST == "$TGT_HOST" && $SRC_PORT == "$TGT_PORT" && $SRC_DB == "$TGT_DB" ]]; then
	die "source and target are the same database ($SRC_HOST:$SRC_PORT/$SRC_DB) — refusing to drop it"
fi

# ---------------------------------------------------------------- clients -----

# pg_dump/pg_restore refuse to work against a *newer* server, and dumps written
# by a newer pg_dump can carry syntax an older server rejects. Prefer client
# tools whose major version matches the server; fall back to a matching Docker
# image when the local install is a different major.
ENGINE=''
DOCKER_IMAGE=''
LOCAL_MAJOR=''

have_local=0
if command -v pg_dump >/dev/null 2>&1 && command -v psql >/dev/null 2>&1 &&
	command -v pg_restore >/dev/null 2>&1; then
	have_local=1
	LOCAL_MAJOR=$(pg_dump --version | grep -oE '[0-9]+' | head -1)
fi

have_docker=0
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
	have_docker=1
fi

if [[ $have_local != 1 && $have_docker != 1 ]]; then
	die "need postgres client tools (brew install postgresql) or a running Docker daemon"
fi

ensure_image() {
	docker image inspect "$1" >/dev/null 2>&1 && return 0
	info "client    pulling $1 ..."
	docker pull -q "$1" >/dev/null || die "could not pull $1"
}

WORK_DIR=''
cleanup() {
	if [[ -n $WORK_DIR && -d $WORK_DIR ]]; then
		if [[ $KEEP_DUMP == 1 ]]; then
			printf '    %sdump kept at %s%s\n' "$DIM" "$WORK_DIR/production.dump" "$R"
		else
			rm -rf "$WORK_DIR"
		fi
	fi
}
trap cleanup EXIT

PG_PASSWORD=''
DUMP_PATH='' # path as the client tool sees it

# Run a postgres client tool, locally or in a version-matched container.
#
# -w forbids an interactive password prompt: every caller below goes through a
# helper that sets PG_PASSWORD, so a prompt means that wiring broke and we want
# a fast, obvious failure instead of a hung script.
pg_run() {
	local tool=$1
	shift
	if [[ $ENGINE == docker ]]; then
		docker run --rm -i \
			--user "$(id -u):$(id -g)" \
			-e "PGPASSWORD=$PG_PASSWORD" \
			-e "PGCONNECT_TIMEOUT=$CONNECT_TIMEOUT" \
			-v "$WORK_DIR:/work" \
			"$DOCKER_IMAGE" "$tool" -w "$@"
	else
		PGPASSWORD="$PG_PASSWORD" PGCONNECT_TIMEOUT="$CONNECT_TIMEOUT" "$tool" -w "$@"
	fi
}

# These databases sit behind a public IP, and a short-lived connection across
# the open internet times out now and then. Retry rather than throwing away a
# whole run over one blip. Output is captured so it survives to the caller;
# stderr is folded in so failures still carry their psql message.
retry() {
	local tries=$1 attempt=1 out status
	shift
	while :; do
		if out=$("$@" 2>&1); then
			printf '%s' "$out"
			return 0
		fi
		status=$?
		[[ $attempt -lt $tries ]] || {
			printf '%s' "$out"
			return "$status"
		}
		attempt=$((attempt + 1))
		sleep 3
	done
}

src_psql() {
	PG_PASSWORD=$SRC_PASS
	pg_run psql -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -v ON_ERROR_STOP=1 "$@"
}
tgt_psql() {
	PG_PASSWORD=$TGT_PASS
	pg_run psql -h "$TGT_HOST" -p "$TGT_PORT" -U "$TGT_USER" -v ON_ERROR_STOP=1 "$@"
}

# Counts every base table in one round-trip, so the verification step stays cheap.
ROW_COUNT_SQL="
SELECT table_schema || '.' || table_name AS rel,
       (xpath('/row/c/text()',
              query_to_xml(format('SELECT count(*) AS c FROM %I.%I', table_schema, table_name),
                           false, true, '')))[1]::text::bigint AS n
FROM information_schema.tables
WHERE table_type = 'BASE TABLE'
  AND table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY 1;"

# ------------------------------------------------------------------ probe -----

step "Probing production"

# The version probe itself only needs any psql, so bootstrap with whatever exists.
WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/route-picker-dbcopy.XXXXXX")
if [[ $have_local == 1 ]]; then
	ENGINE=local
else
	ENGINE=docker
	DOCKER_IMAGE=postgres:latest
	ensure_image "$DOCKER_IMAGE"
fi

probe=$(retry 3 src_psql -d "$SRC_DB" -tAF'|' -c \
	"SELECT current_setting('server_version'),
	        current_setting('server_version_num')::int / 10000") ||
	die "cannot connect to production ($SRC_USER@$SRC_HOST:$SRC_PORT/$SRC_DB):
    ${probe#psql: error: }"
IFS='|' read -r SERVER_VERSION SERVER_MAJOR <<<"$probe"
info "server    PostgreSQL $SERVER_VERSION at $SRC_HOST:$SRC_PORT"

# Now pick the client that actually matches the server.
if [[ $have_local == 1 && $LOCAL_MAJOR == "$SERVER_MAJOR" ]]; then
	ENGINE=local
	info "client    local pg_dump $LOCAL_MAJOR"
elif [[ $have_docker == 1 ]]; then
	ENGINE=docker
	DOCKER_IMAGE="postgres:$SERVER_MAJOR"
	ensure_image "$DOCKER_IMAGE"
	info "client    $DOCKER_IMAGE (local tools are ${LOCAL_MAJOR:-absent}, server is $SERVER_MAJOR)"
else
	ENGINE=local
	warn "local client tools are v$LOCAL_MAJOR but the server is v$SERVER_MAJOR, and Docker is unavailable"
	info "client    local pg_dump $LOCAL_MAJOR (version mismatch)"
fi

db_settings=$(retry 3 src_psql -d "$SRC_DB" -tAF'|' -c \
	"SELECT pg_encoding_to_char(encoding), datcollate, datctype,
	        pg_size_pretty(pg_database_size(datname))
	 FROM pg_database WHERE datname = current_database()") ||
	die "could not read production database settings"
IFS='|' read -r SRC_ENCODING SRC_COLLATE SRC_CTYPE SRC_SIZE <<<"$db_settings"

info "source    $SRC_DB ($SRC_SIZE, $SRC_ENCODING / $SRC_COLLATE)"

SRC_COUNTS=$(retry 3 src_psql -d "$SRC_DB" -tAF'|' -c "$ROW_COUNT_SQL") ||
	die "could not count production tables"
SRC_TABLES=$(printf '%s\n' "$SRC_COUNTS" | grep -c . || true)
SRC_ROWS=$(printf '%s\n' "$SRC_COUNTS" | awk -F'|' '{t += $2} END {print t + 0}')
info "contents  $SRC_TABLES tables, $SRC_ROWS rows"

[[ $SRC_TABLES -gt 0 ]] ||
	die "production has no tables — refusing to overwrite preview with an empty database"

step "Probing preview"
TGT_EXISTS=$(retry 3 tgt_psql -d postgres -tAc \
	"SELECT count(*) FROM pg_database WHERE datname = '${TGT_DB//\'/\'\'}'") ||
	die "cannot connect to the preview server ($TGT_USER@$TGT_HOST:$TGT_PORT/postgres):
    ${TGT_EXISTS#psql: error: }"

if [[ $TGT_EXISTS == 0 ]]; then
	info "target    $TGT_DB does not exist yet — it will be created"
else
	TGT_SIZE=$(retry 3 tgt_psql -d "$TGT_DB" -tAc \
		"SELECT pg_size_pretty(pg_database_size(current_database()))")
	TGT_ROWS=$(retry 3 tgt_psql -d "$TGT_DB" -tAF'|' -c "$ROW_COUNT_SQL" |
		awk -F'|' '{t += $2} END {print t + 0}')
	info "target    $TGT_DB exists ($TGT_SIZE, $TGT_ROWS rows) — it will be ${B}${RED}dropped${R}"
fi

# ------------------------------------------------------------------- plan -----

echo
printf '  %scopy%s  %s/%s  %s->%s  %s/%s\n' \
	"$B" "$R" "$SRC_HOST:$SRC_PORT" "$SRC_DB" "$DIM" "$R" "$TGT_HOST:$TGT_PORT" "$TGT_DB"
echo

if [[ $DRY_RUN == 1 ]]; then
	ok "dry run — nothing was changed"
	exit 0
fi

if [[ $ASSUME_YES != 1 ]]; then
	[[ -t 0 ]] || die "not a terminal; re-run with --yes to skip confirmation"
	printf 'This destroys %s%s%s. Type the database name to continue: ' "$B" "$TGT_DB" "$R"
	read -r reply
	[[ $reply == "$TGT_DB" ]] || die "aborted"
	echo
fi

# ------------------------------------------------------------------- dump -----

step "Dumping production"
if [[ $ENGINE == docker ]]; then
	DUMP_PATH=/work/production.dump
else
	DUMP_PATH="$WORK_DIR/production.dump"
fi

src_dump() {
	PG_PASSWORD=$SRC_PASS
	pg_run pg_dump -h "$SRC_HOST" -p "$SRC_PORT" -U "$SRC_USER" -d "$SRC_DB" "$@"
}

# Writing to a file first means a failed dump never reaches the preview database.
# Each attempt rewrites the file from scratch, so retrying is safe.
dump_err=$(retry 3 src_dump \
	--format=custom \
	--no-owner \
	--no-privileges \
	--file="$DUMP_PATH") ||
	die "pg_dump failed — preview was not touched:
    ${dump_err#pg_dump: error: }"

ok "dumped $(du -h "$WORK_DIR/production.dump" | cut -f1 | tr -d ' ')"

# ---------------------------------------------------------------- recreate ----

step "Recreating $TGT_DB"

# Built from template0 with production's encoding and collation, so the clone
# sorts and compares text identically. :"db" interpolates as a quoted
# identifier, which the hyphen in "routepicker-preview" needs.
recreate_target() {
	tgt_psql -d postgres \
		-v db="$TGT_DB" -v owner="$TGT_USER" \
		-v enc="$SRC_ENCODING" -v coll="$SRC_COLLATE" -v ctype="$SRC_CTYPE" \
		--quiet -o /dev/null <<'SQL'
SET client_min_messages = warning;
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = :'db' AND pid <> pg_backend_pid();
DROP DATABASE IF EXISTS :"db";
CREATE DATABASE :"db"
  OWNER :"owner"
  TEMPLATE template0
  ENCODING :'enc'
  LC_COLLATE :'coll'
  LC_CTYPE :'ctype';
SQL
}

recreate_err=$(retry 3 recreate_target) ||
	die "could not recreate $TGT_DB:
    ${recreate_err#psql: error: }"
ok "empty database created ($SRC_ENCODING, $SRC_COLLATE)"

# ---------------------------------------------------------------- restore -----

step "Restoring into $TGT_DB"
restore_log="$WORK_DIR/restore.log"
tgt_restore() {
	PG_PASSWORD=$TGT_PASS
	pg_run pg_restore -h "$TGT_HOST" -p "$TGT_PORT" -U "$TGT_USER" -d "$TGT_DB" "$@"
}

# --single-transaction implies --exit-on-error, so a partial restore rolls all
# the way back rather than leaving a half-populated preview database.
restore_once() {
	tgt_restore \
		--no-owner \
		--no-privileges \
		--single-transaction \
		"$DUMP_PATH" >"$restore_log" 2>&1
}

# A dropped connection mid-restore is worth another go — but a schema or data
# error isn't, and re-running a large restore twice more to reach the same
# failure just wastes time. Only the transport-level messages get a retry.
restore_died_on_connection() {
	grep -qiE 'could not connect|connection to server|connection to the server|server closed the connection|connection (was )?lost|SSL SYSCALL error|timeout expired|EOF detected' \
		"$restore_log"
}

attempt=1
while :; do
	if restore_once; then
		ok "restored"
		if [[ -s $restore_log ]]; then
			note "$(head -20 "$restore_log")"
		fi
		break
	fi

	if [[ $attempt -ge 3 ]] || ! restore_died_on_connection; then
		echo
		cat "$restore_log" >&2
		KEEP_DUMP=1
		die "pg_restore failed and rolled back; $TGT_DB is empty"
	fi

	warn "restore attempt $attempt lost its connection — retrying"
	attempt=$((attempt + 1))
	sleep 3

	# The rollback leaves the target empty, so a retry is safe. Recreate it
	# anyway: if the connection died in the window after COMMIT landed, the
	# objects are already there and a second restore would collide with them.
	recreate_err=$(retry 3 recreate_target) ||
		die "could not recreate $TGT_DB for another restore attempt:
    ${recreate_err#psql: error: }"
done

# ----------------------------------------------------------------- verify -----

step "Verifying"
TGT_COUNTS=$(retry 3 tgt_psql -d "$TGT_DB" -tAF'|' -c "$ROW_COUNT_SQL") ||
	die "could not count preview tables"

# Production keeps taking writes while we dump and restore, so the counts read
# before the dump don't necessarily describe the snapshot pg_dump captured —
# preview can be a faithful copy and still disagree with them. Reading the
# source a second time brackets the snapshot: it was taken between the two
# readings, so a preview count that falls in that range is source drift rather
# than a bad restore. Only counts outside the range are a real problem.
SRC_COUNTS_AFTER=$(retry 3 src_psql -d "$SRC_DB" -tAF'|' -c "$ROW_COUNT_SQL") ||
	die "could not re-count production tables"

count_for() { printf '%s\n' "$1" | awk -F'|' -v r="$2" '$1 == r {print $2}'; }

between() {
	local v=$1 a=$2 b=$3 lo=$2 hi=$3
	[[ $a -le $b ]] || { lo=$b hi=$a; }
	[[ $v -ge $lo && $v -le $hi ]]
}

mismatch=0
drift=0
while IFS='|' read -r rel n; do
	[[ -n $rel ]] || continue
	got=$(count_for "$TGT_COUNTS" "$rel")
	now=$(count_for "$SRC_COUNTS_AFTER" "$rel")

	if [[ -z $got ]]; then
		if [[ -z $now ]]; then
			printf '    %-28s %8s  %sdropped from production mid-copy%s\n' "$rel" "$n" "$YLW" "$R"
			drift=1
		else
			printf '    %-28s %8s  %smissing in preview%s\n' "$rel" "$n" "$RED" "$R"
			mismatch=1
		fi
	elif [[ $got == "$n" ]]; then
		printf '    %-28s %8s  %s✓%s\n' "$rel" "$n" "$GRN" "$R"
	elif [[ -n $now ]] && between "$got" "$n" "$now"; then
		printf '    %-28s %8s  %s~ %s (production now %s)%s\n' "$rel" "$n" "$YLW" "$got" "$now" "$R"
		drift=1
	else
		printf '    %-28s %8s  %s!= %s%s\n' "$rel" "$n" "$RED" "$got" "$R"
		mismatch=1
	fi
done <<<"$SRC_COUNTS"

# A table created in production between the first count and the dump is in the
# dump, so it's legitimately in preview. Both readings count as "in production".
extra=$(comm -13 \
	<(printf '%s\n%s\n' "$SRC_COUNTS" "$SRC_COUNTS_AFTER" | cut -d'|' -f1 | sort -u) \
	<(printf '%s\n' "$TGT_COUNTS" | cut -d'|' -f1 | sort) | grep -c . || true)
[[ $extra == 0 ]] || {
	warn "$extra table(s) exist in preview but not production"
	mismatch=1
}

echo
if [[ $mismatch == 0 ]]; then
	if [[ $drift != 0 ]]; then
		note "production changed while the copy ran — preview matches the dump snapshot, not production as it stands now"
	fi
	TGT_TABLES=$(printf '%s\n' "$TGT_COUNTS" | grep -c . || true)
	TGT_ROWS=$(printf '%s\n' "$TGT_COUNTS" | awk -F'|' '{t += $2} END {print t + 0}')
	ok "$TGT_DB is now a copy of $SRC_DB ($TGT_TABLES tables, $TGT_ROWS rows)"
else
	die "row counts do not match — see above"
fi
