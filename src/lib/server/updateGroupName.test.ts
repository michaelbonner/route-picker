import { fail } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
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

describe('updateGroupName server action', () => {
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

	it('should update group name', async () => {
		const formData = new Map([
			['id', '3'],
			['name', 'Updated Group']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.routeGroup.findFirst as any).mockResolvedValue({
			id: 3,
			userId: 'user-1',
			name: 'Old Group'
		});

		const { setMock, whereMock } = mockUpdateChain();

		const result = await actions.updateGroupName({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(setMock).toHaveBeenCalledWith({ name: 'Updated Group' });
		expect(whereMock).toHaveBeenCalled();
	});

	it('should fail when unauthorized', async () => {
		const formData = new Map([
			['id', '3'],
			['name', 'New Name']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = null;

		await actions.updateGroupName({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(401, { error: 'Unauthorized' });
	});

	it('should fail when ID is missing', async () => {
		const formData = new Map([['name', 'New Name']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		await actions.updateGroupName({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(400, { error: 'ID and name are required' });
	});

	it('should fail when name is missing', async () => {
		const formData = new Map([['id', '3']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		await actions.updateGroupName({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(400, { error: 'ID and name are required' });
	});

	it('should fail when group is not found', async () => {
		const formData = new Map([
			['id', '999'],
			['name', 'New Name']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.routeGroup.findFirst as any).mockResolvedValue(null);

		await actions.updateGroupName({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});

	it('should fail when group is owned by a different user', async () => {
		const formData = new Map([
			['id', '3'],
			['name', 'New Name']
		]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.routeGroup.findFirst as any).mockResolvedValue({
			id: 3,
			userId: 'user-2',
			name: 'Not Mine'
		});

		await actions.updateGroupName({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});
});
