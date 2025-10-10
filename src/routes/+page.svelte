<script>
	import { page } from '$app/state';
	import RouteCard from '$lib/components/RouteCard.svelte';
	import whichRouteIsFaster from '$lib/images/car-route.svg';
	import whichRouteIsFasterScreenshot from '$lib/images/which-route-is-faster-screenshot.avif';
	import { SignIn } from '@auth/sveltekit/components';
	import { invalidateAll } from '$app/navigation';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	const { data } = $props();
	const routes = $derived(data.routes);

	let newRouteName = $state('');

	const createNewRoute = async () => {
		if (!newRouteName) return;

		const formData = new FormData();
		formData.append('routeName', newRouteName);

		const response = await fetch('?/postRoute', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			newRouteName = '';
			await invalidateAll();
		}
	};
</script>

<!-- add svelte head -->
<svelte:head>
	<title>Which Route Is Faster</title>
	<meta
		name="description"
		content="Helping you figure out which route is faster, the most boring way possible"
	/>
	<meta property="og:title" content="Which Route Is Faster" />
	<meta
		property="og:description"
		content="Helping you figure out which route is faster, the most boring way possible"
	/>
	<meta property="og:url" content="https://www.whichrouteisfaster.com/" />
	<link rel="canonical" href="https://www.whichrouteisfaster.com/" />
</svelte:head>

<div>
	{#if page.data.session}
		<div class="grid gap-4 lg:grid-cols-3">
			{#each routes as route (route.id)}
				<RouteCard {route} />
			{/each}
			<div>
				<div class="grid gap-4 py-3 px-4 rounded-xl border lg:border-0">
					<h2 class="text-xl font-bold text-center">Create New Route</h2>
					<div class="grid gap-2">
						<label for="name">Route Name</label>
						<input
							class="py-2 px-4 rounded-lg border"
							required
							id="name"
							name="routeName"
							type="text"
							bind:value={newRouteName}
						/>
					</div>
					<div class="flex justify-end">
						<button
							class="flex justify-center items-center py-3 px-6 font-bold rounded-xl bg-slate-900 text-slate-100"
							onclick={createNewRoute}
						>
							+ New Route
						</button>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<div
			class="flex flex-col gap-4 justify-stretch [&_button]:w-full [&_button]:flex [&_button]:justify-center [&_button]:max-w-4xl [&_button]:mx-auto"
		>
			<SignIn>
				{#snippet submitButton()}
					<span
						class="rounded-lg border cursor-pointer gap-2 items-center px-4 py-6 flex w-full justify-center hover:bg-slate-100 transition-colors"
					>
						<span>
							<svg
								class="size-5"
								stroke="currentColor"
								fill="currentColor"
								stroke-width="0"
								viewBox="0 0 20 20"
								aria-hidden="true"
								height="200px"
								width="200px"
								xmlns="http://www.w3.org/2000/svg"
								><path
									fill-rule="evenodd"
									d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
									clip-rule="evenodd"
								></path></svg
							>
						</span>
						<span class="border-b-2 underline-offset-4"> Sign in to create routes </span>
					</span>
				{/snippet}
			</SignIn>
		</div>
	{/if}

	<div class="mx-auto mt-16 prose lg:prose-xl">
		<h2>What the heck is this thing?</h2>

		<div class="flex flex-col lg:flex-row-reverse items-start gap-4 prose-img:mt-6">
			<img
				class="w-full max-w-xs lg:w-[260px]"
				src={whichRouteIsFaster}
				alt="Which Route Is Faster Car"
			/>

			<div>
				<p>
					<strong>TL;DR: It's just saveable timers.</strong> Just plain old timers that you can start
					and stop to track your trips. Then you can see which route is faster over time.
				</p>

				<p>
					How many times have you driven the same route to work, and wondered if there was a faster
					way? Now you have a way to track your trips and see which route is faster over time.
				</p>
			</div>
		</div>

		<div class="bg-gray-100 rounded-xl p-4 prose-figure:mb-0">
			<figure>
				<a href={whichRouteIsFasterScreenshot} target="_blank">
					<img
						src={whichRouteIsFasterScreenshot}
						alt="Screenshot of the app"
						class="rounded-lg shadow"
					/>
				</a>
				<figcaption class="text-center">Screenshot of the app</figcaption>
			</figure>
		</div>

		<h3>Getting started:</h3>

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
