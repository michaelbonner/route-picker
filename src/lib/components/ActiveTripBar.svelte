<script lang="ts">
	import { formatClock } from '#lib/stats.js';
	import { tripTimers } from '#lib/trip-timer.svelte.js';
	import { fly } from 'svelte/transition';
</script>

{#if tripTimers.trips.length > 0}
	<div
		class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur"
		transition:fly={{ y: 80, duration: 200 }}
		role="region"
		aria-label="Trips in progress"
	>
		<ul class="mx-auto grid max-w-6xl divide-y divide-slate-100 px-4">
			{#each tripTimers.trips as trip (trip.routeId)}
				{@const isRunning = trip.endTime === null}
				<li class="flex items-center gap-3 py-2.5">
					<span
						class="size-2.5 shrink-0 rounded-full {isRunning
							? 'animate-pulse bg-teal-500'
							: 'bg-amber-500'}"
						aria-hidden="true"
					></span>
					<a href="#route-{trip.routeId}-heading" class="min-w-0 flex-1">
						<span class="block truncate text-sm font-medium text-slate-900">{trip.routeName}</span>
						<span class="block text-xs text-slate-500">
							{isRunning
								? tripTimers.locationErrors[trip.routeId]
									? 'Location unavailable · stop manually'
									: trip.stopPin
										? 'Timing trip · auto-stop on'
										: 'Timing trip'
								: 'Finished — not saved yet'}
						</span>
					</a>
					<span class="font-mono text-xl font-semibold text-slate-900 tabular-nums">
						{formatClock(tripTimers.elapsedSeconds(trip))}
					</span>
					{#if isRunning}
						<button
							type="button"
							class="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
							onclick={() => tripTimers.stop(trip.routeId)}
						>
							Stop
						</button>
					{:else}
						<button
							type="button"
							class="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
							onclick={() => tripTimers.save(trip.routeId)}
							disabled={tripTimers.isSaving(trip.routeId)}
						>
							{tripTimers.isSaving(trip.routeId) ? 'Saving…' : 'Save'}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</div>
	<!-- keeps the end of the page reachable above the fixed bar -->
	<div style:height="{tripTimers.trips.length * 4 + 1}rem" aria-hidden="true"></div>
{/if}
