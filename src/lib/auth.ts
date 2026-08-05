import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/server/db';
// `$env/dynamic/private` reads process.env when the container starts, rather
// than inlining the values at build time the way `$env/static/private` does.
// The image is now built in CI and pushed to GHCR, so anything static would
// bake these OAuth secrets into a published artifact — and would force them
// into GitHub Actions as build args. They stay in the Dokploy app env instead.
import { env } from '$env/dynamic/private';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	socialProviders: {
		github: {
			clientId: env.GITHUB_ID,
			clientSecret: env.GITHUB_SECRET
		},
		google: {
			clientId: env.GOOGLE_ID,
			clientSecret: env.GOOGLE_SECRET
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
