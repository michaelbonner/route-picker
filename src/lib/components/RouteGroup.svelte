<script lang="ts">
	import { enhance } from '$app/forms';
	import RouteCard from './RouteCard.svelte';
	import type { RouteGroup, Route, Trip } from '$lib/server/db/schema';
	import type { ActionResult } from '@sveltejs/kit';

	interface Props {
		group: RouteGroup & {
			routes: (Route & { trips: Trip[] })[];
		};
		allGroups: RouteGroup[];
	}

	let { group, allGroups } = $props();

	// Inline editing state management (similar to RouteCard)
	let isEditing = $state(false);
	let editingName = $state('');
	let isSubmitting = $state(false);
	let editInput = $state<HTMLInputElement>();
	let editForm = $state<HTMLFormElement>();
	let editButton = $state<HTMLButtonElement>();

	const startEdit = () => {
		isEditing = true;
		editingName = group.name;
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
</script>

<div class="border-2 border-slate-200 rounded-xl p-4 bg-slate-50/50">
	<div class="flex justify-between items-center mb-4 pb-2 border-b border-slate-200">
		<div class="flex-1 text-center">
			{#if isEditing}
				<form
					method="POST"
					action="?/updateGroupName"
					use:enhance={handleFormSubmit}
					bind:this={editForm}
					class="inline-block"
				>
					<input type="hidden" name="id" value={group.id} />
					<input
						type="text"
						name="name"
						bind:value={editingName}
						onkeydown={handleKeydown}
						class="bg-transparent border-b-2 border-blue-500 focus:outline-none text-center text-lg font-bold px-2 py-1"
						disabled={isSubmitting}
						bind:this={editInput}
						required
					/>
				</form>
			{:else}
				<h2 class="text-lg font-bold flex items-center justify-center gap-2">
					<button
						onclick={startEdit}
						bind:this={editButton}
						class="hover:text-blue-600 transition-colors cursor-pointer"
						title="Click to edit group name"
					>
						{group.name}
					</button>
					<span class="text-sm font-normal text-slate-500">({group.routes.length} routes)</span>
				</h2>
			{/if}
		</div>

		<form method="POST" action="?/deleteGroup" use:enhance>
			<input type="hidden" name="id" value={group.id} />
			<button
				class="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
				title="Delete group (routes will be kept)"
				onclick={(e) => {
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

	<div class="grid gap-4 lg:grid-cols-1">
		{#each group.routes as route (route.id)}
			<RouteCard {route} groups={allGroups} />
		{/each}
		{#if group.routes.length === 0}
			<div
				class="text-center py-8 text-slate-400 text-sm italic border-2 border-dashed border-slate-200 rounded-lg"
			>
				No routes in this group
			</div>
		{/if}
	</div>
</div>
