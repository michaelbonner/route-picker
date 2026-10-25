import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '#lib/server/db/index.js';
// Declared as dynamic in src/env.ts so they're read at container start, never
// inlined into the published image.
import { GITHUB_ID, GITHUB_SECRET, GOOGLE_ID, GOOGLE_SECRET } from '$app/env/private';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	socialProviders: {
		// Refresh name/image on every sign-in; users migrated from auth.js were
		// left with the placeholder name 'User'.
		github: { clientId: GITHUB_ID, clientSecret: GITHUB_SECRET, overrideUserInfoOnSignIn: true },
		google: { clientId: GOOGLE_ID, clientSecret: GOOGLE_SECRET, overrideUserInfoOnSignIn: true }
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
