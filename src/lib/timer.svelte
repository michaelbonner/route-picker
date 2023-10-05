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
		elapsed = 0;
	};

	const save = () => {
		pendingSave = false;
		console.log('save');
	};

	$: elapsedClassName =
		currentState === 'stopped'
			? 'text-center text-slate-400 font-bold text-3xl'
			: 'text-center text-emerald-400 font-bold text-3xl';
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
		{(elapsed / 1000).toFixed(1)}s
	</div>

	<div class="flex justify-center gap-8">
		<form method="POST" action="?/postTrip" class={pendingSave ? '' : 'hidden'}>
			<input type="text" name="startTime" value={startTime} hidden />
			<input type="text" name="endTime" value={endTime} hidden />
			<input type="text" name="routeId" value={routeId} hidden />
			<button
				class="border border-emerald-700 text-emerald-800 py-1 px-3 rounded-lg"
				on:click={save}
			>
				Save
			</button>
		</form>
		<button
			disabled={currentState === 'stopped' && !elapsed}
			class="border border-slate-700 text-slate-800 py-1 px-3 rounded-lg"
			on:click={clear}>Clear</button
		>
	</div>
</div>
