import { GITHUB_ID, GITHUB_SECRET, GOOGLE_ID, GOOGLE_SECRET } from '$env/static/private';
import prisma from '$lib/server/prisma';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { SvelteKitAuth } from '@auth/sveltekit';

export const { handle, signIn, signOut } = SvelteKitAuth({
	providers: [
		GitHub({ clientId: GITHUB_ID, clientSecret: GITHUB_SECRET }),
		Google({ clientId: GOOGLE_ID, clientSecret: GOOGLE_SECRET })
	],
	callbacks: {
		signIn: async ({ account, profile }) => {
			if (!profile?.email) return false;
			if (!account) return false;

			// find user or create them
			const dbUser = await prisma.user.findUnique({
				where: { email: profile.email }
			});

			if (!dbUser) {
				await prisma.user.create({
					data: {
						email: profile.email,
						provider: account.provider
					}
				});
			}

			return true;
		}
	}
});
