<script>
	import '../app.css';
</script>

<div class="grid gap-8 lg:gap-12">
	<header class="w-full max-w-7xl mx-auto px-8">
		<h1 class="text-3xl font-bold underline">Route Picker</h1>
	</header>

	<main class="w-full max-w-7xl mx-auto px-8">
		<slot />
	</main>

	<footer class="w-full max-w-7xl mx-auto px-8 font-light text-sm">
		<p>&copy;{new Date().getFullYear()} Michael Bonner</p>
	</footer>
</div>
