<script>
	import { signIn, signOut } from '@auth/sveltekit/client';
	import { page } from '$app/stores';
</script>

<p>
	{#if $page.data.session}
		<div class="flex items-center gap-2">
			{#if $page.data.session.user?.image}
				<span style="background-image: url('{$page.data.session.user.image}')" class="avatar" />
			{/if}
			<span>
				<small>Signed in as</small>
				<strong>{$page.data.session.user?.name ?? 'User'}</strong>
			</span>
			<button
				class="py-1 px-3 border rounded-lg hover:bg-gray-50 transition-colors"
				on:click={() => signOut()}
				type="button">Sign out</button
			>
		</div>
	{:else}
		<div class="flex gap-2 items-center">
			<span class="notSignedInText">You are not signed in.</span>
			<span>Sign in with</span>
			<button
				class="py-1 px-3 border rounded-lg hover:bg-gray-50 transition-colors"
				on:click={() => signIn('google')}
				type="button"
			>
				Google
			</button>
			<span>Or</span>
			<button
				class="py-1 px-3 border rounded-lg hover:bg-gray-50 transition-colors"
				on:click={() => signIn('github')}
				type="button"
			>
				GitHub
			</button>
		</div>
	{/if}
</p>
