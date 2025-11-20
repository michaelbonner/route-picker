import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '$lib/server/db';
import { GITHUB_ID, GITHUB_SECRET, GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { getRequestEvent } from '$app/server';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg'
	}),
	socialProviders: {
		github: {
			clientId: GITHUB_ID,
			clientSecret: GITHUB_SECRET
		},
		google: {
			clientId: GOOGLE_ID,
			clientSecret: GOOGLE_SECRET
		}
	},
	plugins: [sveltekitCookies(getRequestEvent)]
});
