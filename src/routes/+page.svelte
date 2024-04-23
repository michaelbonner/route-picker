<script>
	import { page } from '$app/stores';
	import RouteCard from '$lib/components/RouteCard.svelte';
	import { signIn } from '@auth/sveltekit/client';
	import whichRouteIsFaster from '$lib/images/car-route.svg';

	/** @type {import('./$types').PageData} */
	export let data;
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
		<div class="grid lg:grid-cols-3 gap-8">
			{#each routes as route}
				<RouteCard {route} />
			{/each}
			<div>
				<form
					class="py-3 px-4 grid gap-4 border rounded-xl lg:border-0"
					method="POST"
					action="?/postRoute"
				>
					<h2 class="text-xl font-bold text-center">Create New Route</h2>
					<div class="grid gap-2">
						<label for="name">Route Name</label>
						<input
							class="py-2 px-4 border rounded-lg"
							required
							id="name"
							name="routeName"
							type="text"
						/>
					</div>
					<div class="flex justify-end">
						<button
							class="py-3 px-6 flex items-center justify-center bg-slate-900 text-slate-100 font-bold rounded-xl"
						>
							+ New Route
						</button>
					</div>
				</form>
			</div>
		</div>
	{:else}
		<div
			class="border rounded-lg my-4 py-8 px-4 w-full text-center italic flex flex-wrap items-center justify-center gap-4 max-w-4xl mx-auto"
		>
			<span>Sign in with</span>
			<button
				class="py-1 px-3 border rounded-lg hover:bg-gray-50 transition-colors flex gap-1 items-center"
				on:click={() => signIn('google')}
				type="button"
			>
				<svg
					stroke="currentColor"
					fill="currentColor"
					stroke-width="0"
					version="1.1"
					x="0px"
					y="0px"
					viewBox="0 0 48 48"
					enable-background="new 0 0 48 48"
					height="1em"
					width="1em"
					xmlns="http://www.w3.org/2000/svg"
					><path
						fill="#FFC107"
						d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12
					c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24
					c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
					></path><path
						fill="#FF3D00"
						d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657
					C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
					></path><path
						fill="#4CAF50"
						d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36
					c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
					></path><path
						fill="#1976D2"
						d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571
					c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
					></path></svg
				>
				<span> Google </span>
			</button>
			<span>or</span>
			<button
				class="py-1 px-3 border rounded-lg hover:bg-gray-50 transition-colors flex gap-1 items-center"
				on:click={() => signIn('github')}
				type="button"
			>
				<svg
					stroke="currentColor"
					fill="currentColor"
					stroke-width="0"
					viewBox="0 0 1024 1024"
					height="1em"
					width="1em"
					xmlns="http://www.w3.org/2000/svg"
					><path
						d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"
					></path></svg
				>
				<span> GitHub </span>
			</button>
			<span>to create a new route</span>
		</div>
	{/if}

	<div class="prose lg:prose-xl mt-16 mx-auto">
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
