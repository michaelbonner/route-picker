<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const is404 = $derived(page.status === 404);

	const heading = $derived(
		is404
			? 'Page not found'
			: page.status === 403
				? 'Access denied'
				: page.status === 500
					? 'Something went wrong'
					: 'An error occurred'
	);

	const message = $derived(
		is404
			? "The page you're looking for doesn't exist or may have been moved to a different URL."
			: page.status === 403
				? "You don't have the right permissions to access this page."
				: page.error?.message
					? page.error.message
					: 'We ran into an unexpected problem. Please try again in a moment.'
	);
</script>

<svelte:head>
	<title>{is404 ? 'Page Not Found' : `Error ${page.status}`} | Which Route Is Faster</title>
</svelte:head>

<div class="flex flex-col items-center justify-center px-4 py-24 text-center">
	<div class="mx-auto flex max-w-md flex-col items-center">
		<div
			class="flex size-16 items-center justify-center rounded-full border bg-white text-[#D7413D]"
		>
			{#if is404}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-7"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<circle cx="11" cy="11" r="7" />
					<path d="m21 21-4.3-4.3" />
					<path d="M8 11h6" />
				</svg>
			{:else}
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-7"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M12 9v4" />
					<path d="M12 17h.01" />
					<path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z" />
				</svg>
			{/if}
		</div>

		<p class="mt-8 text-sm font-medium text-gray-500">{page.status}</p>

		<h1 class="mt-2 text-2xl font-semibold tracking-tight">{heading}</h1>

		<p class="mt-3 max-w-sm text-base leading-relaxed text-gray-500">{message}</p>

		<div class="mt-8 flex w-full flex-col items-center gap-3 sm:flex-row sm:justify-center">
			<a
				href={resolve('/')}
				class="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#D7413D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#c23a36] sm:w-auto"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
					<polyline points="9 22 9 12 15 12 15 22" />
				</svg>
				Back to home
			</a>
			<button
				type="button"
				onclick={() => history.back()}
				class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="size-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m12 19-7-7 7-7" />
					<path d="M19 12H5" />
				</svg>
				Go back
			</button>
		</div>
	</div>
</div>
