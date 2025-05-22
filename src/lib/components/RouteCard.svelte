<script lang="ts">
	import Timer from '$lib/components/Timer.svelte';
	import type { Route, Trip } from '@prisma/client';
	import { format, isSameDay, isSameHour, isSameYear } from 'date-fns';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		route: Route & {
			trips: Trip[];
		};
	}

	const props: Props = $props();

	const route = $derived(props.route);

	const convertSecondsToHoursMinutesSeconds = (seconds: number) => {
		const durationHours = Math.floor(seconds / 60 / 60);
		const durationMinutes = Math.floor((seconds / 60) % 60);
		const durationSeconds = Math.floor(seconds % 60);

		if (durationHours === 0 && durationMinutes === 0) {
			return `${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}s`;
		}

		if (durationHours === 0) {
			return `${
				durationMinutes < 10 ? `0${durationMinutes}` : durationMinutes
			}:${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}`;
		}

		return `${durationHours < 10 ? `0${durationHours}` : durationHours}:${
			durationMinutes < 10 ? `0${durationMinutes}` : durationMinutes
		}:${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}`;
	};

	const getTimeFormatted = (startTime: Date, endTime?: Date | null) => {
		if (!endTime) return format(startTime, 'yyyy-MM-dd p');

		const monthDayYearWithTimeFormat = 'MM/dd/yy p';

		if (!isSameYear(startTime, endTime)) {
			return `${format(startTime, monthDayYearWithTimeFormat)} – ${format(endTime, monthDayYearWithTimeFormat)}`;
		}

		if (!isSameDay(startTime, endTime)) {
			return `${format(startTime, monthDayYearWithTimeFormat)} – ${format(endTime, monthDayYearWithTimeFormat)}`;
		}

		if (!isSameHour(startTime, endTime)) {
			return `${format(startTime, 'MM/dd/yy: p')} – ${format(endTime, 'p')}`;
		}

		return `${format(startTime, 'MM/dd/yy: h:mm:ss')} – ${format(endTime, 'h:mm:ss a')}`;
	};

	const deleteRoute = async (id: number) => {
		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/deleteRoute', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			await invalidateAll();
		}
	};

	const deleteTrip = async (id: number) => {
		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/deleteTrip', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			await invalidateAll();
		}
	};
</script>

<div class="grid gap-4 rounded-lg">
	<div>
		<div class="flex gap-4 justify-center px-4">
			<h2 class="text-xl font-bold text-center">
				{route.name} <span class="text-base font-light">({route.trips.length} trips)</span>
			</h2>
			{#if route.trips.length === 0}
				<button class="text-red-500" onclick={() => deleteRoute(route.id)}> x </button>
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
			{#each route.trips as trip (trip.id)}
				<div class="flex gap-2 justify-end items-center py-1 px-2 text-sm border-b">
					<div class="text-xs flex-1">
						{getTimeFormatted(trip.startTime, trip.endTime)}
					</div>
					<div class="text-xs">
						{#if trip.endTime}
							Total: {convertSecondsToHoursMinutesSeconds(
								(trip.endTime.getTime() - trip.startTime.getTime()) / 1000
							)}
						{/if}
					</div>
					<div>
						<button class="text-red-500" onclick={() => deleteTrip(trip.id)}> x </button>
					</div>
				</div>
			{/each}
		</div>

		<div class="px-4">
			<Timer routeId={route.id} />
		</div>
	</div>
</div>
