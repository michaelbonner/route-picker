<script lang="ts">
	import { pointFromLocation, type Point } from '#lib/geo.js';
	import type { Trip } from '#lib/server/db/schema.js';

	interface Props {
		trips: Trip[];
		pin: Point | null;
		onselect: (point: Point) => void;
	}
	let { trips, pin, onselect }: Props = $props();
	let container = $state<HTMLDivElement>();
	let map = $state.raw<import('leaflet').Map>();
	let marker: import('leaflet').Marker | undefined;

	$effect(() => {
		if (!container) return;
		let cancelled = false;
		const setup = async () => {
			const L = await import('leaflet');
			if (cancelled || !container) return;
			if (!document.getElementById('leaflet-css')) {
				const link = document.createElement('link');
				link.id = 'leaflet-css';
				link.rel = 'stylesheet';
				link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
				document.head.appendChild(link);
			}
			const endpoints = trips
				.map((trip) => pointFromLocation(trip.endLocation))
				.filter((point): point is Point => point !== null);
			const initial = pin ?? endpoints[0];
			map = L.map(container).setView(
				initial ? [initial.latitude, initial.longitude] : [0, 0],
				initial ? 14 : 2
			);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			}).addTo(map);
			for (const point of endpoints)
				L.circleMarker([point.latitude, point.longitude], {
					radius: 5,
					color: '#ef4444',
					fillOpacity: 0.7
				}).addTo(map);
			map.on('click', (event: import('leaflet').LeafletMouseEvent) =>
				onselect({
					latitude: event.latlng.lat,
					longitude: event.latlng.lng
				})
			);
			if (!initial && navigator.geolocation)
				navigator.geolocation.getCurrentPosition((position) => {
					if (!cancelled) map?.setView([position.coords.latitude, position.coords.longitude], 14);
				});
		};
		setup();
		return () => {
			cancelled = true;
			map?.remove();
			map = undefined;
			marker = undefined;
		};
	});

	$effect(() => {
		if (!map) return;
		const selectedPin = pin;
		const L = import('leaflet');
		L.then(({ marker: createMarker }) => {
			if (!map) return;
			if (marker) {
				marker.remove();
				marker = undefined;
			}
			if (selectedPin)
				marker = createMarker([selectedPin.latitude, selectedPin.longitude]).addTo(map);
		});
	});
</script>

<div
	bind:this={container}
	class="h-56 w-full rounded-lg"
	aria-label="Choose an automatic stop location on the map"
></div>
