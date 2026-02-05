import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({
	db: {
		insert: vi.fn()
	}
}));

import { db } from '$lib/server/db';
import { actions } from '../../routes/+page.server.js';

describe('postTrip server action', () => {
	const mockRequest = { formData: vi.fn() };

	const mockInsertChain = () => {
		const valuesMock = vi.fn().mockResolvedValue({ success: true });
		(db.insert as any).mockReturnValue({ values: valuesMock });
		return { valuesMock };
	};

	beforeEach(() => vi.clearAllMocks());
	afterEach(() => vi.resetAllMocks());

	it('should create a trip with valid data', async () => {
		const startTime = new Date('2024-01-01T10:00:00Z').toString();
		const endTime = new Date('2024-01-01T10:30:00Z').toString();
		const startLocation = JSON.stringify({ lat: 40.0, lng: -111.0 });
		const endLocation = JSON.stringify({ lat: 40.1, lng: -111.1 });
		const path = JSON.stringify([{ lat: 40.0 }, { lat: 40.1 }]);

		const formData = new Map([
			['startTime', startTime],
			['endTime', endTime],
			['routeId', '7'],
			['startLocation', startLocation],
			['endLocation', endLocation],
			['path', path]
		]);
		mockRequest.formData.mockResolvedValue(formData);

		const { valuesMock } = mockInsertChain();

		const result = await actions.postTrip({
			request: mockRequest as unknown as Request
		});

		expect(result).toEqual({ success: true });
		expect(valuesMock).toHaveBeenCalledWith({
			routeId: 7,
			startTime: new Date(startTime),
			endTime: new Date(endTime),
			startLocation: JSON.parse(startLocation),
			endLocation: JSON.parse(endLocation),
			path: JSON.parse(path)
		});
	});

	it('should fail when startTime is missing', async () => {
		const formData = new Map([
			['endTime', new Date().toString()],
			['routeId', '7']
		]);
		mockRequest.formData.mockResolvedValue(formData);

		const result = await actions.postTrip({
			request: mockRequest as unknown as Request
		});

		expect(result).toEqual({ success: false, error: 'No route id provided' });
	});

	it('should fail when endTime is missing', async () => {
		const formData = new Map([
			['startTime', new Date().toString()],
			['routeId', '7']
		]);
		mockRequest.formData.mockResolvedValue(formData);

		const result = await actions.postTrip({
			request: mockRequest as unknown as Request
		});

		expect(result).toEqual({ success: false, error: 'No route id provided' });
	});

	it('should fail when routeId is missing', async () => {
		const formData = new Map([
			['startTime', new Date().toString()],
			['endTime', new Date().toString()]
		]);
		mockRequest.formData.mockResolvedValue(formData);

		const result = await actions.postTrip({
			request: mockRequest as unknown as Request
		});

		expect(result).toEqual({ success: false, error: 'No route id provided' });
	});
});
