<script lang="ts">
	import type { Trip } from '$lib/server/db/schema';

	interface Props {
		trips: Trip[];
	}

	const props: Props = $props();
</script>

<div data-testid="trip-map-mock">TripMap Mock ({props.trips.length} trips)</div>
