<script>
	import Timer from '$lib/timer.svelte';
	import { format } from 'date-fns';

	/** @type {import('./$types').PageData} */
	export let data;
	const { routes } = data;
</script>

<div>
	<h2 class="text-2xl">Routes</h2>
	<div class="grid lg:grid-cols-3 gap-4">
		{#each routes as route}
			<div class="border py-2 px-4 rounded-lg">
				<h3 class="text-xl">
					{route.name}
				</h3>

				<div class="grid gap-4">
					<div>
						{#each route.trips as trip}
							<div class="flex justify-between text-sm border px-2 py-1">
								<div>
									{format(trip.startTime, 'yyyy-MM-dd HH:mm:ss')}
								</div>
								<div>
									{format(trip.endTime, 'yyyy-MM-dd HH:mm:ss')}
								</div>
								<div>
									{((trip.endTime - trip.startTime) / 1000 / 60).toFixed(2)} minutes
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
							route.trips.reduce((acc, trip) => acc + (trip.endTime - trip.startTime), 0) /
							route.trips.length /
							1000 /
							60
						).toFixed(2)} minutes
					</div>

					<Timer routeId={route.id} />
				</div>
			</div>
		{/each}
	</div>
</div>
