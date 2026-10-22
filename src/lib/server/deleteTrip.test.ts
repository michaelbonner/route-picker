import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.js', () => ({
	db: {
		delete: vi.fn(),
		query: { trip: { findFirst: vi.fn() } }
	}
}));

import { db } from '#lib/server/db/index.js';
import { actions } from '../../routes/+page.server.js';

describe('deleteTrip server action', () => {
	const mockRequest = { formData: vi.fn() };

	const mockDeleteChain = () => {
		const whereMock = vi.fn().mockResolvedValue({ success: true });
		vi.mocked(db.delete).mockReturnValue({ where: whereMock } as never);
		return { whereMock };
	};

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should delete a trip by ID', async () => {
		const formData = new Map([['id', '99']]);
		mockRequest.formData.mockResolvedValue(formData);

		const { whereMock } = mockDeleteChain();
		vi.mocked(db.query.trip.findFirst).mockResolvedValue({ route: { userId: 'owner' } } as never);

		const result = await actions.deleteTrip({
			request: mockRequest as unknown as Request,
			locals: { session: { userId: 'owner' } } as App.Locals
		});

		expect(result).toEqual({ success: true });
		expect(db.delete).toHaveBeenCalled();
		expect(whereMock).toHaveBeenCalled();
	});

	it('should fail when no ID is provided', async () => {
		const formData = new Map<string, string>();
		mockRequest.formData.mockResolvedValue(formData);

		const result = await actions.deleteTrip({
			request: mockRequest as unknown as Request,
			locals: { session: { userId: 'owner' } } as App.Locals
		});

		expect(result).toEqual({ success: false, error: 'No trip id provided' });
	});

	it('does not delete another user’s trip', async () => {
		mockRequest.formData.mockResolvedValue(new Map([['id', '99']]));
		vi.mocked(db.query.trip.findFirst).mockResolvedValue({
			route: { userId: 'someone-else' }
		} as never);
		const result = await actions.deleteTrip({
			request: mockRequest as unknown as Request,
			locals: { session: { userId: 'owner' } } as App.Locals
		});
		expect(result).toEqual({ success: false });
		expect(db.delete).not.toHaveBeenCalled();
	});
});
