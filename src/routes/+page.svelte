<script>
	import { page } from '$app/stores';
	import RouteCard from '$lib/components/RouteCard.svelte';
	import whichRouteIsFaster from '$lib/images/car-route.svg';
	import { SignIn } from '@auth/sveltekit/components';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();
	const { routes } = data;
</script>

<!-- add svelte head -->
<svelte:head>
	<title>Which Route Is Faster</title>
	<meta name="description" content="Helping you figure out which route is faster" />
	<meta property="og:title" content="Which Route Is Faster" />
	<meta property="og:description" content="Helping you figure out which route is faster" />
	<meta property="og:url" content="https://www.whichrouteisfaster.com/" />
	<link rel="canonical" href="https://www.whichrouteisfaster.com/" />
</svelte:head>

<div>
	{#if $page.data.session}
		<div class="grid gap-4 lg:grid-cols-3">
			{#each routes as route}
				<RouteCard {route} />
			{/each}
			<div>
				<form
					class="grid gap-4 py-3 px-4 rounded-xl border lg:border-0"
					method="POST"
					action="?/postRoute"
				>
					<h2 class="text-xl font-bold text-center">Create New Route</h2>
					<div class="grid gap-2">
						<label for="name">Route Name</label>
						<input
							class="py-2 px-4 rounded-lg border"
							required
							id="name"
							name="routeName"
							type="text"
						/>
					</div>
					<div class="flex justify-end">
						<button
							class="flex justify-center items-center py-3 px-6 font-bold rounded-xl bg-slate-900 text-slate-100"
						>
							+ New Route
						</button>
					</div>
				</form>
			</div>
		</div>
	{:else}
		<div
			class="flex flex-wrap gap-4 justify-center items-center py-8 px-4 my-4 mx-auto w-full max-w-4xl italic text-center rounded-lg border"
		>
			<SignIn>
				<span class="border-b-2 underline-offset-4 cursor-pointer" slot="submitButton"
					>Sign in to create routes</span
				>
			</SignIn>
		</div>
	{/if}

	<div class="mx-auto mt-16 prose lg:prose-xl">
		<h2>What the heck is this thing?</h2>
		<img class="lg:w-1/2" src={whichRouteIsFaster} alt="Which Route Is Faster Car" />

		<p>
			How many times have you driven the same route to work, and wondered if there was a faster way?
			Now you have a way to track your trips and see which route is faster over time.
		</p>

		<p>Here's how it works:</p>

		<ol>
			<li>
				Think of a route you want to track. Maybe it's "To work via 6th South" or "To work via 4th
				South".
			</li>
			<li>Add that route to the list of routes (To work via 6th South).</li>
			<li>Add an alternate route to the list of routes (To work via 4th South).</li>
			<li>When the two paths diverge, start the timer.</li>
			<li>When you arrive at your destination, stop the timer.</li>
			<li>Repeat this process for a few days or weeks.</li>
			<li>Review the trips for each route to see which one is faster over time.</li>
		</ol>
	</div>
</div>
