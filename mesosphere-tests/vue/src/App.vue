<script setup lang="ts">
import { computed, ref, unref } from "vue";
import { callread, callwrite } from "mesosphere/vue";
import { api } from "../mesosphere/deploy";

type Message = {
  _id: string;
  user: string;
  body: string;
  _creationTime?: number;
};

const { data: messages, notready, error: readError } = callread(
  api.message.readMessages,
);
const { newdata: sendMessage, error: writeError } = callwrite(
  api.message.newMessage,
);

const newMessageText = ref("");
const name = ref(`User ${Math.floor(Math.random() * 10000)}`);
const isSending = ref(false);

function errorToMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  return String(error);
}

const readErrorMessage = computed(() =>
  errorToMessage(unref(readError)),
);
const writeErrorMessage = computed(() =>
  errorToMessage(unref(writeError)),
);
const messageList = computed<Message[]>(() => {
  const value = unref(messages);
  return Array.isArray(value) ? (value as Message[]) : [];
});

async function handleSendMessage() {
  if (!newMessageText.value.trim() || isSending.value) return;
  isSending.value = true;
  try {
    const result = await sendMessage({
      user: name.value,
      body: newMessageText.value,
    });
    if (result?.error) {
      return;
    }
    newMessageText.value = "";
  } finally {
    isSending.value = false;
  }
}
</script>

<template>
  <main class="shell">
    <header class="hero">
      <div>
        <h1>Mesosphere Chat</h1>
        <p>Real-time messages powered by Mesosphere and Vue.</p>
      </div>
      <span class="badge">{{ name }}</span>
    </header>

    <section class="panel">
      <div v-if="notready" class="state">Loading messages...</div>
      <div v-else-if="readErrorMessage" class="state error">
        {{ readErrorMessage }}
      </div>
      <div v-else-if="messageList.length === 0" class="state">
        No messages yet. Start the conversation!
      </div>
      <ul v-else class="messages">
        <li v-for="message in messageList" :key="message._id" class="message">
          <div class="message-header">
            <strong>{{ message.user }}</strong>
            <span v-if="message._creationTime">
              {{ new Date(message._creationTime).toLocaleTimeString() }}
            </span>
          </div>
          <p class="message-body">{{ message.body }}</p>
        </li>
      </ul>

      <form class="form" @submit.prevent="handleSendMessage">
        <div class="form-row">
          <input
            class="input"
            type="text"
            v-model="newMessageText"
            placeholder="Write a message..."
          />
          <button
            class="button"
            type="submit"
            :disabled="!newMessageText.trim() || isSending"
          >
            {{ isSending ? "Sending..." : "Send" }}
          </button>
        </div>
        <p v-if="writeErrorMessage" class="state error">
          {{ writeErrorMessage }}
        </p>
      </form>
    </section>
  </main>
</template>
