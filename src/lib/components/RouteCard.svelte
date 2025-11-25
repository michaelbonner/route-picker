<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Timer from '$lib/components/Timer.svelte';
	import type { Route, RouteGroup, Trip } from '$lib/server/db/schema';
	import type { ActionResult } from '@sveltejs/kit';
	import { format, isSameDay, isSameHour, isSameYear } from 'date-fns';

	interface Props {
		route: Route & {
			trips: Trip[];
		};
		groups?: RouteGroup[];
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

	const convertSecondsToHoursMinutesSeconds = (seconds: number) => {
		const durationHours = Math.floor(seconds / 60 / 60);
		const durationMinutes = Math.floor((seconds / 60) % 60);
		const durationSeconds = Math.floor(seconds % 60);

		if (durationHours === 0 && durationMinutes === 0) {
			return `${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}s`;
		}

		if (durationHours === 0) {
			return `${
				durationMinutes < 10 ? `0${durationMinutes}` : durationMinutes
			}:${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}`;
		}

		return `${durationHours < 10 ? `0${durationHours}` : durationHours}:${
			durationMinutes < 10 ? `0${durationMinutes}` : durationMinutes
		}:${durationSeconds < 10 ? `0${durationSeconds}` : durationSeconds}`;
	};

	const getTimeFormatted = (startTime: Date, endTime?: Date | null) => {
		if (!endTime) return format(startTime, 'yyyy-MM-dd p');

		const monthDayYearWithTimeFormat = 'MM/dd/yy p';

		if (!isSameYear(startTime, endTime)) {
			return `${format(startTime, monthDayYearWithTimeFormat)} – ${format(endTime, monthDayYearWithTimeFormat)}`;
		}

		if (!isSameDay(startTime, endTime)) {
			return `${format(startTime, monthDayYearWithTimeFormat)} – ${format(endTime, monthDayYearWithTimeFormat)}`;
		}

		if (!isSameHour(startTime, endTime)) {
			return `${format(startTime, 'MM/dd/yy: p')} – ${format(endTime, 'p')}`;
		}

		return `${format(startTime, 'MM/dd/yy: h:mm:ss')} – ${format(endTime, 'h:mm:ss a')}`;
	};

	const deleteRoute = async (id: number) => {
		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/deleteRoute', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			await invalidateAll();
		}
	};

	const deleteTrip = async (id: number) => {
		const formData = new FormData();
		formData.append('id', id.toString());

		const response = await fetch('?/deleteTrip', {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			await invalidateAll();
		}
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

<div class="grid gap-4 rounded-lg" role="region" aria-labelledby="route-{route.id}-heading">
	<!-- Screen reader announcements for status changes -->
	<div aria-live="polite" aria-atomic="true" class="sr-only">
		{statusAnnouncement}
	</div>

	<div>
		<div class="flex gap-4 justify-center px-4">
			<h2 id="route-{route.id}-heading" class="text-xl font-bold text-center">
				{#if isEditing}
					<form
						method="POST"
						action="?/updateRouteName"
						use:enhance={handleFormSubmit}
						bind:this={editForm}
						class="inline-block"
						aria-label="Edit route name form"
					>
						<input type="hidden" name="routeId" value={route.id} />
						<input
							type="text"
							name="newName"
							bind:value={editingName}
							onkeydown={handleKeydown}
							oninput={handleInput}
							class="bg-transparent border-b-2 {editError
								? 'border-red-500'
								: 'border-gray-300'} focus:border-blue-500 focus:outline-none text-center text-xl font-bold px-2 py-1 rounded-sm transition-colors duration-200"
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
						<div id="route-{route.id}-instructions" class="sr-only">
							Press Enter to save changes or Escape to cancel editing
						</div>
					</form>
				{:else}
					<button
						onclick={startEdit}
						bind:this={editButton}
						class="hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 cursor-pointer px-2 py-1 rounded-md border-2 border-transparent hover:border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-opacity-50"
						disabled={isSubmitting}
						aria-label="Edit route name: {route.name}. Click to start editing."
						title="Click to edit route name"
					>
						{route.name}
					</button>
				{/if}
				<span class="text-base font-light" aria-label="{route.trips.length} trips recorded"
					>({route.trips.length} trips)</span
				>
			</h2>
			{#if route.trips.length === 0}
				<button
					class="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-opacity-50 rounded px-1"
					onclick={() => deleteRoute(route.id)}
					aria-label="Delete route: {route.name}"
					title="Delete this route"
				>
					x
				</button>
			{/if}
		</div>

		{#if props.groups && props.groups.length > 0}
			<div class="flex justify-center mt-2">
				<form method="POST" action="?/moveRouteToGroup" use:enhance>
					<input type="hidden" name="routeId" value={route.id} />
					<div class="grid gap-2 border p-2">
						<label for="groupId" class="text-sm font-medium">Move route to group</label>
						<select
							id="groupId"
							name="groupId"
							class="text-xs border rounded px-2 py-1 bg-white"
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
							value={route.routeGroupId || ''}
						>
							<option value="">No Group</option>
							{#each props.groups as group}
								<option value={group.id}>{group.name}</option>
							{/each}
						</select>
					</div>
				</form>
			</div>
		{/if}

		{#if editError}
			<div
				id="route-{route.id}-error"
				class="bg-red-50 border border-red-200 text-red-700 text-sm text-center mt-2 px-3 py-2 rounded-md"
				role="alert"
				aria-live="assertive"
			>
				<span class="font-medium">Error:</span>
				{editError}
			</div>
		{/if}

		{#if isSubmitting}
			<div
				class="bg-blue-50 border border-blue-200 text-blue-700 text-sm text-center mt-2 px-3 py-2 rounded-md"
				role="status"
				aria-live="polite"
			>
				<span class="font-medium">Saving...</span>
			</div>
		{/if}

		<div class="px-4 text-sm text-center">
			Average: {convertSecondsToHoursMinutesSeconds(
				route.trips.reduce((acc, trip) => {
					if (!trip.endTime) return acc;
					return acc + (trip.endTime.getTime() - trip.startTime.getTime()) / 1000;
				}, 0) / route.trips.length || 0
			)}
		</div>
	</div>

	<div class="grid gap-4">
		<div class="overflow-auto border max-h-[20vh]">
			{#each route.trips as trip (trip.id)}
				<div class="flex gap-2 justify-end items-center py-1 px-2 text-sm border-b">
					<div class="text-xs flex-1">
						{getTimeFormatted(trip.startTime, trip.endTime)}
					</div>
					<div class="text-xs">
						{#if trip.endTime}
							Total: {convertSecondsToHoursMinutesSeconds(
								(trip.endTime.getTime() - trip.startTime.getTime()) / 1000
							)}
						{/if}
					</div>
					<div>
						<button
							class="text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-opacity-50 rounded px-1"
							onclick={() => deleteTrip(trip.id)}
							aria-label="Delete trip from {getTimeFormatted(trip.startTime, trip.endTime)}"
							title="Delete this trip"
						>
							x
						</button>
					</div>
				</div>
			{/each}
		</div>

		<div class="px-4">
			<Timer routeId={route.id} />
		</div>
	</div>
</div>
