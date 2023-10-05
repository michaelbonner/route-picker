<script>
	import RouteCard from '$lib/components/RouteCard.svelte';
	import Timer from '$lib/timer.svelte';
	import { format } from 'date-fns';

	/** @type {import('./$types').PageData} */
	export let data;
	const { routes } = data;
</script>

<div>
	<div class="grid lg:grid-cols-3 gap-4">
		{#each routes as route}
			<RouteCard {route} />
		{/each}
	</div>
</div>
