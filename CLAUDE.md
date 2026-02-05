# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Which Route Is Faster" — a SvelteKit web app that lets users create named routes (e.g. "To work via 6th South"), time their commutes with start/stop timers, and compare average trip durations to find the fastest route. Uses geolocation to record trip paths.

## Commands

- **Dev server:** `bun run dev`
- **Build:** `bun run build` (produces Node output in `build/`)
- **Start production:** `bun run start` (runs `node build/index.js`)
- **Type check:** `bun run check`
- **Lint:** `bun run lint` (prettier + eslint)
- **Format:** `bun run format`
- **Run all tests:** `bun run test`
- **Run tests in watch mode:** `bun run test:watch`
- **Run a single test file:** `bunx vitest run src/lib/server/updateRouteName.test.ts`
- **DB generate migrations:** `bun run db:generate`
- **DB run migrations:** `bun run db:migrate`
- **DB studio (GUI):** `bun run db:studio`
- **Start Postgres:** `docker compose up -d`

Package manager is **bun** (enforced via `preinstall` script — npm/yarn/pnpm will fail).

## Tech Stack

- **Framework:** SvelteKit (Svelte 5 with runes: `$state`, `$derived`, `$props`, `$effect`)
- **Adapter:** `@sveltejs/adapter-node`
- **Styling:** Tailwind CSS v4 (via `@tailwindcss/vite` plugin + `@tailwindcss/postcss`)
- **Database:** PostgreSQL 15 (Docker Compose), Drizzle ORM
- **Auth:** better-auth with Google + GitHub social providers, integrated via SvelteKit hooks
- **Testing:** Vitest with happy-dom environment; `@testing-library/svelte` + `@testing-library/user-event` for component tests; `vitest-mock-extended` for mocking
- **Linting:** ESLint 9 flat config + prettier + eslint-plugin-svelte

## Architecture

### Database (Drizzle)

- Schema: `src/lib/server/db/schema.ts` — tables: `user`, `session`, `account`, `verification` (auth), `route`, `routeGroup`, `trip` (app data)
- DB client: `src/lib/server/db/index.ts` — uses `pg.Pool` with `DATABASE_URL` env var
- Migrations: `drizzle/` directory, config at `drizzle.config.ts`
- Relationships: Users own RouteGroups and Routes. Routes belong to optional RouteGroups. Trips belong to Routes.

### Auth (better-auth)

- Server config: `src/lib/auth.ts` — uses Drizzle adapter with Google/GitHub social providers
- Client: `src/lib/auth-client.ts` — `createAuthClient()` from `better-auth/svelte`
- Hook: `src/hooks.server.ts` — populates `event.locals.session` and `event.locals.user` on every request
- Types: `src/app.d.ts` — `App.Locals` has `user` and `session`

### Routes (pages)

- `/` (`src/routes/+page.svelte` + `+page.server.ts`) — main page with all CRUD actions as SvelteKit form actions: `postRoute`, `deleteRoute`, `postTrip`, `deleteTrip`, `updateRouteName`, `createGroup`, `deleteGroup`, `updateGroupName`, `moveRouteToGroup`
- `/policies` — privacy/terms page
- Layout loads session/user data from locals and passes to all pages

### Components

- `RouteCard.svelte` — displays a route with inline name editing (optimistic UI, keyboard handling, ARIA), trip history accordion, Timer, and move-to-group functionality
- `RouteGroup.svelte` — collapsible group of RouteCards with inline name editing, delete, and in-group route creation
- `Timer.svelte` — start/stop timer that records geolocation at start, end, and periodically during the trip
- `SignInOut.svelte` — auth state display and sign in/out buttons

### Testing Setup

- `vitest.config.ts` — workspace-style config with a "server" project (node environment, `*.test.ts` files excluding `*.svelte.test.ts`)
- Component tests use `*.svelte.test.ts` suffix with happy-dom and `@testing-library/svelte`
- Browser-level tests use `*.svelte.spec.ts` suffix with `vitest-browser-svelte`
- Vitest requires assertions in every test (`expect.requireAssertions: true`)
- Server action tests mock `$lib/server/db` and `@sveltejs/kit` fail function, then import actions from `+page.server.ts`

### Environment Variables

See `.env.example`: `DATABASE_URL`, `AUTH_SECRET`, `GITHUB_ID`, `GITHUB_SECRET`, `AUTH_TRUST_HOST`. Also needs `GOOGLE_ID` and `GOOGLE_SECRET` for Google auth.
