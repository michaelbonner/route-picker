import prisma from '$lib/server/prisma';
import { fail } from '@sveltejs/kit';
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
	postRoute: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
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
	},
	updateRouteName: async ({ request, locals }) => {
		try {
			const data = await request.formData();
			const routeId = data.get('routeId');
			const newName = data.get('newName');

			// Validate required fields
			if (!routeId || !newName) {
				return fail(400, { error: 'Route ID and new name are required' });
			}

			// Convert routeId to number and validate
			const routeIdNum = parseInt(routeId as string, 10);
			if (isNaN(routeIdNum)) {
				return fail(400, { error: 'Invalid route ID' });
			}

			// Sanitize and validate the new name
			const sanitizedName = (newName as string).trim();
			if (!sanitizedName || sanitizedName.length === 0) {
				return fail(400, { error: 'Route name cannot be empty' });
			}

			if (sanitizedName.length > 100) {
				return fail(400, { error: 'Route name cannot exceed 100 characters' });
			}

			// Check user authentication
			const session = await locals.auth();
			if (!session?.user?.email) {
				return fail(401, { error: 'Authentication required' });
			}

			// Get the user
			const user = await prisma.user.findUnique({
				where: {
					email: session.user.email
				}
			});

			if (!user) {
				return fail(401, { error: 'User not found' });
			}

			// Verify route ownership
			const route = await prisma.route.findUnique({
				where: {
					id: routeIdNum
				}
			});

			if (!route) {
				return fail(404, { error: 'Route not found' });
			}

			if (route.userId !== user.id) {
				return fail(403, { error: 'You do not have permission to edit this route' });
			}

			// Update the route name
			await prisma.route.update({
				where: {
					id: routeIdNum
				},
				data: {
					name: sanitizedName
				}
			});

			return { success: true };
		} catch (error) {
			console.error('Error updating route name:', error);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	}
};
