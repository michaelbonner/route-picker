import { format, isSameDay, isToday, isYesterday } from 'date-fns';

interface TimedTrip {
	startTime: Date;
	endTime: Date | null;
}

export interface RouteStats {
	tripCount: number;
	averageSeconds: number | null;
	bestSeconds: number | null;
	lastSeconds: number | null;
}

export const tripSeconds = (trip: TimedTrip): number | null =>
	trip.endTime ? (trip.endTime.getTime() - trip.startTime.getTime()) / 1000 : null;

// Only completed trips count toward stats; an unfinished trip has no duration.
export const getRouteStats = (trips: TimedTrip[]): RouteStats => {
	const durations = trips.map(tripSeconds).filter((d): d is number => d !== null);

	if (durations.length === 0) {
		return { tripCount: 0, averageSeconds: null, bestSeconds: null, lastSeconds: null };
	}

	return {
		tripCount: durations.length,
		averageSeconds: durations.reduce((sum, d) => sum + d, 0) / durations.length,
		bestSeconds: Math.min(...durations),
		// trips are loaded newest first
		lastSeconds: durations[0]
	};
};

export interface RankedRoute<T> {
	route: T;
	stats: RouteStats;
	// seconds slower than the fastest route (0 for the fastest)
	deltaSeconds: number;
}

// Ranks routes that have at least one completed trip, fastest average first.
export const rankRoutes = <T extends { trips: TimedTrip[] }>(routes: T[]): RankedRoute<T>[] => {
	const withStats = routes
		.map((route) => ({ route, stats: getRouteStats(route.trips) }))
		.filter((r) => r.stats.averageSeconds !== null)
		.sort((a, b) => a.stats.averageSeconds! - b.stats.averageSeconds!);

	const fastest = withStats[0]?.stats.averageSeconds ?? 0;

	return withStats.map((r) => ({ ...r, deltaSeconds: r.stats.averageSeconds! - fastest }));
};

const pad = (n: number) => n.toString().padStart(2, '0');

// Clock-style duration for live timers: 0:05, 12:34, 1:02:03
export const formatClock = (totalSeconds: number) => {
	const s = Math.max(0, Math.floor(totalSeconds));
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;

	return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
};

// Human duration for summaries: 45s, 12m 30s, 1h 5m
export const formatDuration = (totalSeconds: number) => {
	const s = Math.max(0, Math.round(totalSeconds));
	const hours = Math.floor(s / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;

	if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
	if (minutes > 0) return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
	return `${seconds}s`;
};

export const formatTripDate = (startTime: Date, endTime: Date | null, now = new Date()) => {
	const day = isToday(startTime)
		? 'Today'
		: isYesterday(startTime)
			? 'Yesterday'
			: format(
					startTime,
					startTime.getFullYear() === now.getFullYear() ? 'EEE, MMM d' : 'MMM d, yyyy'
				);

	const start = format(startTime, 'h:mm a');
	if (!endTime) return `${day} · ${start}`;

	const end = isSameDay(startTime, endTime)
		? format(endTime, 'h:mm a')
		: format(endTime, 'MMM d, h:mm a');

	return `${day} · ${start} – ${end}`;
};
