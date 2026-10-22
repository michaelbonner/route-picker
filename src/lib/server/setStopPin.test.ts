import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/server/db/index.js', () => ({ db: { update: vi.fn() } }));

import { db } from '#lib/server/db/index.js';
import { actions } from '../../routes/+page.server.js';

const request = (fields: Record<string, string>) =>
	({
		formData: async () => new Map(Object.entries(fields))
	}) as unknown as Request;
const locals = { session: { userId: 'owner' } } as App.Locals;

describe('setStopPin', () => {
	beforeEach(() => vi.clearAllMocks());

	it('saves a pin only when the route update matches the owner', async () => {
		const returning = vi.fn().mockResolvedValue([{ id: 7 }]);
		const where = vi.fn().mockReturnValue({ returning });
		const set = vi.fn().mockReturnValue({ where });
		vi.mocked(db.update).mockReturnValue({ set } as never);
		const result = await actions.setStopPin({
			request: request({ routeId: '7', latitude: '40.1', longitude: '-111.2' }),
			locals
		});
		expect(result).toEqual({ success: true });
		expect(set).toHaveBeenCalledWith({ stopLatitude: 40.1, stopLongitude: -111.2 });
		returning.mockResolvedValueOnce([]);
		expect(
			await actions.setStopPin({
				request: request({ routeId: '7', latitude: '40.1', longitude: '-111.2' }),
				locals
			})
		).toEqual({ success: false });
	});

	it('rejects coordinates outside valid ranges', async () => {
		expect(
			await actions.setStopPin({
				request: request({ routeId: '7', latitude: '91', longitude: '0' }),
				locals
			})
		).toEqual({ success: false });
		expect(db.update).not.toHaveBeenCalled();
	});
});
