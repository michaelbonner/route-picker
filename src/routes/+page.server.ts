import { db } from '$lib/server/db';
import { route, trip, user } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { eq, desc, asc } from 'drizzle-orm';
import type { PageServerLoadEvent } from './$types';

/** @type {import('./$types').PageServerLoad} */
export async function load(event: PageServerLoadEvent) {
	const session = await event.locals.auth();

	if (!session?.user?.email) {
		return {
			routes: []
		};
	}

	const dbUser = await db.query.user.findFirst({
		where: eq(user.email, session.user.email)
	});

	if (!dbUser) {
		return {
			routes: []
		};
	}

	const routes = await db.query.route.findMany({
		where: eq(route.userId, dbUser.id),
		with: {
			trips: {
				orderBy: [desc(trip.startTime)]
			}
		},
		orderBy: [asc(route.createdAt)]
	});

	return {
		routes
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

		const dbUser = await db.query.user.findFirst({
			where: eq(user.email, session.user.email)
		});

		if (!dbUser) {
			return { success: false, error: 'User not found' };
		}

		await db.insert(route).values({
			userId: dbUser.id,
			name: data.get('routeName') as string
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
		await db.insert(trip).values({
			routeId: +(data.get('routeId') || 0),
			startTime: new Date(data.get('startTime') as string),
			endTime: new Date(data.get('endTime') as string),
			startLocation: JSON.parse(data.get('startLocation') as string),
			endLocation: JSON.parse(data.get('endLocation') as string),
			path: JSON.parse(data.get('path') as string)
		});
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
			const session = await locals.auth();
			if (!session?.user?.email) {
				return fail(401, { error: 'Authentication required' });
			}

			// Get the user
			const dbUser = await db.query.user.findFirst({
				where: eq(user.email, session.user.email)
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
			await db.update(route)
				.set({ name: sanitizedName })
				.where(eq(route.id, routeIdNum));

			return { success: true };
		} catch (error) {
			console.error('Error updating route name:', error);
			return fail(500, { error: 'An unexpected error occurred' });
		}
	}
};
