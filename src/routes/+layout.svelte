<script>
	import '../app.css';
</script>

<div class="grid gap-8 lg:gap-12 py-8">
	<header class="w-full max-w-7xl mx-auto px-8">
		<h1 class="text-3xl font-bold underline">
			<a href="/">Route Picker</a>
		</h1>
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
