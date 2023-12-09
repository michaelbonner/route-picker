import prisma from '$lib/server/prisma';

/** @type {import('./$types').PageServerLoad} */
export async function load(event) {
	const session = await event.locals.getSession();

	if (!session?.user?.email) {
		return {
			routes: []
		};
	}

	const user = await prisma.user.findUnique({
		where: {
			email: session?.user?.email
		}
	});

	return {
		routes: prisma.route.findMany({
			where: {
				userId: user?.id
			},
			include: {
				trips: true
			}
		})
	};
}
/** @type {import('./$types').Actions} */
export const actions = {
	postRoute: async ({ request, locals }) => {
		const data = await request.formData();

		const session = await locals.getSession();

		if (!session?.user?.email) {
			return { success: false, error: 'No user email provided' };
		}

		const user = await prisma.user.findUnique({
			where: {
				email: session?.user?.email
			}
		});

		await prisma.route.create({
			data: {
				user: {
					connect: {
						id: user?.id
					}
				},
				name: data.get('routeName') as string
			}
		});
		return { success: true };
	},
	deleteRoute: async ({ request }) => {
		const data = await request.formData();
		const idToDelete = data.get('id');
		if (!idToDelete) {
			return { success: false, error: 'No route id provided' };
		}
		await prisma.route.delete({
			where: {
				id: +idToDelete
			}
		});
		return { success: true };
	},
	postTrip: async ({ request }) => {
		const data = await request.formData();
		if (!data.get('startTime') || !data.get('endTime') || !data.get('routeId')) {
			return { success: false, error: 'No route id provided' };
		}
		if (typeof data.get('startTime') !== 'string' || typeof data.get('endTime') !== 'string') {
			return { success: false, error: 'Invalid date provided' };
		}
		await prisma.trip.create({
			data: {
				route: {
					connect: {
						id: +(data.get('routeId') || 0)
					}
				},
				startTime: new Date(data.get('startTime') as string),
				endTime: new Date(data.get('endTime') as string)
			}
		});
		return { success: true };
	},
	deleteTrip: async ({ request }) => {
		const data = await request.formData();
		const idToDelete = data.get('id');
		if (!idToDelete) {
			return { success: false, error: 'No trip id provided' };
		}
		await prisma.trip.delete({
			where: {
				id: +idToDelete
			}
		});
		return { success: true };
	}
};
//# sourceMappingURL=+page.server.js.map
