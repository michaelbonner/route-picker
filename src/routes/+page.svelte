<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.js';
	import RouteGroup from '#lib/components/RouteGroup.svelte';
	import RouteSection from '#lib/components/RouteSection.svelte';
	import whichRouteIsFaster from '#lib/images/car-route.svg';
	import whichRouteIsFasterScreenshot from '#lib/images/which-route-is-faster-screenshot.avif';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	const { data } = $props();
	const routes = $derived(data.routes);
	const groups = $derived(data.groups || []);

	let newRouteName = $state('');
	let newGroupName = $state('');
	let isCreatingRoute = $state(false);
	let isCreatingGroup = $state(false);

	// Trims the named field, skips empty submissions and clears the input on success.
	const submitName =
		(
			field: string,
			getValue: () => string,
			setBusy: (busy: boolean) => void,
			clear: () => void
		): SubmitFunction =>
		({ formData, cancel }) => {
			const value = getValue().trim();
			if (!value) {
				cancel();
				return;
			}
			formData.set(field, value);
			setBusy(true);

			return async ({ result, update }) => {
				if (result.type === 'success') clear();
				await update({ reset: false });
				setBusy(false);
			};
		};

	const signIn = async () => {
		await authClient.signIn.social({
			provider: 'google'
		});
	};

	const steps = [
		{
			title: 'Name your routes',
			body: 'Add each way you could go, like "To work via 6th South" and "To work via 4th South".'
		},
		{
			title: 'Time your trips',
			body: 'Tap Start when the routes split, and Stop when you arrive. Your location is logged so you can see the path later.'
		},
		{
			title: 'Let the averages decide',
			body: 'After a few trips each, routes are ranked side by side so you can see which one actually wins.'
		}
	];
</script>

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
</svelte:head>

{#if page.data.session}
	{#if routes.length === 0 && groups.length === 0}
		<section class="mx-auto grid max-w-2xl gap-6">
			<div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<h2 class="text-2xl font-semibold tracking-tight text-slate-900">Add your first route</h2>
				<p class="mt-2 text-slate-600">
					Think of a trip you make often, and one way you could take. You'll add the alternatives
					next.
				</p>
				<div class="mt-6">
					<form
						method="POST"
						action="?/postRoute"
						use:enhance={submitName(
							'routeName',
							() => newRouteName,
							(busy) => (isCreatingRoute = busy),
							() => (newRouteName = '')
						)}
						class="grid gap-2"
					>
						<label for="new-route-name" class="text-sm font-medium text-slate-700">Route name</label
						>
						<div class="flex min-w-0 gap-2">
							<input
								id="new-route-name"
								name="routeName"
								type="text"
								maxlength="100"
								placeholder="e.g. To work via 6th South"
								bind:value={newRouteName}
								class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-3 text-base outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
							/>
							<button
								type="submit"
								class="shrink-0 rounded-lg bg-slate-900 px-4 font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
								disabled={isCreatingRoute || !newRouteName.trim()}
							>
								Add route
							</button>
						</div>
					</form>
				</div>
			</div>

			<ol class="grid gap-4 sm:grid-cols-3">
				{#each steps as step, i (step.title)}
					<li class="rounded-2xl border border-slate-200 bg-white/60 p-4">
						<span
							class="flex size-7 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800"
							>{i + 1}</span
						>
						<h3 class="mt-3 font-semibold text-slate-900">{step.title}</h3>
						<p class="mt-1 text-sm text-slate-600">{step.body}</p>
					</li>
				{/each}
			</ol>
		</section>
	{:else}
		<div class="grid gap-6">
			{#each groups as group (group.id)}
				<RouteGroup {group} allGroups={groups} />
			{/each}

			{#if routes.length > 0 || groups.length === 0}
				<RouteSection
					sectionId="ungrouped"
					{routes}
					{groups}
					addRouteLabel={groups.length > 0 ? 'Add a route without a group' : 'Add another route'}
				>
					{#snippet heading()}{groups.length > 0 ? 'Other routes' : 'Your routes'}{/snippet}
				</RouteSection>
			{/if}

			<section
				class="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
				aria-labelledby="new-group-heading"
			>
				<div>
					<h2 id="new-group-heading" class="font-semibold text-slate-900">New group</h2>
					<p class="text-sm text-slate-600">
						Groups keep alternatives for the same trip together, like "Morning commute" or "Home
						from the gym", so each trip gets its own comparison.
					</p>
				</div>
				<form
					method="POST"
					action="?/createGroup"
					use:enhance={submitName(
						'name',
						() => newGroupName,
						(busy) => (isCreatingGroup = busy),
						() => (newGroupName = '')
					)}
					class="flex gap-2"
				>
					<label for="new-group-name" class="sr-only">Group name</label>
					<input
						id="new-group-name"
						name="name"
						type="text"
						maxlength="100"
						placeholder="Group name"
						bind:value={newGroupName}
						class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
					/>
					<button
						type="submit"
						class="shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-40"
						disabled={isCreatingGroup || !newGroupName.trim()}
					>
						Create group
					</button>
				</form>
			</section>
		</div>
	{/if}
{:else}
	<div class="grid gap-16 sm:gap-24">
		<section class="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
			<div>
				<h2 class="text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
					Stop guessing which way is faster.
				</h2>
				<p class="mt-4 max-w-xl text-lg text-pretty text-slate-600">
					Time the routes you actually drive, and let the averages settle it. It's just saveable
					timers — the most boring, most honest way to find your fastest commute.
				</p>
				<div class="mt-8 flex flex-wrap items-center gap-4">
					<button
						type="button"
						class="inline-flex items-center gap-3 rounded-xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-slate-800"
						onclick={signIn}
					>
						<svg class="size-5 rounded-sm bg-white p-0.5" viewBox="0 0 24 24" aria-hidden="true">
							<path
								fill="#4285F4"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="#34A853"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="#FBBC05"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="#EA4335"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Sign in with Google to start
					</button>
				</div>
			</div>
			<img
				class="mx-auto w-full max-w-sm"
				src={whichRouteIsFaster}
				alt="A car choosing between two routes"
			/>
		</section>

		<section aria-labelledby="how-it-works">
			<h2 id="how-it-works" class="text-2xl font-semibold tracking-tight text-slate-900">
				How it works
			</h2>
			<ol class="mt-6 grid gap-4 md:grid-cols-3">
				{#each steps as step, i (step.title)}
					<li class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<span
							class="flex size-8 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800"
							>{i + 1}</span
						>
						<h3 class="mt-4 font-semibold text-slate-900">{step.title}</h3>
						<p class="mt-1 text-slate-600">{step.body}</p>
					</li>
				{/each}
			</ol>
		</section>

		<figure class="mx-auto max-w-3xl">
			<a
				href={whichRouteIsFasterScreenshot}
				target="_blank"
				class="block overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
			>
				<img
					src={whichRouteIsFasterScreenshot}
					alt="Screenshot of the app showing two routes with their trip times"
					class="rounded-xl"
					loading="lazy"
				/>
			</a>
			<figcaption class="mt-3 text-center text-sm text-slate-500">
				Two routes, a handful of trips each, and a clear winner.
			</figcaption>
		</figure>
	</div>
{/if}
