<script>
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';

	const signIn = async () => {
		await authClient.signIn.social({
			provider: 'google'
		});
	};

	const signOut = async () => {
		await authClient.signOut();
		await invalidateAll();
	};
</script>

<div>
	{#if page.data.session}
		<div class="flex gap-2 items-center">
			<span>
				<small>Signed in as</small>
				<strong>{page.data.user?.email}</strong>
			</span>
			<button
				class="py-1 px-3 rounded-lg border transition-colors hover:bg-gray-50"
				onclick={signOut}
				type="button">Sign out</button
			>
		</div>
	{:else}
		<div class="hidden flex-wrap gap-2 items-center lg:flex">
			<span class="notSignedInText">You are not signed in.</span>
			<button class="border-b-2 underline-offset-4 cursor-pointer" onclick={signIn}>Sign in</button>
		</div>
	{/if}
</div>
