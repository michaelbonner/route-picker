import { browser } from '$app/env';
import { invalidateAll } from '$app/navigation';
import { postAction } from '#lib/actions.js';
import type { Location } from '#lib/types.js';
import { advanceArrival, type Point } from '#lib/geo.js';

export interface ActiveTrip {
	routeId: number;
	routeName: string;
	startTime: number;
	// set once the timer is stopped; the trip then waits to be saved or discarded
	endTime: number | null;
	startLocation: Location | null;
	endLocation: Location | null;
	path: Location[];
	stopPin: Point | null;
	hasLeftStopArea: boolean;
}

const STORAGE_KEY = 'route-picker:active-trips';
const PATH_SAMPLE_MS = 5000;

const geolocationOptions: PositionOptions = {
	enableHighAccuracy: true,
	timeout: 5000,
	maximumAge: 5 * 1000 // allow cached positions for 5 seconds
};

const toLocation = (position: GeolocationPosition): Location => ({
	coords: {
		accuracy: position.coords.accuracy,
		altitude: position.coords.altitude,
		altitudeAccuracy: position.coords.altitudeAccuracy,
		heading: position.coords.heading,
		latitude: position.coords.latitude,
		longitude: position.coords.longitude,
		speed: position.coords.speed
	},
	timestamp: position.timestamp
});

const getPosition = (onLocation: (location: Location) => void) => {
	if (!browser || !navigator.geolocation) return;
	navigator.geolocation.getCurrentPosition(
		(position) => onLocation(toLocation(position)),
		(error) => console.error(error),
		geolocationOptions
	);
};

/**
 * Timers live here rather than in a component so a running trip survives the
 * route card being collapsed, the page reloading, or the phone killing the tab.
 */
class TripTimers {
	trips = $state<ActiveTrip[]>([]);
	now = $state(Date.now());
	savingIds = $state<number[]>([]);
	errors = $state<Record<number, string>>({});
	locationErrors = $state<Record<number, string>>({});

	#tickId: number | null = null;
	#pathWatchIds = new Map<number, number>();
	#arrivalFixes = new Map<number, number>();
	#loaded = false;

	load() {
		if (!browser || this.#loaded) return;
		this.#loaded = true;

		try {
			const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
			if (Array.isArray(stored)) this.trips = stored;
		} catch {
			// unreadable storage just means no restored trips
		}

		for (const trip of this.trips) {
			if (trip.endTime === null) this.#startPathSampling(trip.routeId);
		}
		this.#syncTick();
	}

	get(routeId: number) {
		return this.trips.find((trip) => trip.routeId === routeId);
	}

	elapsedSeconds(trip: ActiveTrip) {
		return ((trip.endTime ?? this.now) - trip.startTime) / 1000;
	}

	isSaving(routeId: number) {
		return this.savingIds.includes(routeId);
	}

	start(routeId: number, routeName: string, stopPin: Point | null = null) {
		if (this.get(routeId)) return;

		this.now = Date.now();
		this.trips.push({
			routeId,
			routeName,
			startTime: this.now,
			endTime: null,
			startLocation: null,
			endLocation: null,
			path: [],
			stopPin,
			hasLeftStopArea: false
		});
		delete this.errors[routeId];
		delete this.locationErrors[routeId];

		this.#startPathSampling(routeId);
		this.#syncTick();
		this.#persist();
	}

	stop(routeId: number, location?: Location) {
		const trip = this.get(routeId);
		if (!trip || trip.endTime !== null) return;

		trip.endTime = Date.now();
		if (location) trip.endLocation = location;
		this.#stopPathSampling(routeId);
		delete this.locationErrors[routeId];
		if (!location)
			getPosition((location) => {
				const current = this.get(routeId);
				if (current && current.endTime !== null) {
					current.endLocation = location;
					this.#persist();
				}
			});
		this.#syncTick();
		this.#persist();
	}

	discard(routeId: number) {
		this.#stopPathSampling(routeId);
		this.trips = this.trips.filter((trip) => trip.routeId !== routeId);
		delete this.errors[routeId];
		delete this.locationErrors[routeId];
		this.#syncTick();
		this.#persist();
	}

	async save(routeId: number) {
		const trip = this.get(routeId);
		if (!trip || trip.endTime === null || this.isSaving(routeId)) return;

		this.savingIds.push(routeId);
		delete this.errors[routeId];

		const saved = await postAction('postTrip', {
			startTime: new Date(trip.startTime).toISOString(),
			endTime: new Date(trip.endTime).toISOString(),
			routeId,
			// the columns are NOT NULL; {} (their default) means location was unavailable
			startLocation: JSON.stringify(trip.startLocation ?? {}),
			endLocation: JSON.stringify(trip.endLocation ?? {}),
			path: JSON.stringify(trip.path)
		});

		this.savingIds = this.savingIds.filter((id) => id !== routeId);

		if (saved) {
			this.discard(routeId);
			await invalidateAll();
		} else {
			this.errors[routeId] = "Couldn't save this trip. It's kept here — try again.";
		}
	}

	#startPathSampling(routeId: number) {
		if (!browser || this.#pathWatchIds.has(routeId)) return;
		if (!navigator.geolocation) {
			this.locationErrors[routeId] =
				'Location is unavailable in this browser. Auto-stop cannot run.';
			return;
		}
		const id = navigator.geolocation.watchPosition(
			(position) => {
				const trip = this.get(routeId);
				if (!trip || trip.endTime !== null) return;
				const location = toLocation(position);
				delete this.locationErrors[routeId];
				if (!trip.startLocation) trip.startLocation = location;
				const lastSample = trip.path.at(-1);
				if (!lastSample || location.timestamp - lastSample.timestamp >= PATH_SAMPLE_MS)
					trip.path.push(location);
				this.#checkArrival(trip, location);
				this.#persist();
			},
			() => {
				this.locationErrors[routeId] =
					'Location updates stopped. Check location permission or stop this trip manually.';
			},
			geolocationOptions
		);
		this.#pathWatchIds.set(routeId, id);
	}

	#stopPathSampling(routeId: number) {
		const id = this.#pathWatchIds.get(routeId);
		if (id !== undefined) navigator.geolocation.clearWatch(id);
		this.#pathWatchIds.delete(routeId);
		this.#arrivalFixes.delete(routeId);
	}

	#checkArrival(trip: ActiveTrip, location: Location) {
		if (!trip.stopPin) return;
		const progress = advanceArrival(
			{
				hasLeft: trip.hasLeftStopArea,
				insideFixes: this.#arrivalFixes.get(trip.routeId) ?? 0,
				shouldStop: false
			},
			location,
			trip.stopPin
		);
		trip.hasLeftStopArea = progress.hasLeft;
		if (progress.shouldStop) this.stop(trip.routeId, location);
		else this.#arrivalFixes.set(trip.routeId, progress.insideFixes);
	}

	// Only tick the shared clock while something is actually running.
	#syncTick() {
		if (!browser) return;
		const anyRunning = this.trips.some((trip) => trip.endTime === null);

		if (anyRunning && this.#tickId === null) {
			this.#tickId = window.setInterval(() => (this.now = Date.now()), 250);
		} else if (!anyRunning && this.#tickId !== null) {
			window.clearInterval(this.#tickId);
			this.#tickId = null;
		}
	}

	#persist() {
		if (!browser) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify($state.snapshot(this.trips)));
		} catch {
			// storage can be full or blocked; the in-memory timer still works
		}
	}
}

export const tripTimers = new TripTimers();
