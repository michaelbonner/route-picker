import prisma from '$lib/server/prisma.js';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	return {
		routes: prisma.route.findMany({
			include: {
				trips: true
			}
		})
	};
}

/** @type {import('./$types').Actions} */
export const actions = {
	postTrip: async ({ request }) => {
		const data = await request.formData();

		if (!data.get('startTime') || !data.get('endTime') || !data.get('routeId')) {
			return { success: false, error: 'No route id provided' };
		}

		const startTime = new Date(data.get('startTime') || 0);
		const endTime = new Date(data.get('endTime') || 0);
		const routeId = data.get('routeId') || 0;

		await prisma.trip.create({
			data: {
				route: {
					connect: {
						id: +routeId
					}
				},
				startTime,
				endTime
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
