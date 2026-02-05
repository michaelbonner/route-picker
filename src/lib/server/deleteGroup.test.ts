import { fail } from '@sveltejs/kit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			routeGroup: { findFirst: vi.fn() }
		},
		delete: vi.fn()
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

describe('deleteGroup server action', () => {
	const mockRequest = { formData: vi.fn() };
	const mockLocals = { session: null as any };

	const mockDeleteChain = () => {
		const whereMock = vi.fn().mockResolvedValue({ success: true });
		(db.delete as any).mockReturnValue({ where: whereMock });
		return { whereMock };
	};

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should delete a group owned by the user', async () => {
		const formData = new Map([['id', '3']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.routeGroup.findFirst as any).mockResolvedValue({
			id: 3,
			userId: 'user-1',
			name: 'My Group'
		});

		const { whereMock } = mockDeleteChain();

		const result = await actions.deleteGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(db.delete).toHaveBeenCalled();
		expect(whereMock).toHaveBeenCalled();
	});

	it('should fail when unauthorized', async () => {
		const formData = new Map([['id', '3']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = null;

		await actions.deleteGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(401, { error: 'Unauthorized' });
	});

	it('should fail when ID is missing', async () => {
		const formData = new Map<string, string>();
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		await actions.deleteGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(400, { error: 'ID is required' });
	});

	it('should fail when group is not found', async () => {
		const formData = new Map([['id', '999']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.routeGroup.findFirst as any).mockResolvedValue(null);

		await actions.deleteGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});

	it('should fail when group is owned by a different user', async () => {
		const formData = new Map([['id', '3']]);
		mockRequest.formData.mockResolvedValue(formData);
		mockLocals.session = { userId: 'user-1' };

		(db.query.routeGroup.findFirst as any).mockResolvedValue({
			id: 3,
			userId: 'user-2',
			name: 'Not My Group'
		});

		await actions.deleteGroup({
			request: mockRequest as unknown as Request,
			locals: mockLocals as unknown as App.Locals
		});

		expect(fail).toHaveBeenCalledWith(403, { error: 'Forbidden' });
	});
});
