import { fail } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			route: { findFirst: vi.fn() },
			routeGroup: { findFirst: vi.fn() }
		},
		update: vi.fn()
	}
}));

vi.mock('@sveltejs/kit', async () => {
	const actual = await vi.importActual('@sveltejs/kit');
	return {
		...actual,
		fail: vi.fn((status, body) => ({ status, body }))
	};
});

import { db } from '$lib/server/db';
import { actions } from '../../routes/+page.server.js';

describe('moveRouteToGroup server action', () => {
	const mockRequest = { formData: vi.fn() };
	const mockLocals = { session: null as any };

	const mockUpdateChain = () => {
		const whereMock = vi.fn().mockResolvedValue({ success: true });
		const setMock = vi.fn().mockReturnValue({ where: whereMock });
		(db.update as any).mockReturnValue({ set: setMock });
		return { setMock, whereMock };
	};

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should move a route to a group', async () => {
		const formData = new Map([
			['routeId', '10'],
			['groupId', '5']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.route.findFirst as any).mockResolvedValue({
			id: 10,
			userId: 'user-1',
			name: 'My Route'
		});
		(db.query.routeGroup.findFirst as any).mockResolvedValue({
			id: 5,
			userId: 'user-1',
			name: 'My Group'
		});

		const { setMock, whereMock } = mockUpdateChain();

		const result = await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(setMock).toHaveBeenCalledWith({ routeGroupId: 5 });
		expect(whereMock).toHaveBeenCalled();
	});

	it('should ungroup a route when groupId is empty', async () => {
		const formData = new Map([
			['routeId', '10'],
			['groupId', '']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.route.findFirst as any).mockResolvedValue({
			id: 10,
			userId: 'user-1',
			name: 'My Route'
		});

		const { setMock } = mockUpdateChain();

		const result = await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(setMock).toHaveBeenCalledWith({ routeGroupId: null });
	});

	it('should fail when unauthorized', async () => {
		const formData = new Map([['routeId', '10']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = null;

		await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(401, { error: 'Unauthorized' });
	});

	it('should fail when routeId is missing', async () => {
		const formData = new Map<string, string>();
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(400, { error: 'Route ID is required' });
	});

	it('should fail when route is not found', async () => {
		const formData = new Map([['routeId', '999']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.route.findFirst as any).mockResolvedValue(null);

		await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});

	it('should fail when route is owned by a different user', async () => {
		const formData = new Map([['routeId', '10']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.route.findFirst as any).mockResolvedValue({
			id: 10,
			userId: 'user-2',
			name: 'Not My Route'
		});

		await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});

	it('should fail when target group is not found', async () => {
		const formData = new Map([
			['routeId', '10'],
			['groupId', '999']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.route.findFirst as any).mockResolvedValue({
			id: 10,
			userId: 'user-1',
			name: 'My Route'
		});
		(db.query.routeGroup.findFirst as any).mockResolvedValue(null);

		await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});

	it('should fail when target group is owned by a different user', async () => {
		const formData = new Map([
			['routeId', '10'],
			['groupId', '5']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.route.findFirst as any).mockResolvedValue({
			id: 10,
			userId: 'user-1',
			name: 'My Route'
		});
		(db.query.routeGroup.findFirst as any).mockResolvedValue({
			id: 5,
			userId: 'user-2',
			name: 'Not My Group'
		});

		await actions.moveRouteToGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});
});
