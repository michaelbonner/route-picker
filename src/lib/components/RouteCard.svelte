<script lang="ts">
	import { format } from 'date-fns';
	import Timer from '$lib/components/Timer.svelte';
	import type { Route, Trip } from '@prisma/client';

	export let route: Route & {
		trips: Trip[];
	};
</script>

<div class="border py-4 px-4 rounded-lg grid gap-4">
	<h2 class="text-xl font-bold text-center">
		{route.name}
	</h2>

	<div class="grid gap-4">
		<div>
			{#each route.trips as trip}
				<div class="flex justify-between text-sm border px-2 py-1">
					<div>
						{format(trip.startTime, 'yyyy-MM-dd HH:mm:ss')}
					</div>
					<div>
						{#if trip.endTime}
							{format(trip.endTime, 'yyyy-MM-dd HH:mm:ss')}
						{/if}
					</div>
					<div>
						{#if trip.endTime}
							{((trip.endTime.getTime() - trip.startTime.getTime()) / 1000 / 60).toFixed(2)} minutes
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

		<div class="text-sm">
			Average: {(
				route.trips.reduce((acc, trip) => {
					if (!trip.endTime) return acc;
					return acc + (trip.endTime.getTime() - trip.startTime.getTime());
				}, 0) /
					route.trips.length /
					1000 /
					60 || 0
			).toFixed(2)} minutes
		</div>

		<Timer routeId={route.id} />
	</div>
</div>
