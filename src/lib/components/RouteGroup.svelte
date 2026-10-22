<script lang="ts">
	import { enhance, type ActionResult } from '$app/forms';
	import RouteSection from './RouteSection.svelte';
	import type { RouteGroup, Route, Trip } from '#lib/server/db/schema.js';

	interface Props {
		group: RouteGroup & {
			routes: (Route & { trips: Trip[] })[];
		};
		allGroups: RouteGroup[];
	}

	const { group, allGroups }: Props = $props();

	// Inline editing state management
	let isEditing = $state(false);
	let editingName = $state('');
	let isSubmitting = $state(false);
	let editInput = $state<HTMLInputElement>();

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
		if (event.key === 'Escape') {
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

{#snippet editor()}
	<form method="POST" action="?/updateGroupName" use:enhance={handleFormSubmit} class="flex gap-2">
		<input type="hidden" name="id" value={group.id} />
		<label class="sr-only" for="group-{group.id}-name">Group name</label>
		<input
			id="group-{group.id}-name"
			type="text"
			name="name"
			bind:value={editingName}
			onkeydown={handleKeydown}
			class="min-w-0 flex-1 rounded-lg border border-teal-500 bg-white px-2 py-1 text-lg font-semibold outline-none focus:ring-2 focus:ring-teal-200"
			disabled={isSubmitting}
			bind:this={editInput}
			maxlength="100"
			required
		/>
		<button
			type="submit"
			class="rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
			disabled={isSubmitting}>Save</button
		>
		<button
			type="button"
			class="rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-200/60"
			onclick={cancelEdit}>Cancel</button
		>
	</form>
{/snippet}

<RouteSection
	sectionId="group-{group.id}"
	routes={group.routes}
	groups={allGroups}
	routeGroupId={group.id}
	addRouteLabel="Add a route to {group.name}"
	headingEditor={isEditing ? editor : undefined}
>
	{#snippet heading()}{group.name}{/snippet}

	{#snippet actions()}
		{#if !isEditing}
			<button
				onclick={startEdit}
				class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-200/60 hover:text-slate-700"
				aria-label="Rename group {group.name}"
				title="Rename group"
			>
				<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z"
					/>
					<path
						d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z"
					/>
				</svg>
			</button>

			<form method="POST" action="?/deleteGroup" use:enhance>
				<input type="hidden" name="id" value={group.id} />
				<button
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
					aria-label="Delete group {group.name}"
					title="Delete group"
					onclick={(e) => {
						if (
							!confirm(
								`Delete "${group.name}"? Its routes and trips are kept and moved out of the group.`
							)
						) {
							e.preventDefault();
						}
					}}
				>
					<svg class="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path
							fill-rule="evenodd"
							d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
							clip-rule="evenodd"
						/>
					</svg>
				</button>
			</form>
		{/if}
	{/snippet}
</RouteSection>
