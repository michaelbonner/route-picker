<script lang="ts">
	import { format } from 'date-fns';
	import Timer from '$lib/components/Timer.svelte';
	import type { Route, Trip } from '@prisma/client';

	export let route: Route & {
		trips: Trip[];
	};

	const convertSecondsToHoursMinutesSeconds = (seconds: number) => {
		const durationHours = Math.floor(seconds / 60 / 60);
		const durationMinutes = Math.floor((seconds / 60) % 60);
		const durationSeconds = Math.floor(seconds % 60);

		return `${durationHours < 10 ? `0${durationHours}` : durationHours}:${
			durationMinutes < 10 ? `0${durationMinutes}` : durationMinutes
		}:${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}`;
	};
</script>

<div class="grid gap-4 rounded-lg">
	<div>
		<div class="flex gap-4 justify-center px-4">
			<h2 class="text-xl font-bold text-center">
				{route.name} <span class="text-base font-light">({route.trips.length} trips)</span>
			</h2>
			{#if route.trips.length === 0}
				<form method="post" action={`?/deleteRoute`}>
					<input type="text" name="id" value={route.id} hidden />
					<button class="text-red-500">x</button>
				</form>
			{/if}
		</div>

		<div class="px-4 text-sm text-center">
			Average: {convertSecondsToHoursMinutesSeconds(
				route.trips.reduce((acc, trip) => {
					if (!trip.endTime) return acc;
					return acc + (trip.endTime.getTime() - trip.startTime.getTime()) / 1000;
				}, 0) / route.trips.length || 0
			)}
		</div>
	</div>

	<div class="grid gap-4">
		<div class="overflow-auto border max-h-[20vh]">
			{#each route.trips as trip}
				<div class="flex gap-1 justify-between items-center py-1 px-2 text-sm border-b">
					<div class="text-xs">
						{format(trip.startTime, 'yyyy-MM-dd HH:mm:ss')}
					</div>
					<div class="text-xs">
						{#if trip.endTime}
							{format(trip.endTime, 'yyyy-MM-dd HH:mm:ss')}
						{/if}
					</div>
					<div>
						{#if trip.endTime}
							{convertSecondsToHoursMinutesSeconds(
								(trip.endTime.getTime() - trip.startTime.getTime()) / 1000
							)}
						{/if}
					</div>
					<div>
						<form method="post" action={`?/deleteTrip`}>
							<input type="text" name="id" value={trip.id} hidden />
							<button class="text-red-500">x</button>
						</form>
					</div>
				</div>
			{/each}
		</div>

		<div class="px-4">
			<Timer routeId={route.id} />
		</div>
	</div>
</div>
