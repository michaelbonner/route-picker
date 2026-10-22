<script lang="ts">
	import { enhance, type SubmitFunction } from '$app/forms';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import { isCollapsed, setCollapsed } from '#lib/collapsed.js';
	import RouteCard from '#lib/components/RouteCard.svelte';
	import type { Route, RouteGroup, Trip } from '#lib/server/db/schema.js';
	import { formatDuration, rankRoutes } from '#lib/stats.js';

	interface Props {
		// stable id used to remember whether the section is collapsed
		sectionId: string;
		routes: (Route & { trips: Trip[] })[];
		groups: RouteGroup[];
		routeGroupId?: number | null;
		addRouteLabel: string;
		heading: Snippet;
		// replaces the heading while e.g. renaming, so the toggle button isn't in the way
		headingEditor?: Snippet;
		actions?: Snippet;
	}

	const {
		sectionId,
		routes,
		groups,
		routeGroupId = null,
		addRouteLabel,
		heading,
		headingEditor,
		actions
	}: Props = $props();

	let isOpen = $state(true);
	let newRouteName = $state('');
	let isAddingRoute = $state(false);

	$effect(() => {
		isOpen = !isCollapsed(sectionId);
	});

	const toggle = () => {
		isOpen = !isOpen;
		setCollapsed(sectionId, !isOpen);
	};

	const ranked = $derived(rankRoutes(routes));
	const slowestAverage = $derived(ranked.at(-1)?.stats.averageSeconds ?? 0);
	const fastestId = $derived(ranked.length > 1 ? ranked[0].route.id : null);

	const handleAddRoute: SubmitFunction = ({ formData, cancel }) => {
		const name = newRouteName.trim();
		if (!name) {
			cancel();
			return;
		}
		formData.set('routeName', name);
		isAddingRoute = true;

		return async ({ result, update }) => {
			if (result.type === 'success') newRouteName = '';
			await update({ reset: false });
			isAddingRoute = false;
		};
	};
</script>

<section
	class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/60"
	aria-labelledby="section-{sectionId}-heading"
>
	<div class="flex items-center gap-2 py-2 pr-2 pl-2 sm:pl-3">
		{#if headingEditor}
			<div class="flex-1 py-1 pl-1">{@render headingEditor()}</div>
		{:else}
			<button
				type="button"
				class="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-slate-200/60 focus-visible:outline-2 focus-visible:outline-teal-600"
				onclick={toggle}
				aria-expanded={isOpen}
				aria-controls="section-{sectionId}-content"
			>
				<svg
					class="size-5 shrink-0 text-slate-400 transition-transform duration-200 {isOpen
						? 'rotate-90'
						: ''}"
					viewBox="0 0 20 20"
					fill="currentColor"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
						clip-rule="evenodd"
					/>
				</svg>
				<h2
					id="section-{sectionId}-heading"
					class="flex min-w-0 items-baseline gap-2 text-lg font-semibold text-slate-900"
				>
					<span class="truncate">{@render heading()}</span>
					<span class="shrink-0 text-sm font-normal text-slate-500">
						{routes.length}
						{routes.length === 1 ? 'route' : 'routes'}
					</span>
				</h2>
			</button>
		{/if}

		{@render actions?.()}
	</div>

	{#if isOpen}
		<div
			id="section-{sectionId}-content"
			transition:slide|local
			class="grid gap-4 px-2 pb-2 sm:px-3 sm:pb-3"
		>
			{#if ranked.length > 1}
				<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<h3 class="text-sm font-semibold text-slate-900">How they compare</h3>
					<p class="text-xs text-slate-500">Average trip time, fastest first</p>
					<ol class="mt-3 grid gap-2.5">
						{#each ranked as { route, stats, deltaSeconds }, i (route.id)}
							<li
								class="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 text-sm"
							>
								<span
									class="text-center text-xs font-semibold {i === 0
										? 'text-emerald-700'
										: 'text-slate-400'}">{i + 1}</span
								>
								<span class="truncate font-medium text-slate-800">{route.name}</span>
								<span class="text-right tabular-nums">
									<span class="font-semibold text-slate-900"
										>{formatDuration(stats.averageSeconds!)}</span
									>
									{#if i === 0}
										<span class="ml-1 text-xs font-medium text-emerald-700">fastest</span>
									{:else}
										<span class="ml-1 text-xs text-slate-500">+{formatDuration(deltaSeconds)}</span>
									{/if}
								</span>
								<div class="col-start-2 col-end-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
									<div
										class="h-full rounded-full {i === 0 ? 'bg-emerald-500' : 'bg-slate-300'}"
										style:width="{(stats.averageSeconds! / slowestAverage) * 100}%"
									></div>
								</div>
							</li>
						{/each}
					</ol>
					{#if ranked.some((r) => r.stats.tripCount < 3)}
						<p class="mt-3 text-xs text-slate-500">
							Tip: a few more trips per route will make this comparison more reliable.
						</p>
					{/if}
				</div>
			{/if}

			{#if routes.length > 0}
				<div class="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
					{#each routes as route (route.id)}
						<RouteCard {route} {groups} isFastest={route.id === fastestId} />
					{/each}
				</div>
			{/if}

			<form
				method="POST"
				action="?/postRoute"
				use:enhance={handleAddRoute}
				class="flex gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-2"
			>
				{#if routeGroupId !== null}
					<input type="hidden" name="routeGroupId" value={routeGroupId} />
				{/if}
				<label class="sr-only" for="section-{sectionId}-new-route">{addRouteLabel}</label>
				<input
					id="section-{sectionId}-new-route"
					type="text"
					name="routeName"
					placeholder={addRouteLabel}
					maxlength="100"
					bind:value={newRouteName}
					class="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-slate-300 focus:bg-white"
				/>
				<button
					type="submit"
					class="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-40"
					disabled={isAddingRoute || !newRouteName.trim()}
				>
					Add route
				</button>
			</form>
		</div>
	{/if}
</section>
