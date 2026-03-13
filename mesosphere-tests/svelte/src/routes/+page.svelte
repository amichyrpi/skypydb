<script lang="ts">
	import './index.css';
	import { callread, callwrite } from 'mesosphere/svelte';
	import { api } from '../mesosphere/deploy';
	import { onMount } from 'svelte';

	// Generate a random username or get from session storage
	function getOrSetUserName(): string {
		const NAME_KEY = 'chat_username';
		const stored = sessionStorage.getItem(NAME_KEY);
		if (stored) return stored;
		
		const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
		const newName = names[Math.floor(Math.random() * names.length)] + '_' + Math.floor(Math.random() * 1000);
		sessionStorage.setItem(NAME_KEY, newName);
		return newName;
	}

	const USERNAME = getOrSetUserName();

	// Call the read function to get messages - this will auto-update in real-time
	const readMessages = callread(api.message.readMessages, {});

	// Write function for sending messages
	const sendMessage = callwrite(api.message.newMessage);

	let messageText = $state('');
	let isSending = $state(false);

	async function handleSendMessage(e: Event) {
		e.preventDefault();
		if (!messageText.trim() || isSending) return;

		isSending = true;
		try {
			await sendMessage({ user: USERNAME, body: messageText });
			messageText = '';
		} catch (error) {
			console.error('Failed to send message:', error);
		} finally {
			isSending = false;
		}
	}
</script>

<main class="chat-container">
	<header class="chat-header">
		<h1>Mesosphere Chat</h1>
		<p>Connected as <strong>{USERNAME}</strong></p>
	</header>

	<div class="messages">
		{#if readMessages.isLoading}
			<div class="loading">Loading messages...</div>
		{:else if readMessages.error}
			<div class="error">Failed to load messages: {readMessages.error.toString()}</div>
		{:else if !readMessages.data || readMessages.data.length === 0}
			<div class="empty">No messages yet. Start the conversation!</div>
		{:else}
			{#each readMessages.data as message (message._id)}
				<article class="message" class:mine={message.user === USERNAME}>
					<div class="message-header">
						<span class="username">{message.user}</span>
					</div>
					<p class="message-body">{message.body}</p>
				</article>
			{/each}
		{/if}
	</div>

	<form class="message-form" onsubmit={handleSendMessage}>
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
</main>
