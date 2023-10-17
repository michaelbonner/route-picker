<script lang="ts">
	export let routeId: number;

	let currentState = 'stopped';
	let startTime = new Date();
	let endTime = new Date();
	let elapsed = 0;
	let interval: NodeJS.Timeout;
	let pendingSave = false;

	const startTimer = () => {
		interval = setInterval(() => {
			elapsed = new Date().getTime() - startTime.getTime();
		}, 100);

		startTime = new Date();
		currentState = 'running';
	};

	const stopTimer = () => {
		currentState = 'stopped';
		pendingSave = true;
		endTime = new Date();
		if (interval) clearInterval(interval);
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

	$: elapsedClassName =
		currentState === 'stopped'
			? 'text-center text-slate-400 font-bold text-3xl'
			: 'text-center text-emerald-400 font-bold text-3xl';

	$: canSave = currentState === 'stopped' && elapsed;

	$: elapsedSeconds = formatTimerNumber(Math.round(elapsed / 1000) % 60);
	$: elapsedMinutes = formatTimerNumber(Math.floor(elapsed / 1000 / 60));
	$: elapsedHours = formatTimerNumber(Math.floor(elapsed / 1000 / 60 / 60));
</script>

<div class="grid gap-2">
	{#if currentState === 'stopped'}
		<button
			class="flex items-center justify-center bg-slate-900 w-full h-24 text-slate-100 font-bold rounded-xl"
			on:click={startTimer}
		>
			Start Timer
		</button>
	{/if}
	{#if currentState === 'running'}
		<button
			class="flex items-center justify-center bg-orange-800 w-full h-24 text-slate-100 font-bold rounded-xl"
			on:click={stopTimer}
		>
			Stop Timer
		</button>
	{/if}

	<div class={elapsedClassName}>
		{elapsedHours}:{elapsedMinutes}:{elapsedSeconds}
	</div>

	<div class="flex justify-center gap-4 py-2 px-4 text-sm">
		<form method="POST" action="?/postTrip">
			<input type="text" name="startTime" value={startTime} hidden />
			<input type="text" name="endTime" value={endTime} hidden />
			<input type="text" name="routeId" value={routeId} hidden />
			<button
				class={`border bg-emerald-50 border-emerald-600 text-emerald-700 py-1 px-3 rounded-md uppercase font-bold ${
					canSave ? '' : 'opacity-50'
				}`}
				disabled={!canSave}
				on:click={save}
			>
				Save
			</button>
		</form>
		<div>
			<button
				class={`border bg-slate-50 border-slate-600 text-slate-700 py-1 px-3 rounded-md uppercase font-bold ${
					canSave ? '' : 'opacity-50'
				}`}
				disabled={!canSave}
				on:click={clear}>Clear</button
			>
		</div>
	</div>
</div>
