import { describe, expect, it } from 'vitest';
import { advanceArrival, endpointOffsets } from './geo.js';
import type { Location } from './types.js';

const fix = (latitude: number, accuracy = 10, timestamp = Date.now()): Location => ({
	coords: {
		latitude,
		longitude: 0,
		accuracy,
		altitude: null,
		altitudeAccuracy: null,
		heading: null,
		speed: null
	},
	timestamp
});

describe('endpoint variation', () => {
	it('reports each recorded point relative to the average and leaves missing points unknown', () => {
		const result = endpointOffsets([fix(0), {}, fix(0.002)], (value) => value);
		expect(result.count).toBe(2);
		expect(result.offsets[0]).toBeCloseTo(111, 0);
		expect(result.offsets[1]).toBeNull();
		expect(result.offsets[2]).toBeCloseTo(111, 0);
	});
});

describe('arrival', () => {
	it('requires departure and two accurate readings inside the stop area', () => {
		const pin = { latitude: 0, longitude: 0 };
		let progress = { hasLeft: false, insideFixes: 0, shouldStop: false };
		progress = advanceArrival(progress, fix(0), pin);
		expect(progress.shouldStop).toBe(false);
		progress = advanceArrival(progress, fix(0.002), pin);
		expect(progress.hasLeft).toBe(true);
		progress = advanceArrival(progress, fix(0, 100), pin);
		expect(progress.insideFixes).toBe(0);
		progress = advanceArrival(progress, fix(0), pin);
		expect(progress.shouldStop).toBe(false);
		progress = advanceArrival(progress, fix(0), pin);
		expect(progress.shouldStop).toBe(true);
	});
});
