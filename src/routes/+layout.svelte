<script>
	import SignInOut from '$lib/components/SignInOut.svelte';
	import car from '$lib/images/car.svg';

	import '../app.css';
</script>

<svelte:head>
	<title>Which Route Is Faster</title>
	<meta property="og:image" content="https://www.whichrouteisfaster.com/og-image.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:type" content="website" />
	<meta property="og:image:alt" content="Which route is faster?" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
	<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
	<link rel="manifest" href="/site.webmanifest" />
</svelte:head>

<div class="grid gap-8 py-8 lg:gap-12">
	<header
		class="flex flex-wrap gap-4 justify-center px-4 mx-auto w-full max-w-7xl md:justify-between"
	>
		<h1 class="text-2xl font-bold underline lg:text-3xl 2xl:text-3xl shink-0">
			<a class="flex gap-4 items-end" href="/">
				<img class="h-10" src={car} alt="Which Route Is Faster Car" />
				<span> Which Route Is Faster </span>
			</a>
		</h1>

		<SignInOut />
	</header>

	<main class="px-4 mx-auto w-full max-w-7xl">
		<slot />
	</main>

	<footer class="flex flex-wrap justify-between px-4 mx-auto w-full max-w-7xl text-sm font-light">
		<p>
			&copy;{new Date().getFullYear()}
			<a class="underline underline-offset-2" href="https://michaelbonner.dev" target="_blank"
				>Michael Bonner</a
			>
		</p>
		<p>
			<a class="underline underline-offset-2" href="/policies">Policies</a>
		</p>
	</footer>
</div>
