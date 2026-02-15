<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import type { Location } from '$lib/types';

	interface Props {
		routeId: number;
	}

	const { routeId }: Props = $props();

	let currentState = $state('stopped');
	let startTime = $state(new Date());
	let endTime = $state(new Date());
	let elapsed = $state(0);
	let interval: number;
	let startLocation: Location | null = $state(null);
	let endLocation: Location | null = $state(null);
	let path: Location[] = $state([]);
	let geolocationUpdateIntervalId: number | null = null;

	const geolocationOptions = {
		enableHighAccuracy: true,
		timeout: 5000,
		maximumAge: 5 * 1000 // allow cached positions for 5 seconds
	};

	const startTimer = () => {
		interval = window.setInterval(() => {
			elapsed = new Date().getTime() - startTime.getTime();
		}, 100);

		geolocationUpdateIntervalId = window.setInterval(() => {
			navigator.geolocation.getCurrentPosition(
				(success) => {
					path = [
						...path,
						{
							coords: {
								accuracy: success.coords.accuracy,
								altitude: success.coords.altitude,
								altitudeAccuracy: success.coords.altitudeAccuracy,
								heading: success.coords.heading,
								latitude: success.coords.latitude,
								longitude: success.coords.longitude,
								speed: success.coords.speed
							},
							timestamp: success.timestamp
						}
					];
				},
				(error) => console.error(error),
				geolocationOptions
			);
		}, 5000);

		startTime = new Date();
		currentState = 'running';
		navigator.geolocation.getCurrentPosition(
			(success) => {
				startLocation = {
					coords: {
						accuracy: success.coords.accuracy,
						altitude: success.coords.altitude,
						altitudeAccuracy: success.coords.altitudeAccuracy,
						heading: success.coords.heading,
						latitude: success.coords.latitude,
						longitude: success.coords.longitude,
						speed: success.coords.speed
					},
					timestamp: success.timestamp
				};
			},
			(error) => {
				console.error(error);
			},
			geolocationOptions
		);
	};

	const stopTimer = () => {
		currentState = 'stopped';
		endTime = new Date();
		if (interval) window.clearInterval(interval);

		if (geolocationUpdateIntervalId) window.clearInterval(geolocationUpdateIntervalId);

		navigator.geolocation.getCurrentPosition(
			(success) => {
				endLocation = {
					coords: {
						accuracy: success.coords.accuracy,
						altitude: success.coords.altitude,
						altitudeAccuracy: success.coords.altitudeAccuracy,
						heading: success.coords.heading,
						latitude: success.coords.latitude,
						longitude: success.coords.longitude,
						speed: success.coords.speed
					},
					timestamp: success.timestamp
				};
			},
			(error) => {
				console.error(error);
			},
			geolocationOptions
		);
	};

	const clear = () => {
		stopTimer();
		elapsed = 0;
	};

	const save = async () => {
		// Create form data for submission
		const formData = new FormData();
		formData.append('startTime', startTime.toString());
		formData.append('endTime', endTime.toString());
		formData.append('routeId', routeId.toString());
		formData.append('startLocation', JSON.stringify(startLocation));
		formData.append('endLocation', JSON.stringify(endLocation));
		formData.append('path', JSON.stringify(path));

		// Submit the form data using fetch
		const response = await fetch('?/postTrip', {
			method: 'POST',
			body: formData
		});

		// Reset timer values after successful submission
		if (response.ok) {
			elapsed = 0;
			path = [];
			startLocation = null;
			endLocation = null;
			await invalidateAll();
		}
	};

	const formatTimerNumber = (num: number) => {
		return num < 10 ? `0${num}` : num;
	};

	const elapsedClassName = $derived(
		currentState === 'stopped'
			? 'text-center text-slate-400 font-bold text-3xl'
			: 'text-center text-emerald-400 font-bold text-3xl'
	);

	const canSave = $derived(!!(currentState === 'stopped' && !!elapsed));

	const elapsedSeconds = $derived(formatTimerNumber(Math.round(elapsed / 1000) % 60));
	const elapsedMinutes = $derived(formatTimerNumber(Math.floor(elapsed / 1000 / 60)));
	const elapsedHours = $derived(formatTimerNumber(Math.floor(elapsed / 1000 / 60 / 60)));
</script>

<div class="grid gap-2">
	{#if currentState === 'stopped'}
		<button
			class={`flex items-center justify-center bg-slate-900 w-full h-24 text-slate-100 font-bold rounded-xl ${
				!canSave ? '' : 'opacity-20'
			}`}
			disabled={canSave}
			onclick={startTimer}
		>
			Start Timer
		</button>
	{/if}
	{#if currentState === 'running'}
		<button
			class="flex justify-center items-center w-full h-24 font-bold bg-orange-800 rounded-xl text-slate-100"
			onclick={stopTimer}
		>
			Stop Timer
		</button>
	{/if}

	<div class={elapsedClassName}>
		{elapsedHours}:{elapsedMinutes}:{elapsedSeconds}
	</div>

	<div
		class={`grid grid-cols-2 gap-4 py-2 px-4 text-sm transition-all ${canSave ? 'opacity-100' : 'opacity-0'}`}
	>
		<div>
			<button
				class={`w-full border bg-slate-50 border-slate-600 text-slate-700 py-3 px-3 rounded-md uppercase font-bold transition-opacity ${
					canSave ? '' : 'opacity-20'
				}`}
				disabled={!canSave}
				onclick={clear}>Clear</button
			>
		</div>
		<div>
			<button
				class={`w-full border bg-emerald-50 border-emerald-600 text-emerald-700 py-3 px-3 rounded-md uppercase font-bold transition-opacity ${
					canSave ? '' : 'opacity-20'
				}`}
				disabled={!canSave}
				onclick={save}
			>
				Save
			</button>
		</div>
	</div>
</div>
