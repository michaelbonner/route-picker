<script lang="ts">
	import { formatClock } from '#lib/stats.js';
	import { tripTimers } from '#lib/trip-timer.svelte.js';

	interface Props {
		routeId: number;
		routeName: string;
	}

	const { routeId, routeName }: Props = $props();

	const trip = $derived(tripTimers.get(routeId));
	const isRunning = $derived(trip?.endTime === null);
	const isSaving = $derived(tripTimers.isSaving(routeId));
	const error = $derived(tripTimers.errors[routeId]);

	const discard = () => {
		if (confirm('Discard this trip? Its time will not be saved.')) tripTimers.discard(routeId);
	};
</script>

{#if !trip}
	<button
		type="button"
		class="flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-lg font-semibold text-white shadow-sm transition hover:bg-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 active:scale-[0.99]"
		onclick={() => tripTimers.start(routeId, routeName)}
	>
		<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.78a1.5 1.5 0 0 0 2.3 1.27l9.344-5.891a1.5 1.5 0 0 0 0-2.538L6.3 2.841Z"
			/>
		</svg>
		Start trip
	</button>
{:else}
	<div
		class="rounded-xl border p-3 {isRunning
			? 'border-teal-200 bg-teal-50'
			: 'border-amber-200 bg-amber-50'}"
	>
		<div class="flex items-center justify-between gap-3 px-1">
			<span
				class="flex items-center gap-2 text-sm font-medium {isRunning
					? 'text-teal-800'
					: 'text-amber-800'}"
			>
				{#if isRunning}
					<span class="relative flex size-2.5" aria-hidden="true">
						<span
							class="absolute inline-flex size-full animate-ping rounded-full bg-teal-500 opacity-75"
						></span>
						<span class="relative inline-flex size-2.5 rounded-full bg-teal-600"></span>
					</span>
					Timing trip
				{:else}
					Trip finished — save it?
				{/if}
			</span>
			<span
				class="font-mono text-3xl font-semibold tabular-nums {isRunning
					? 'text-teal-900'
					: 'text-amber-900'}"
				role="timer"
				aria-live="off"
			>
				{formatClock(tripTimers.elapsedSeconds(trip))}
			</span>
		</div>

		{#if isRunning}
			<button
				type="button"
				class="mt-3 flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-lg font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 active:scale-[0.99]"
				onclick={() => tripTimers.stop(routeId)}
			>
				<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<rect x="4" y="4" width="12" height="12" rx="2" />
				</svg>
				Stop — I've arrived
			</button>
		{:else}
			<div class="mt-3 grid grid-cols-[1fr_2fr] gap-2">
				<button
					type="button"
					class="h-14 rounded-xl border border-slate-300 bg-white font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
					onclick={discard}
					disabled={isSaving}
				>
					Discard
				</button>
				<button
					type="button"
					class="h-14 rounded-xl bg-slate-900 font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
					onclick={() => tripTimers.save(routeId)}
					disabled={isSaving}
				>
					{isSaving ? 'Saving…' : 'Save trip'}
				</button>
			</div>
		{/if}

		{#if error}
			<p class="mt-2 px-1 text-sm text-red-700" role="alert">{error}</p>
		{/if}
	</div>
{/if}
