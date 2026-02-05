import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			user: { findFirst: vi.fn() },
			routeGroup: { findFirst: vi.fn() }
		},
		insert: vi.fn()
	}
}));

import { db } from '$lib/server/db';
import { actions } from '../../routes/+page.server.js';

describe('postRoute server action', () => {
	const mockRequest = { formData: vi.fn() };
	const mockLocals = { session: null as any };

	const mockInsertChain = () => {
		const valuesMock = vi.fn().mockResolvedValue({ success: true });
		(db.insert as any).mockReturnValue({ values: valuesMock });
		return { valuesMock };
	};

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should create a route without a group', async () => {
		const formData = new Map([['routeName', 'My Route']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() };
		(db.query.user.findFirst as any).mockResolvedValue(mockUser);

		const { valuesMock } = mockInsertChain();

		const result = await actions.postRoute({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(valuesMock).toHaveBeenCalledWith({
			userId: 'user-1',
			name: 'My Route',
			routeGroupId: null
		});
	});

	it('should create a route with a valid group', async () => {
		const formData = new Map([
			['routeName', 'Grouped Route'],
			['routeGroupId', '5']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() };
		(db.query.user.findFirst as any).mockResolvedValue(mockUser);
		(db.query.routeGroup.findFirst as any).mockResolvedValue({ id: 5, userId: 'user-1', name: 'Group' });

		const { valuesMock } = mockInsertChain();

		const result = await actions.postRoute({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(valuesMock).toHaveBeenCalledWith({
			userId: 'user-1',
			name: 'Grouped Route',
			routeGroupId: 5
		});
	});

	it('should ignore group ID if group not owned by user', async () => {
		const formData = new Map([
			['routeName', 'My Route'],
			['routeGroupId', '5']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test', emailVerified: true, createdAt: new Date(), updatedAt: new Date() };
		(db.query.user.findFirst as any).mockResolvedValue(mockUser);
		(db.query.routeGroup.findFirst as any).mockResolvedValue(null);

		const { valuesMock } = mockInsertChain();

		const result = await actions.postRoute({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(valuesMock).toHaveBeenCalledWith({
			userId: 'user-1',
			name: 'My Route',
			routeGroupId: null
		});
	});

	it('should fail when not authenticated', async () => {
		const formData = new Map([['routeName', 'My Route']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = null;

		const result = await actions.postRoute({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: false, error: 'No user id provided' });
	});

	it('should fail when user not found in database', async () => {
		const formData = new Map([['routeName', 'My Route']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.user.findFirst as any).mockResolvedValue(null);

		const result = await actions.postRoute({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: false, error: 'User not found' });
	});
});
