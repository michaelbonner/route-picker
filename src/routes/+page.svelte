<script>
	import RouteCard from '$lib/components/RouteCard.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const { routes } = data;
</script>

<svelte:head>
	<title>Route Picker</title>
</svelte:head>

<div>
	<div class="grid lg:grid-cols-3 gap-4">
		{#each routes as route}
			<RouteCard {route} />
		{/each}
	</div>
</div>
