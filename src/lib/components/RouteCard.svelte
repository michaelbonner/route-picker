<script lang="ts">
	import { enhance, type ActionResult } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { postAction } from '#lib/actions.js';
	import Timer from '#lib/components/Timer.svelte';
	import TripMap from '#lib/components/TripMap.svelte';
	import type { Route, RouteGroup, Trip } from '#lib/server/db/schema.js';
	import { formatDuration, formatTripDate, getRouteStats, tripSeconds } from '#lib/stats.js';
	import type { Location } from '#lib/types.js';
	import { slide } from 'svelte/transition';

	interface Props {
		route: Route & {
			trips: Trip[];
		};
		groups?: RouteGroup[];
		isFastest?: boolean;
	}

	const props: Props = $props();

	const route = $derived(props.route);

	// Inline editing state management
	let isEditing = $state(false);
	let editingName = $state('');
	let isSubmitting = $state(false);
	let editError = $state('');
	let editInput = $state<HTMLInputElement>();
	let editForm = $state<HTMLFormElement>();
	let editButton = $state<HTMLButtonElement>();
	let statusAnnouncement = $state('');

	let isTripsOpen = $state(false);
	let isMapOpen = $state(false);
	let moveForm = $state<HTMLFormElement>();

	const isValidLocation = (loc: unknown): loc is Location => {
		if (!loc || typeof loc !== 'object') return false;
		const l = loc as Record<string, unknown>;
		if (!l.coords || typeof l.coords !== 'object') return false;
		const c = l.coords as Record<string, unknown>;
		return typeof c.latitude === 'number' && typeof c.longitude === 'number';
	};

	const hasLocationData = $derived(
		route.trips.some(
			(trip) =>
				isValidLocation(trip.startLocation) ||
				isValidLocation(trip.endLocation) ||
				(Array.isArray(trip.path) && trip.path.some(isValidLocation))
		)
	);

	const stats = $derived(getRouteStats(route.trips));

	const deleteRoute = async () => {
		if (!confirm(`Delete "${route.name}"?`)) return;
		if (await postAction('deleteRoute', { id: route.id })) await invalidateAll();
	};

	const deleteTrip = async (trip: Trip) => {
		if (!confirm(`Delete the trip from ${formatTripDate(trip.startTime, trip.endTime)}?`)) return;
		if (await postAction('deleteTrip', { id: trip.id })) await invalidateAll();
	};

	// Inline editing methods
	const startEdit = () => {
		isEditing = true;
		editingName = route.name;
		editError = '';
		statusAnnouncement =
			'Edit mode activated. Type new route name and press Enter to save or Escape to cancel.';

		// Focus and select text after DOM update
		setTimeout(() => {
			if (editInput) {
				editInput.focus();
				editInput.select();
			}
		}, 0);
	};

	const cancelEdit = () => {
		isEditing = false;
		editingName = '';
		editError = '';
		statusAnnouncement = 'Edit cancelled. Route name unchanged.';

		// Return focus to the edit button
		setTimeout(() => {
			if (editButton) {
				editButton.focus();
			}
		}, 0);
	};

	// Client-side validation for empty or whitespace-only names
	const validateRouteName = (name: string): string | null => {
		const trimmedName = name.trim();
		if (!trimmedName) {
			return 'Route name cannot be empty';
		}
		if (trimmedName.length > 100) {
			return 'Route name cannot exceed 100 characters';
		}
		return null;
	};

	const saveEdit = async () => {
		// Validate the route name before submission
		const validationError = validateRouteName(editingName);
		if (validationError) {
			editError = validationError;
			// Auto-dismiss error after 3 seconds
			setTimeout(() => {
				if (editError === validationError) {
					editError = '';
				}
			}, 3000);
			return;
		}

		// Submit the form programmatically
		if (editForm) {
			editForm.requestSubmit();
		}
	};

	// Form submission handler using SvelteKit's enhance
	const handleFormSubmit = () => {
		// Validate before submission
		const validationError = validateRouteName(editingName);
		if (validationError) {
			editError = validationError;
			// Auto-dismiss validation error after 3 seconds
			setTimeout(() => {
				if (editError === validationError) {
					editError = '';
				}
			}, 3000);
			return;
		}

		// Store original name for proper fallback on errors
		const originalName = route.name;
		const trimmedName = editingName.trim();

		// Optimistic UI update - immediately show the new name
		route.name = trimmedName;
		isSubmitting = true;
		editError = '';

		return async ({
			result,
			update
		}: {
			result: ActionResult<
				Record<string, unknown> | undefined,
				Record<string, unknown> | undefined
			>;
			update: (options?: { reset?: boolean; invalidateAll?: boolean } | undefined) => Promise<void>;
		}) => {
			try {
				if (result.type === 'success') {
					// Success - exit edit mode and invalidate data
					isEditing = false;
					editingName = '';
					statusAnnouncement = `Route name successfully updated to "${trimmedName}".`;

					// Return focus to the edit button after successful save
					setTimeout(() => {
						if (editButton) {
							editButton.focus();
						}
					}, 0);

					await update();
				} else if (result.type === 'failure') {
					// Revert optimistic update on server error
					route.name = originalName;
					const errorMessage = (result.data?.error as string) || 'Failed to update route name';
					editError = errorMessage;
					statusAnnouncement = `Error: ${errorMessage}`;

					// Auto-dismiss error after 5 seconds and reset state
					setTimeout(() => {
						if (editError === errorMessage) {
							editError = '';
							cancelEdit();
						}
					}, 5000);
				} else if (result.type === 'error') {
					// Revert optimistic update on unexpected errors
					route.name = originalName;
					const errorMessage = 'An unexpected error occurred';
					editError = errorMessage;
					statusAnnouncement = `Error: ${errorMessage}`;

					// Auto-dismiss error after 5 seconds and reset state
					setTimeout(() => {
						if (editError === errorMessage) {
							editError = '';
							cancelEdit();
						}
					}, 5000);
				} else {
					// Revert optimistic update on other result types
					route.name = originalName;
					const errorMessage = 'Failed to update route name';
					editError = errorMessage;
					statusAnnouncement = `Error: ${errorMessage}`;

					// Auto-dismiss error after 5 seconds and reset state
					setTimeout(() => {
						if (editError === errorMessage) {
							editError = '';
							cancelEdit();
						}
					}, 5000);
				}
			} catch (error) {
				console.error('Error updating route name:', error);
				// Revert optimistic update on network error
				route.name = originalName;
				const errorMessage = 'Network error occurred';
				editError = errorMessage;
				statusAnnouncement = `Error: ${errorMessage}`;

				// Auto-dismiss error after 5 seconds and reset state
				setTimeout(() => {
					if (editError === errorMessage) {
						editError = '';
						cancelEdit();
					}
				}, 5000);
			} finally {
				isSubmitting = false;
			}
		};
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			saveEdit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	};

	// Real-time validation as user types
	const handleInput = () => {
		// Clear previous validation errors when user starts typing
		if (editError && editError.includes('cannot be empty')) {
			editError = '';
		}
	};

	// Clear status announcements after they've been read
	const clearStatusAnnouncement = () => {
		setTimeout(() => {
			statusAnnouncement = '';
		}, 1000);
	};

	// Watch for status announcements and clear them
	$effect(() => {
		if (statusAnnouncement) {
			clearStatusAnnouncement();
		}
	});
