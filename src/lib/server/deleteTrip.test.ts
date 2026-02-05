import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		delete: vi.fn()
	}
}));

import { db } from '$lib/server/db';
import { actions } from '../../routes/+page.server.js';

describe('deleteTrip server action', () => {
	const mockRequest = { formData: vi.fn() };

	const mockDeleteChain = () => {
		const whereMock = vi.fn().mockResolvedValue({ success: true });
		(db.delete as any).mockReturnValue({ where: whereMock });
		return { whereMock };
	};

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should delete a trip by ID', async () => {
		const formData = new Map([['id', '99']]);
		mockRequest.formData.mockResolvedValue(formData);

		const { whereMock } = mockDeleteChain();

		const result = await actions.deleteTrip({
			request: mockRequest as unknown as Request
		});

		expect(result).toEqual({ success: true });
		expect(db.delete).toHaveBeenCalled();
		expect(whereMock).toHaveBeenCalled();
	});

	it('should fail when no ID is provided', async () => {
		const formData = new Map<string, string>();
		mockRequest.formData.mockResolvedValue(formData);

		const result = await actions.deleteTrip({
			request: mockRequest as unknown as Request
		});

		expect(result).toEqual({ success: false, error: 'No trip id provided' });
	});
});
