<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import { PUBLIC_MESOSPHERE_URL, PUBLIC_MESOSPHERE_API_KEY } from '$env/static/public';
	import { MesosphereClient } from "mesosphere/svelte";

	let { children } = $props();

	// Initialize the Mesosphere client
	MesosphereClient(PUBLIC_MESOSPHERE_URL, PUBLIC_MESOSPHERE_API_KEY);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
