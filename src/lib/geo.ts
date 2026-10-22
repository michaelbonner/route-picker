import type { Location } from './types.js';

export interface Point {
	latitude: number;
	longitude: number;
}

export const pointFromLocation = (value: unknown): Point | null => {
	if (!value || typeof value !== 'object' || !('coords' in value)) return null;
	const coords = value.coords;
	if (!coords || typeof coords !== 'object' || !('latitude' in coords) || !('longitude' in coords))
		return null;
	const { latitude, longitude } = coords;
	return typeof latitude === 'number' &&
		Number.isFinite(latitude) &&
		latitude >= -90 &&
		latitude <= 90 &&
		typeof longitude === 'number' &&
		Number.isFinite(longitude) &&
		longitude >= -180 &&
		longitude <= 180
		? { latitude, longitude }
		: null;
};

export const distanceMeters = (a: Point, b: Point): number => {
	const radians = Math.PI / 180;
	const dLat = (b.latitude - a.latitude) * radians;
	const dLng = (b.longitude - a.longitude) * radians;
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin(dLng / 2) ** 2;
	return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export const endpointOffsets = <T>(entries: T[], pick: (entry: T) => unknown) => {
	const points = entries.map((entry) => pointFromLocation(pick(entry)));
	const valid = points.filter((point): point is Point => point !== null);
	if (valid.length === 0) return { count: 0, maxMeters: null, offsets: points.map(() => null) };
	const center = {
		latitude: valid.reduce((sum, point) => sum + point.latitude, 0) / valid.length,
		longitude: valid.reduce((sum, point) => sum + point.longitude, 0) / valid.length
	};
	const offsets = points.map((point) => (point ? distanceMeters(point, center) : null));
	return {
		count: valid.length,
		maxMeters: Math.max(...offsets.filter((n): n is number => n !== null)),
		offsets
	};
};

export const formatDistance = (meters: number) =>
	meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;

export const isUsableFix = (location: Location) =>
	pointFromLocation(location) !== null &&
	Number.isFinite(location.coords.accuracy) &&
	location.coords.accuracy <= 75 &&
	Date.now() - location.timestamp <= 15000;

export interface ArrivalProgress {
	hasLeft: boolean;
	insideFixes: number;
	shouldStop: boolean;
}

export const advanceArrival = (
	progress: ArrivalProgress,
	location: Location,
	pin: Point
): ArrivalProgress => {
	const point = pointFromLocation(location);
	if (!point || !isUsableFix(location)) return progress;
	const distance = distanceMeters(point, pin);
	if (distance > 150) return { hasLeft: true, insideFixes: 0, shouldStop: false };
	if (!progress.hasLeft || distance > 75) return { ...progress, insideFixes: 0, shouldStop: false };
	const insideFixes = progress.insideFixes + 1;
	return { hasLeft: true, insideFixes, shouldStop: insideFixes >= 2 };
};
