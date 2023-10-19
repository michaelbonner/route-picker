<script>
	import SignInOut from '$lib/components/SignInOut.svelte';
	import '../app.css';
</script>

<svelte:head>
	<title>Route Picker</title>

	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="manifest" href="/site.webmanifest" />
</svelte:head>

<div class="grid gap-8 lg:gap-12 py-8">
	<header class="w-full max-w-7xl mx-auto px-8 flex justify-between">
		<h1 class="text-3xl font-bold underline">
			<a href="/">Route Picker</a>
		</h1>

		<SignInOut />
	</header>

	<main class="w-full max-w-7xl mx-auto px-8">
		<slot />
	</main>

	<footer class="w-full max-w-7xl mx-auto px-8 font-light text-sm">
		<p>
			&copy;{new Date().getFullYear()}
			<a class="underline underline-offset-2" href="https://michaelbonner.dev" target="_blank"
				>Michael Bonner</a
			>
		</p>
	</footer>
</div>
