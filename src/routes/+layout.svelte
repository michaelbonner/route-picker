<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import ActiveTripBar from '#lib/components/ActiveTripBar.svelte';
	import SignInOut from '#lib/components/SignInOut.svelte';
	import car from '#lib/images/car.svg';
	import { tripTimers } from '#lib/trip-timer.svelte.js';

	import '../app.css';
	interface Props {
		children?: import('svelte').Snippet;
		data?: { user?: { id?: string; name?: string; email?: string } };
	}

	const { children, data }: Props = $props();

	const canonical = $derived(`https://www.whichrouteisfaster.com${page.url.pathname}`);

	// restore any trip that was being timed before a reload
	$effect(() => tripTimers.load());

	$effect(() => {
		const script = document.createElement('script');
		script.src = 'https://easycustomerfeedback.com/widget/85729a4b50ca4f04ba871765c4f8185e/embed';
		script.async = true;
		script.dataset.label = 'Send feedback';
		script.dataset.position = 'right';
		script.dataset.color = '#f58717';
		if (data?.user?.name) script.dataset.name = data.user.name;
		if (data?.user?.email) script.dataset.email = data.user.email;
		if (data?.user?.id) script.dataset.userId = data.user.id;
		document.head.appendChild(script);
		return () => script.remove();
	});
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
	<link rel="canonical" href={canonical} />
</svelte:head>

<div class="flex min-h-dvh flex-col">
	<header class="border-b border-slate-200 bg-white/80 backdrop-blur">
		<div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
			<a
				class="flex min-w-0 items-center gap-2.5 rounded-lg text-slate-900 focus-visible:outline-2 focus-visible:outline-teal-600"
				href={resolve('/')}
			>
				<img class="h-8 shrink-0" src={car} alt="" />
				<span class="truncate text-base font-bold tracking-tight sm:text-xl"
					>Which Route Is Faster</span
				>
			</a>

			<SignInOut />
		</div>
	</header>

	<main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-10">
		{@render children?.()}
	</main>

	<footer class="border-t border-slate-200">
		<div
			class="mx-auto flex w-full max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-sm text-slate-500"
		>
			<p>
				&copy;2023-{new Date().getFullYear()}
				<a
					class="underline underline-offset-2 hover:text-slate-800"
					href="https://michaelbonner.dev"
					target="_blank">Michael Bonner</a
				>
			</p>
			<p>
				<a class="underline underline-offset-2 hover:text-slate-800" href={resolve('/policies')}
					>Policies</a
				>
			</p>
		</div>
	</footer>

	<ActiveTripBar />
</div>
