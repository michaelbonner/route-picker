<script lang="ts">
	import { enhance } from '$app/forms';
	import RouteCard from './RouteCard.svelte';
	import type { RouteGroup, Route, Trip } from '$lib/server/db/schema';
	import type { ActionResult } from '@sveltejs/kit';
	import { slide } from 'svelte/transition';

	interface Props {
		group: RouteGroup & {
			routes: (Route & { trips: Trip[] })[];
		};
		allGroups: RouteGroup[];
	}

	let { group, allGroups } = $props();

	// Inline editing state management
	let isEditing = $state(false);
	let editingName = $state('');
	let isSubmitting = $state(false);
	let editInput = $state<HTMLInputElement>();
	let editForm = $state<HTMLFormElement>();

	// Accordion state
	let isOpen = $state(false);

	// Add new route state
	let isAddingRoute = $state(false);
	let newRouteName = $state('');
	let isSubmittingRoute = $state(false);
	let newRouteInput = $state<HTMLInputElement>();

	const startAddRoute = () => {
		isAddingRoute = true;
		newRouteName = '';
		setTimeout(() => {
			if (newRouteInput) {
				newRouteInput.focus();
			}
		}, 0);
	};

	const cancelAddRoute = () => {
		isAddingRoute = false;
		newRouteName = '';
	};

	const handleAddRouteSubmit = () => {
		const trimmedName = newRouteName.trim();
		if (!trimmedName) return;

		isSubmittingRoute = true;
		newRouteName = trimmedName;

		return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
			if (result.type === 'success') {
				isAddingRoute = false;
				newRouteName = '';
				await update();
			}
			isSubmittingRoute = false;
		};
	};

	const startEdit = () => {
		isEditing = true;
		editingName = group.name;
		// Keep accordion open while editing if it was closed?
		// Or assume user wants to edit the name regardless.
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
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter') {
			event.preventDefault();
			editForm?.requestSubmit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			cancelEdit();
		}
	};

	const handleFormSubmit = () => {
		const originalName = group.name;
		const trimmedName = editingName.trim();

		if (!trimmedName) return;

		group.name = trimmedName;
		isSubmitting = true;

		return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
			if (result.type === 'success') {
				isEditing = false;
				await update();
			} else {
				group.name = originalName;
			}
			isSubmitting = false;
		};
	};

	const toggleOpen = () => {
		if (!isEditing) {
			isOpen = !isOpen;
		}
	};
</script>

<div class="border-2 border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden transition-all">
	<!-- Header / Toggle -->
	<div
		class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 transition-colors select-none"
		onclick={toggleOpen}
		onkeydown={(e) => e.key === 'Enter' && toggleOpen()}
		role="button"
		tabindex="0"
		aria-expanded={isOpen}
	>
		<div class="flex items-center gap-3 flex-1 overflow-hidden">
			<!-- Chevron -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				stroke-width="2.5"
				stroke="currentColor"
				class="size-5 text-slate-400 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
			</svg>

			{#if isEditing}
				<form
					method="POST"
					action="?/updateGroupName"
					use:enhance={handleFormSubmit}
					bind:this={editForm}
					class="flex-1"
				>
					<input type="hidden" name="id" value={group.id} />
					<input
						type="text"
						name="name"
						bind:value={editingName}
						onkeydown={(e) => {
							e.stopPropagation();
							handleKeydown(e);
						}}
						onclick={(e) => e.stopPropagation()}
						class="w-full bg-white border-2 border-blue-500 rounded px-2 py-1 focus:outline-none font-bold"
						disabled={isSubmitting}
						bind:this={editInput}
						required
					/>
				</form>
			{:else}
				<h2 class="text-lg font-bold truncate flex items-baseline gap-2 text-slate-800">
					{group.name}
					<span class="text-sm font-normal text-slate-500">({group.routes.length})</span>
				</h2>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex items-center gap-1 pl-2">
			{#if !isEditing}
				<button
					onclick={(e) => {
						e.stopPropagation();
						startEdit();
					}}
					class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
					title="Edit group name"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
						/>
					</svg>
				</button>
			{/if}

			<form method="POST" action="?/deleteGroup" use:enhance>
				<input type="hidden" name="id" value={group.id} />
				<button
					class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
					title="Delete group"
					onclick={(e) => {
						e.stopPropagation();
						if (!confirm('Delete this group? Routes will be ungrouped.')) {
							e.preventDefault();
						}
					}}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke-width="1.5"
						stroke="currentColor"
						class="size-5"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
						/>
					</svg>
				</button>
			</form>
		</div>
	</div>

	{#if isOpen}
		<div transition:slide|local class="border-t border-slate-200 bg-white">
			<div class="grid gap-4 p-4 lg:grid-cols-2 xl:grid-cols-3">
				{#each group.routes as route (route.id)}
					<RouteCard {route} groups={allGroups} />
				{/each}
			</div>

			{#if group.routes.length === 0}
				<div
					class="text-center py-8 text-slate-400 text-sm italic m-4 border-2 border-dashed border-slate-200 rounded-lg"
				>
					No routes in this group
				</div>
			{/if}

			<!-- Add New Route Section -->
			<div class="p-4 border-t border-slate-100 bg-slate-50">
				{#if !isAddingRoute}
					<button
						class="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium text-sm w-full p-2 rounded-lg hover:bg-slate-200/50"
						onclick={() => startAddRoute()}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="2"
							stroke="currentColor"
							class="size-4"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
						</svg>
						Add route to this group
					</button>
				{:else}
					<form
						method="POST"
						action="?/postRoute"
						class="flex gap-2 items-center"
						use:enhance={handleAddRouteSubmit}
					>
						<input type="hidden" name="routeGroupId" value={group.id} />
						<input
							bind:this={newRouteInput}
							type="text"
							name="routeName"
							placeholder="Route Name"
							class="flex-1 py-1 px-3 rounded border border-slate-300 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
							bind:value={newRouteName}
							required
							onkeydown={(e) => e.key === 'Escape' && cancelAddRoute()}
						/>
						<button
							type="submit"
							class="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-1 px-3 rounded transition-colors disabled:opacity-50"
							disabled={isSubmittingRoute}
						>
							Add
						</button>
						<button
							type="button"
							class="text-slate-400 hover:text-slate-600 p-1"
							onclick={cancelAddRoute}
							aria-label="Cancel"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="2"
								stroke="currentColor"
								class="size-5"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
							</svg>
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>
