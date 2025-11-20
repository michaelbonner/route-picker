import { GITHUB_ID, GITHUB_SECRET, GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import GitHub from '@auth/sveltekit/providers/github';
import Google from '@auth/sveltekit/providers/google';
import { SvelteKitAuth } from '@auth/sveltekit';
import { eq } from 'drizzle-orm';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		GitHub({ clientId: GITHUB_ID, clientSecret: GITHUB_SECRET }),
		Google({ clientId: GOOGLE_ID, clientSecret: GOOGLE_SECRET })
	],
	trustHost: true,
	callbacks: {
		signIn: async ({ account, profile }) => {
			if (!profile?.email) return false;
			if (!account) return false;

			// find user or create them
			const dbUser = await db.query.user.findFirst({
				where: eq(user.email, profile.email)
			});

			if (!dbUser) {
				await db.insert(user).values({
					email: profile.email,
					provider: account.provider
				});
			}

			return true;
		}
	}
});
