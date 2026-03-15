<script lang="ts">
	import { onDestroy } from 'svelte';
	import './index.css';
	import { callread, callwrite } from 'mesosphere/svelte';
	import { api } from '../mesosphere/deploy';
	import { clerkState } from '$lib/clerk';

	let signInRoot: HTMLDivElement | null = null;
	let userButtonRoot: HTMLDivElement | null = null;
	let signInMounted = false;
	let userButtonMounted = false;

	let messages: Array<{ _id: string; body: string; user: string; _creationTime?: number }> = [];
	let isLoading = false;
	let error: string | null = null;
	let messageText = '';
	let isSending = false;
	let hasLoadedOnce = false;

	$: clerk = $clerkState.clerk;
	$: isSignedIn = $clerkState.isSignedIn;
	$: displayName =
		$clerkState.user?.fullName ??
		$clerkState.user?.username ??
		$clerkState.user?.primaryEmailAddress?.emailAddress ??
		'Signed-in user';

	$: if (clerk && signInRoot && !signInMounted) {
		clerk.mountSignIn(signInRoot);
		signInMounted = true;
	}

	$: if (clerk && userButtonRoot && !userButtonMounted) {
		clerk.mountUserButton(userButtonRoot);
		userButtonMounted = true;
	}

	$: if (isSignedIn && !hasLoadedOnce) {
		hasLoadedOnce = true;
		void loadMessages();
	}

	$: if (!isSignedIn && hasLoadedOnce) {
		hasLoadedOnce = false;
		messages = [];
	}

	onDestroy(() => {
		if (clerk && signInMounted && signInRoot) {
			clerk.unmountSignIn(signInRoot);
			signInMounted = false;
		}

		if (clerk && userButtonMounted && userButtonRoot) {
			clerk.unmountUserButton(userButtonRoot);
			userButtonMounted = false;
		}
	});

	async function loadMessages() {
		isLoading = true;
		error = null;
		try {
			messages = await callread(api.message.readMessages, {});
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load messages.';
		} finally {
			isLoading = false;
		}
	}

	async function handleSendMessage(event: Event) {
		event.preventDefault();
		if (!messageText.trim() || isSending || !isSignedIn) return;

		isSending = true;
		error = null;
		try {
			await callwrite(api.message.newMessage, { body: messageText });
			messageText = '';
			await loadMessages();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to send message.';
		} finally {
			isSending = false;
		}
	}
</script>

<main class="page">
	<header class="page-header">
		<div>
			<h1>Mesosphere + Clerk (Svelte)</h1>
			<p>Authenticate with Clerk, then read and write messages through Mesosphere functions.</p>
		</div>
		<div class="user-panel" class:hidden={!isSignedIn}>
			<span class="user-name">{displayName}</span>
			<div class="user-button" bind:this={userButtonRoot}></div>
		</div>
	</header>

	<section class="auth-panel" class:hidden={isSignedIn}>
		<h2>Sign in to start chatting</h2>
		<div class="sign-in" bind:this={signInRoot}></div>
	</section>

	<section class="chat-panel" class:hidden={!isSignedIn}>
		<div class="chat-header">
			<h2>Messages</h2>
			<button type="button" on:click={loadMessages} class="secondary">Refresh</button>
		</div>

		<div class="messages">
			{#if isLoading}
				<div class="state">Loading messages...</div>
			{:else if error}
				<div class="state error">{error}</div>
			{:else if messages.length === 0}
				<div class="state">No messages yet. Start the conversation!</div>
			{:else}
				{#each messages as message (message._id)}
					<article class="message">
						<header>
							<strong>{message.user}</strong>
							{#if message._creationTime}
								<span>{new Date(message._creationTime).toLocaleTimeString()}</span>
							{/if}
						</header>
						<p>{message.body}</p>
					</article>
				{/each}
			{/if}
		</div>

		<form class="message-form" on:submit={handleSendMessage}>
			<input
				type="text"
				bind:value={messageText}
				placeholder="Write a message..."
				disabled={isSending}
			/>
			<button type="submit" disabled={!messageText.trim() || isSending}>
				{isSending ? 'Sending...' : 'Send'}
			</button>
		</form>
	</section>
</main>
