<script>
	import { page } from '$app/state';
	import { signOut } from '@auth/sveltekit/client';
	import { SignIn } from '@auth/sveltekit/components';
</script>

<div>
	{#if page.data.session}
		<div class="flex gap-2 items-center">
			{#if page.data.session.user?.image}
				<span style="background-image: url('{page.data.session.user.image}')" class="avatar"></span>
			{/if}
			<span>
				<small>Signed in as</small>
				<strong>{page.data.session.user?.name ?? 'User'}</strong>
			</span>
			<button
				class="py-1 px-3 rounded-lg border transition-colors hover:bg-gray-50"
				onclick={() => signOut()}
				type="button">Sign out</button
			>
		</div>
	{:else}
		<div class="hidden flex-wrap gap-2 items-center lg:flex">
			<span class="notSignedInText">You are not signed in.</span>
			<SignIn>
				{#snippet submitButton()}
					<span class="border-b-2 underline-offset-4 cursor-pointer">Sign in</span>
				{/snippet}
			</SignIn>
		</div>
	{/if}
</div>
