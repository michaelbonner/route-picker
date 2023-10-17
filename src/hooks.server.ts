import { GITHUB_ID, GITHUB_SECRET } from '$env/static/private';
import prisma from '$lib/server/prisma';
import GitHub from '@auth/core/providers/github';
import { SvelteKitAuth } from '@auth/sveltekit';

export const handle = SvelteKitAuth({
	providers: [GitHub({ clientId: GITHUB_ID, clientSecret: GITHUB_SECRET })],
	callbacks: {
		signIn: async ({ account, profile }) => {
			if (!profile?.email) return false;
			if (!account) return false;

			// find user or create them
			const dbUser = await prisma.user.findUnique({
				where: { email: profile.email, provider: account.provider }
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
