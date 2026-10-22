import { browser } from '$app/env';
import { invalidateAll } from '$app/navigation';
import { postAction } from '#lib/actions.js';
import type { Location } from '#lib/types.js';

export interface ActiveTrip {
	routeId: number;
	routeName: string;
	startTime: number;
	// set once the timer is stopped; the trip then waits to be saved or discarded
	endTime: number | null;
	startLocation: Location | null;
	endLocation: Location | null;
	path: Location[];
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

	#tickId: number | null = null;
	#pathSampleIds = new Map<number, number>();
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

	start(routeId: number, routeName: string) {
		if (this.get(routeId)) return;

		this.now = Date.now();
		this.trips.push({
			routeId,
			routeName,
			startTime: this.now,
			endTime: null,
			startLocation: null,
			endLocation: null,
			path: []
		});
		delete this.errors[routeId];

		getPosition((location) => {
			const trip = this.get(routeId);
			if (trip) {
				trip.startLocation = location;
				this.#persist();
			}
		});
		this.#startPathSampling(routeId);
		this.#syncTick();
		this.#persist();
	}

	stop(routeId: number) {
		const trip = this.get(routeId);
		if (!trip || trip.endTime !== null) return;

		trip.endTime = Date.now();
		this.#stopPathSampling(routeId);
		getPosition((location) => {
			const current = this.get(routeId);
			if (current) {
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
		if (!browser || this.#pathSampleIds.has(routeId)) return;

		const id = window.setInterval(() => {
			getPosition((location) => {
				const trip = this.get(routeId);
				if (trip && trip.endTime === null) {
					trip.path.push(location);
					this.#persist();
				}
			});
		}, PATH_SAMPLE_MS);
		this.#pathSampleIds.set(routeId, id);
	}

	#stopPathSampling(routeId: number) {
		const id = this.#pathSampleIds.get(routeId);
		if (id !== undefined) window.clearInterval(id);
		this.#pathSampleIds.delete(routeId);
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
