import { db } from '$lib/server/db';
import { route, routeGroup, trip, user } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import type { PageServerLoadEvent } from './$types';

/** @type {import('./$types').PageServerLoad} */
export async function load(event: PageServerLoadEvent) {
	const session = event.locals.session;

	if (!session?.userId) {
		return {
			routes: [],
			groups: []
		};
	}

	const dbUser = await db.query.user.findFirst({
		where: eq(user.id, session.userId)
	});

	if (!dbUser) {
		return {
			routes: [],
			groups: []
		};
	}

	const ungroupedRoutes = await db.query.route.findMany({
		where: and(eq(route.userId, dbUser.id), isNull(route.routeGroupId)),
		with: {
			trips: {
				orderBy: [desc(trip.startTime)]
			}
		},
		orderBy: [asc(route.createdAt)]
	});

	const groups = await db.query.routeGroup.findMany({
		where: eq(routeGroup.userId, dbUser.id),
		with: {
			routes: {
				with: {
					trips: {
						orderBy: [desc(trip.startTime)]
					}
				},
				orderBy: [asc(route.createdAt)]
			}
		},
		orderBy: [asc(routeGroup.createdAt)]
	});

	return {
		routes: ungroupedRoutes,
		groups
	};
}
/** @type {import('./$types').Actions} */
export const actions = {
	postRoute: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const data = await request.formData();

		const session = locals.session;

		if (!session?.userId) {
			return { success: false, error: 'No user id provided' };
		}

		const dbUser = await db.query.user.findFirst({
			where: eq(user.id, session.userId)
		});

		if (!dbUser) {
			return { success: false, error: 'User not found' };
		}

		const routeGroupIdRaw = data.get('routeGroupId');
		let routeGroupId = null;

		if (routeGroupIdRaw) {
			const groupId = +routeGroupIdRaw;
			const group = await db.query.routeGroup.findFirst({
				where: and(eq(routeGroup.id, groupId), eq(routeGroup.userId, dbUser.id))
			});
			if (group) {
				routeGroupId = groupId;
			}
		}

		await db.insert(route).values({
			userId: dbUser.id,
			name: data.get('routeName') as string,
			routeGroupId
		});
		return { success: true };
	},
	deleteRoute: async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const idToDelete = data.get('id');
		if (!idToDelete) {
			return { success: false, error: 'No route id provided' };
		}
		await db.delete(route).where(eq(route.id, +idToDelete));
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
		try {
			await db.insert(trip).values({
				routeId: +(data.get('routeId') || 0),
				startTime: new Date(data.get('startTime') as string),
				endTime: new Date(data.get('endTime') as string),
				startLocation: JSON.parse(data.get('startLocation') as string),
				endLocation: JSON.parse(data.get('endLocation') as string),
				path: JSON.parse(data.get('path') as string)
			});
		} catch (error) {
			console.error('postTrip insert failed:', error);
			if (error instanceof Error && error.cause) {
				console.error('Underlying DB error:', error.cause);
			}
			throw error;
		}
		return { success: true };
	},
	deleteTrip: async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const idToDelete = data.get('id');
		if (!idToDelete) {
			return { success: false, error: 'No trip id provided' };
		}
		await db.delete(trip).where(eq(trip.id, +idToDelete));
		return { success: true };
	},
	updateRouteName: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
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
			const session = locals.session;
			if (!session?.userId) {
				return fail(401, { error: 'Authentication required' });
			}

			// Get the user
			const dbUser = await db.query.user.findFirst({
				where: eq(user.id, session.userId)
			});

			if (!dbUser) {
				return fail(401, { error: 'User not found' });
			}

			// Verify route ownership
			const dbRoute = await db.query.route.findFirst({
				where: eq(route.id, routeIdNum)
			});

			if (!dbRoute) {
				return fail(404, { error: 'Route not found' });
			}

			if (dbRoute.userId !== dbUser.id) {
				return fail(403, { error: 'You do not have permission to edit this route' });
			}

			// Update the route name
			await db.update(route).set({ name: sanitizedName }).where(eq(route.id, routeIdNum));

			return { success: true };
		} catch (error) {
			console.error('Error updating route name:', error);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	},
	createGroup: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const data = await request.formData();
		const session = locals.session;
		if (!session?.userId) return fail(401, { error: 'Unauthorized' });

		const name = data.get('name') as string;
		const trimmedName = name?.trim();

		if (!trimmedName) return fail(400, { error: 'Name is required' });
		if (trimmedName.length > 100) return fail(400, { error: 'Name too long' });

		await db.insert(routeGroup).values({
			userId: session.userId,
			name: trimmedName
		});
		return { success: true };
	},
	deleteGroup: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const data = await request.formData();
		const session = locals.session;
		if (!session?.userId) return fail(401, { error: 'Unauthorized' });

		const id = data.get('id');
		if (!id) return fail(400, { error: 'ID is required' });

		// Verify ownership
		const group = await db.query.routeGroup.findFirst({
			where: eq(routeGroup.id, +id)
		});
		if (!group || group.userId !== session.userId) return fail(403, { error: 'Forbidden' });

		await db.delete(routeGroup).where(eq(routeGroup.id, +id));
		return { success: true };
	},
	updateGroupName: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const data = await request.formData();
		const session = locals.session;
		if (!session?.userId) return fail(401, { error: 'Unauthorized' });

		const id = data.get('id');
		const name = data.get('name') as string;
		if (!id || !name) return fail(400, { error: 'ID and name are required' });

		// Verify ownership
		const group = await db.query.routeGroup.findFirst({
			where: eq(routeGroup.id, +id)
		});
		if (!group || group.userId !== session.userId) return fail(403, { error: 'Forbidden' });

		await db.update(routeGroup).set({ name }).where(eq(routeGroup.id, +id));
		return { success: true };
	},
	moveRouteToGroup: async ({ request, locals }: { request: Request; locals: App.Locals }) => {
		const data = await request.formData();
		const session = locals.session;
		if (!session?.userId) return fail(401, { error: 'Unauthorized' });

		const routeId = data.get('routeId');
		const groupId = data.get('groupId'); // Can be null/empty to ungroup

		if (!routeId) return fail(400, { error: 'Route ID is required' });

		// Verify route ownership
		const routeToCheck = await db.query.route.findFirst({
			where: eq(route.id, +routeId)
		});
		if (!routeToCheck || routeToCheck.userId !== session.userId)
			return fail(403, { error: 'Forbidden' });

		// If groupId is provided, verify group ownership
		if (groupId) {
			const group = await db.query.routeGroup.findFirst({
				where: eq(routeGroup.id, +groupId)
			});
			if (!group || group.userId !== session.userId) return fail(403, { error: 'Forbidden' });
		}

		await db
			.update(route)
			.set({ routeGroupId: groupId ? +groupId : null })
			.where(eq(route.id, +routeId));
		return { success: true };
	}
};