</script>

<article
	class="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm sm:p-5 {props.isFastest
		? 'border-emerald-300 ring-1 ring-emerald-300'
		: 'border-slate-200'}"
	aria-labelledby="route-{route.id}-heading"
>
	<!-- Screen reader announcements for status changes -->
	<div aria-live="polite" aria-atomic="true" class="sr-only">
		{statusAnnouncement}
	</div>

	<header class="flex items-start justify-between gap-2">
		<div class="min-w-0 flex-1">
			{#if props.isFastest}
				<span
					class="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
				>
					<svg class="size-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z"
							clip-rule="evenodd"
						/>
					</svg>
					Fastest on average
				</span>
			{/if}
			<h3 id="route-{route.id}-heading" class="text-lg leading-snug font-semibold text-slate-900">
				{#if isEditing}
					<form
						method="POST"
						action="?/updateRouteName"
						use:enhance={handleFormSubmit}
						bind:this={editForm}
						aria-label="Edit route name form"
					>
						<input type="hidden" name="routeId" value={route.id} />
						<input
							type="text"
							name="newName"
							bind:value={editingName}
							onkeydown={handleKeydown}
							oninput={handleInput}
							class="w-full rounded-lg border bg-white px-2 py-1 text-lg font-semibold transition-colors outline-none focus:ring-2 {editError
								? 'border-red-500 focus:ring-red-200'
								: 'border-teal-500 focus:ring-teal-200'}"
							disabled={isSubmitting}
							bind:this={editInput}
							placeholder="Enter route name"
							maxlength="100"
							required
							aria-label="Route name input field"
							aria-describedby={editError
								? `route-${route.id}-error`
								: `route-${route.id}-instructions`}
							aria-invalid={editError ? 'true' : 'false'}
						/>
						<p id="route-{route.id}-instructions" class="mt-1 text-xs font-normal text-slate-500">
							Press Enter to save changes or Escape to cancel editing
						</p>
					</form>
				{:else}
					<button
						onclick={startEdit}
						bind:this={editButton}
						class="group -mx-1 inline-flex max-w-full items-start gap-1.5 rounded-md px-1 text-left transition-colors hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-600"
						disabled={isSubmitting}
						aria-label="Edit route name: {route.name}. Click to start editing."
						title="Rename route"
					>
						<span class="break-words">{route.name}</span>
						<svg
							class="mt-1 size-4 shrink-0 text-slate-300 transition-colors group-hover:text-teal-600"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"
							/>
							<path
								d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"
							/>
						</svg>
					</button>
				{/if}
			</h3>
		</div>

		{#if route.trips.length === 0}
			<button
				class="-m-1 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-red-500"
				onclick={deleteRoute}
				aria-label="Delete route: {route.name}"
				title="Delete this route"
			>
				<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		{/if}
	</header>

	{#if editError}
		<div
			id="route-{route.id}-error"
			class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
			role="alert"
			aria-live="assertive"
		>
			<span class="font-medium">Error:</span>
			{editError}
		</div>
	{/if}

	{#if isSubmitting}
		<div class="text-sm text-slate-500" role="status" aria-live="polite">Saving...</div>
	{/if}

	{#if stats.averageSeconds !== null}
		<dl class="grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-2 text-center">
			<div class="px-2">
				<dt class="text-xs font-medium tracking-wide text-slate-500 uppercase">Average</dt>
				<dd class="text-lg font-semibold text-slate-900 tabular-nums">
					{formatDuration(stats.averageSeconds)}
				</dd>
			</div>
			<div class="px-2">
				<dt class="text-xs font-medium tracking-wide text-slate-500 uppercase">Best</dt>
				<dd class="text-lg font-semibold text-slate-900 tabular-nums">
					{formatDuration(stats.bestSeconds ?? 0)}
				</dd>
			</div>
			<div class="px-2">
				<dt class="text-xs font-medium tracking-wide text-slate-500 uppercase">Trips</dt>
				<dd class="text-lg font-semibold text-slate-900 tabular-nums">{stats.tripCount}</dd>
			</div>
		</dl>
	{:else}
		<p class="rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
			No trips yet. Start the timer when you set off on this route and stop it when you arrive.
		</p>
	{/if}

	<Timer routeId={route.id} routeName={route.name} />

	{#if route.trips.length > 0}
		<div class="divide-y divide-slate-100 rounded-xl border border-slate-200">
			<div>
				<button
					class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					onclick={() => (isTripsOpen = !isTripsOpen)}
					aria-expanded={isTripsOpen}
				>
					<span>Trip history</span>
					<svg
						class="size-4 text-slate-400 transition-transform duration-200 {isTripsOpen
							? 'rotate-180'
							: ''}"
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>

				{#if isTripsOpen}
					<ul transition:slide class="max-h-72 divide-y divide-slate-100 overflow-auto">
						{#each route.trips as trip (trip.id)}
							{@const seconds = tripSeconds(trip)}
							<li class="flex items-center gap-2 py-1.5 pr-1.5 pl-3 text-sm">
								<span class="min-w-0 flex-1 text-slate-600">
									{formatTripDate(trip.startTime, trip.endTime)}
								</span>
								{#if seconds !== null}
									{#if seconds === stats.bestSeconds && stats.tripCount > 1}
										<span
											class="rounded-full bg-emerald-100 px-1.5 text-xs font-medium text-emerald-800"
											>Best</span
										>
									{/if}
									<span class="font-medium text-slate-900 tabular-nums"
										>{formatDuration(seconds)}</span
									>
								{/if}
								<button
									class="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
									onclick={() => deleteTrip(trip)}
									aria-label="Delete trip from {formatTripDate(trip.startTime, trip.endTime)}"
									title="Delete this trip"
								>
									<svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
										<path
											d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
										/>
									</svg>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			{#if hasLocationData}
				<div>
					<button
						class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
						onclick={() => (isMapOpen = !isMapOpen)}
						aria-expanded={isMapOpen}
					>
						<span>Map of trips</span>
						<svg
							class="size-4 text-slate-400 transition-transform duration-200 {isMapOpen
								? 'rotate-180'
								: ''}"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								fill-rule="evenodd"
								d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>

					{#if isMapOpen}
						<div transition:slide class="p-2">
							<TripMap trips={route.trips} />
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/if}

	{#if props.groups && props.groups.length > 0}
		<form
			method="POST"
			action="?/moveRouteToGroup"
			use:enhance
			bind:this={moveForm}
			class="mt-auto flex items-center gap-2 text-sm text-slate-500"
		>
			<input type="hidden" name="routeId" value={route.id} />
			<label for="route-{route.id}-group">Group</label>
			<select
				id="route-{route.id}-group"
				name="groupId"
				class="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white py-1.5 pr-8 pl-2 text-sm text-slate-700"
				onchange={() => moveForm?.requestSubmit()}
				value={route.routeGroupId ?? ''}
			>
				<option value="">No group</option>
				{#each props.groups as group (group.id)}
					<option value={group.id}>{group.name}</option>
				{/each}
			</select>
		</form>
	{/if}
</article>
