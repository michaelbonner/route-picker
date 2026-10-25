<script>
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '#lib/auth-client.js';

	const signIn = async () => {
		await authClient.signIn.social({
			provider: 'google'
		});
	};

	const signOut = async () => {
		await authClient.signOut();
		await invalidateAll();
	};

	const initial = $derived(
		(page.data.user?.name || page.data.user?.email || '?').trim().charAt(0).toUpperCase()
	);
</script>

{#if page.data.session}
	<div class="flex shrink-0 items-center gap-3">
		<span class="hidden text-right text-sm leading-tight sm:block">
			<span class="block text-xs text-slate-500">Signed in as</span>
			<span class="block max-w-56 truncate font-medium text-slate-800"
				>{page.data.user?.name || page.data.user?.email}</span
			>
		</span>
		<span
			class="hidden size-9 items-center justify-center rounded-full bg-teal-100 font-semibold text-teal-800 sm:flex"
			title={page.data.user?.email}
			aria-hidden="true">{initial}</span
		>
		<button
			class="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
			onclick={signOut}
			type="button">Sign out</button
		>
	</div>
{:else}
	<button
		class="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
		onclick={signIn}
		type="button">Sign in</button
	>
{/if}
