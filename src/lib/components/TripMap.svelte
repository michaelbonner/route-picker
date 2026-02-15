<script lang="ts">
	import type { Trip } from '$lib/server/db/schema';
	import type { Location } from '$lib/types';

	interface Props {
		trips: Trip[];
	}

	const { trips }: Props = $props();

	const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

	let mapContainer = $state<HTMLDivElement>();

	const isValidLocation = (loc: unknown): loc is Location => {
		if (!loc || typeof loc !== 'object') return false;
		const l = loc as Record<string, unknown>;
		if (!l.coords || typeof l.coords !== 'object') return false;
		const c = l.coords as Record<string, unknown>;
		return typeof c.latitude === 'number' && typeof c.longitude === 'number';
	};

	const getPathCoords = (path: unknown): [number, number][] => {
		if (!Array.isArray(path)) return [];
		return path.filter(isValidLocation).map((loc) => [loc.coords.latitude, loc.coords.longitude]);
	};

	const validTrips = $derived(
		trips.filter((trip) => {
			const pathCoords = getPathCoords(trip.path);
			if (pathCoords.length > 0) return true;
			return isValidLocation(trip.startLocation) || isValidLocation(trip.endLocation);
		})
	);

	const hasData = $derived(validTrips.length > 0);

	$effect(() => {
		if (!mapContainer || !hasData) return;

		let map: L.Map | undefined;

		const init = async () => {
			const L = await import('leaflet');

			// Inject Leaflet CSS from CDN (dedup by id)
			if (!document.getElementById('leaflet-css')) {
				const link = document.createElement('link');
				link.id = 'leaflet-css';
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(link);
			}

			map = L.map(mapContainer!).setView([0, 0], 2);

			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);

			const allBounds: [number, number][] = [];

			validTrips.forEach((trip, i) => {
				const color = COLORS[i % COLORS.length];
				const pathCoords = getPathCoords(trip.path);

				if (pathCoords.length > 0) {
					L.polyline(pathCoords, { color, weight: 3, opacity: 0.8 }).addTo(map!);
					allBounds.push(...pathCoords);
				}

				if (isValidLocation(trip.startLocation)) {
					const pos: [number, number] = [
						trip.startLocation.coords.latitude,
						trip.startLocation.coords.longitude
					];
					L.circleMarker(pos, {
						radius: 6,
						fillColor: '#22c55e',
						color: '#fff',
						weight: 2,
						fillOpacity: 1
					}).addTo(map!);
					allBounds.push(pos);
				}

				if (isValidLocation(trip.endLocation)) {
					const pos: [number, number] = [
						trip.endLocation.coords.latitude,
						trip.endLocation.coords.longitude
					];
					L.circleMarker(pos, {
						radius: 6,
						fillColor: '#ef4444',
						color: '#fff',
						weight: 2,
						fillOpacity: 1
					}).addTo(map!);
					allBounds.push(pos);
				}
			});

			if (allBounds.length > 0) {
				map.fitBounds(allBounds, { padding: [20, 20] });
			}
		};

		init();

		return () => {
			map?.remove();
		};
	});
</script>

{#if hasData}
	<div bind:this={mapContainer} class="h-64 w-full rounded-md"></div>
{:else}
	<p class="py-4 text-center text-sm text-slate-400">No location data available</p>
{/if}
