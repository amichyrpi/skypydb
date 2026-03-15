<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import {
		PUBLIC_CLERK_PUBLISHABLE_KEY,
		PUBLIC_MESOSPHERE_API_KEY,
		PUBLIC_MESOSPHERE_URL
	} from '$env/static/public';
	import { MesosphereClient } from 'mesosphere/svelte';
	import { onMount } from 'svelte';
	import { initClerk } from '$lib/clerk';

	let { children } = $props();

	// Initialize the Mesosphere client
	MesosphereClient(PUBLIC_MESOSPHERE_URL, PUBLIC_MESOSPHERE_API_KEY);

	onMount(() => {
		void initClerk(PUBLIC_CLERK_PUBLISHABLE_KEY);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
