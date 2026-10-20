import { defineEnvVars } from '@sveltejs/kit/env';

// These are all dynamic (the default), so they are read from process.env when
// the container starts rather than inlined at build time. The image is built in
// CI and pushed to GHCR, so anything static would bake these secrets into a
// published artifact. They stay in the Dokploy app env instead.
//
// Missing values fall back to an empty string, as `$env/dynamic/private` was
// typed, so a dev box without e.g. Google credentials still starts.
const optional = (input: string | undefined) => input ?? '';

export const variables = defineEnvVars({
	GITHUB_ID: { schema: optional },
	GITHUB_SECRET: { schema: optional },
	GOOGLE_ID: { schema: optional },
	GOOGLE_SECRET: { schema: optional },
	DATABASE_URL: { schema: optional }
});
