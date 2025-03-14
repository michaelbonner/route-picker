<script lang="ts">
	interface Props {
		routeId: number;
	}

	let { routeId }: Props = $props();

	let currentState = $state('stopped');
	let startTime = $state(new Date());
	let endTime = $state(new Date());
	let elapsed = $state(0);
	let interval: NodeJS.Timeout;
	let pendingSave = false;
	let startLocation: GeolocationPosition | null = $state(null);
	let endLocation: GeolocationPosition | null = $state(null);
	let path: GeolocationPosition[] = $state([]);
	let geolocationUpdateIntervalId: NodeJS.Timeout | null = null;

	const geolocationOptions = {
		enableHighAccuracy: true,
		timeout: 5000,
		maximumAge: 5 * 1000 // allow cached positions for 5 seconds
	};

	const startTimer = () => {
		interval = setInterval(() => {
			elapsed = new Date().getTime() - startTime.getTime();
		}, 100);

		geolocationUpdateIntervalId = setInterval(() => {
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
		pendingSave = true;
		endTime = new Date();
		if (interval) clearInterval(interval);

		if (geolocationUpdateIntervalId) clearInterval(geolocationUpdateIntervalId);

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
		pendingSave = false;
		elapsed = 0;
	};

	const save = () => {
		pendingSave = false;
	};

	const formatTimerNumber = (num: number) => {
		return num < 10 ? `0${num}` : num;
	};

	let elapsedClassName =
		$derived(currentState === 'stopped'
			? 'text-center text-slate-400 font-bold text-3xl'
			: 'text-center text-emerald-400 font-bold text-3xl');

	let canSave = $derived(!!(currentState === 'stopped' && !!elapsed));

	let elapsedSeconds = $derived(formatTimerNumber(Math.round(elapsed / 1000) % 60));
	let elapsedMinutes = $derived(formatTimerNumber(Math.floor(elapsed / 1000 / 60)));
	let elapsedHours = $derived(formatTimerNumber(Math.floor(elapsed / 1000 / 60 / 60)));
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
		<form method="POST" action="?/postTrip">
			<input type="text" name="startTime" value={startTime} hidden />
			<input type="text" name="endTime" value={endTime} hidden />
			<input type="text" name="routeId" value={routeId} hidden />
			<input type="text" name="startLocation" value={JSON.stringify(startLocation)} hidden />
			<input type="text" name="endLocation" value={JSON.stringify(endLocation)} hidden />
			<input type="text" name="path" value={JSON.stringify(path)} hidden />
			<button
				class={`w-full border bg-emerald-50 border-emerald-600 text-emerald-700 py-3 px-3 rounded-md uppercase font-bold transition-opacity ${
					canSave ? '' : 'opacity-20'
				}`}
				disabled={!canSave}
				onclick={save}
			>
				Save
			</button>
		</form>
	</div>
</div>
