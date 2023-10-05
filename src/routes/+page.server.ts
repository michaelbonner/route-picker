import prisma from '$lib/server/prisma';
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
