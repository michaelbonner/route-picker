import prisma from '$lib/server/prisma';
import type { ServerLoadEvent } from '@sveltejs/kit';
import type { PageServerLoadEvent } from './$types';

/** @type {import('./$types').PageServerLoad} */
export async function load(event: PageServerLoadEvent) {
	const session = await event.locals.auth();

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
		routes: await prisma.route.findMany({
			where: {
				userId: user?.id
			},
			include: {
				trips: {
					orderBy: {
						startTime: 'desc'
					}
				}
			},
			orderBy: {
				createdAt: 'asc'
			}
		})
	};
}
/** @type {import('./$types').Actions} */
export const actions = {
	postRoute: async ({ request, locals }: ServerLoadEvent) => {
		const data = await request.formData();

		const session = await locals.auth();

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
	deleteRoute: async ({ request }: { request: Request }) => {
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
	postTrip: async ({ request }: { request: Request }) => {
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
				endTime: new Date(data.get('endTime') as string),
				startLocation: JSON.parse(data.get('startLocation') as string),
				endLocation: JSON.parse(data.get('endLocation') as string),
				path: JSON.parse(data.get('path') as string)
			}
		});
		return { success: true };
	},
	deleteTrip: async ({ request }: { request: Request }) => {
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
