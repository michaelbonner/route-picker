import { describe, expect, it } from 'vitest';
import { formatClock, formatDuration, formatTripDate, getRouteStats, rankRoutes } from './stats.js';

const trip = (startIso: string, minutes: number | null) => {
	const startTime = new Date(startIso);
	return {
		startTime,
		endTime: minutes === null ? null : new Date(startTime.getTime() + minutes * 60_000)
	};
};

describe('getRouteStats', () => {
	it('ignores unfinished trips when averaging', () => {
		const stats = getRouteStats([
			trip('2024-01-03T08:00:00Z', 20),
			trip('2024-01-02T08:00:00Z', null),
			trip('2024-01-01T08:00:00Z', 10)
		]);

		expect(stats).toEqual({
			tripCount: 2,
			averageSeconds: 15 * 60,
			bestSeconds: 10 * 60,
			lastSeconds: 20 * 60
		});
	});

	it('returns nulls when there are no completed trips', () => {
		expect(getRouteStats([trip('2024-01-01T08:00:00Z', null)]).averageSeconds).toBeNull();
	});
});

describe('rankRoutes', () => {
	it('orders by average and computes the gap to the fastest', () => {
		const slow = { name: 'slow', trips: [trip('2024-01-01T08:00:00Z', 30)] };
		const fast = { name: 'fast', trips: [trip('2024-01-01T08:00:00Z', 20)] };
		const empty = { name: 'empty', trips: [] };

		const ranked = rankRoutes([slow, empty, fast]);

		expect(ranked.map((r) => r.route.name)).toEqual(['fast', 'slow']);
		expect(ranked.map((r) => r.deltaSeconds)).toEqual([0, 600]);
	});
});

describe('formatting', () => {
	it('formats clock durations', () => {
		expect(formatClock(5)).toBe('0:05');
		expect(formatClock(59.9)).toBe('0:59');
		expect(formatClock(754)).toBe('12:34');
		expect(formatClock(3723)).toBe('1:02:03');
	});

	it('formats human durations', () => {
		expect(formatDuration(45)).toBe('45s');
		expect(formatDuration(750)).toBe('12m 30s');
		expect(formatDuration(720)).toBe('12m');
		expect(formatDuration(3900)).toBe('1h 5m');
	});

	it('formats trip dates relative to now', () => {
		const now = new Date(2024, 5, 10, 12);
		const start = new Date(2024, 5, 3, 8, 5);
		const end = new Date(2024, 5, 3, 8, 30);

		expect(formatTripDate(start, end, now)).toBe('Mon, Jun 3 · 8:05 AM – 8:30 AM');
		expect(formatTripDate(new Date(2023, 0, 2, 9), null, now)).toBe('Jan 2, 2023 · 9:00 AM');
	});
});
