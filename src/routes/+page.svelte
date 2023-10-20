<script>
	import RouteCard from '$lib/components/RouteCard.svelte';

	/** @type {import('./$types').PageData} */
	export let data;
	const { routes } = data;
</script>

<div>
	<div class="grid lg:grid-cols-3 gap-4">
		{#each routes as route}
			<RouteCard {route} />
		{/each}
		<div>
			<form class="border rounded-lg py-3 px-4 grid gap-4" method="POST" action="?/postRoute">
				<h2 class="text-xl font-bold text-center">New Route</h2>
				<div class="grid gap-2">
					<label for="name">Route Name</label>
					<input class="py-2 px-4 border rounded-lg" required id="name" name="name" type="text" />
				</div>
				<button
					class="py-3 flex items-center justify-center bg-slate-900 w-full text-slate-100 font-bold rounded-xl"
				>
					+ New Route
				</button>
			</form>
		</div>
	</div>
</div>
