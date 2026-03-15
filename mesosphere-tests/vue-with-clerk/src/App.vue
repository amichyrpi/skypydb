<script setup lang="ts">
import { Clerk } from "@clerk/clerk-js";
import { computed, onBeforeUnmount, onMounted, ref, unref } from "vue";
import { callread, callwrite } from "mesosphere/vue";
import { api } from "../mesosphere/deploy";

type Message = {
  _id: string;
  user: string;
  body: string;
  _creationTime?: number;
};

const {
  data: messages,
  notready,
  error: readError,
} = callread(api.message.readMessages);
const { newdata: sendMessage, error: writeError } = callwrite(
  api.message.newMessage,
);

const newMessageText = ref("");
const isSending = ref(false);

const signInRoot = ref<HTMLDivElement | null>(null);
const userButtonRoot = ref<HTMLDivElement | null>(null);
const clerkInstance = ref<Clerk | null>(null);
const clerkUser = ref<any>(null);
const isSignedIn = ref(false);
const clerkError = ref<string | null>(null);

const displayName = computed(
  () =>
    clerkUser.value?.fullName ||
    clerkUser.value?.username ||
    clerkUser.value?.primaryEmailAddress?.emailAddress ||
    "Signed-in user",
);

function errorToMessage(error: unknown) {
  if (!error) return "";
  if (error instanceof Error) return error.message;
  return String(error);
}

const readErrorMessage = computed(() => errorToMessage(unref(readError)));
const writeErrorMessage = computed(() => errorToMessage(unref(writeError)));
const messageList = computed<Message[]>(() => {
  const value = unref(messages);
  return Array.isArray(value) ? (value as Message[]) : [];
});

onMounted(async () => {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    clerkError.value = "Missing VITE_CLERK_PUBLISHABLE_KEY.";
    return;
  }

  const instance = new Clerk(publishableKey);
  clerkInstance.value = instance;
  await instance.load();

  const updateState = (resources?: { user?: any }) => {
    const user = resources?.user ?? instance.user;
    clerkUser.value = user ?? null;
    isSignedIn.value = Boolean(user);
  };

  instance.addListener((resources) => updateState(resources));
  updateState();

  if (signInRoot.value) {
    instance.mountSignIn(signInRoot.value);
  }

  if (userButtonRoot.value) {
    instance.mountUserButton(userButtonRoot.value);
  }
});

onBeforeUnmount(() => {
  if (clerkInstance.value && signInRoot.value) {
    clerkInstance.value.unmountSignIn(signInRoot.value);
  }
  if (clerkInstance.value && userButtonRoot.value) {
    clerkInstance.value.unmountUserButton(userButtonRoot.value);
  }
});

async function handleSendMessage() {
  if (!isSignedIn.value || !newMessageText.value.trim() || isSending.value) {
    return;
  }
  isSending.value = true;
  try {
    const result = await sendMessage({ body: newMessageText.value });
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
        <h1>Mesosphere + Clerk (Vue)</h1>
        <p>Authenticate with Clerk, then read and write messages.</p>
      </div>
      <div class="user-panel" :class="{ hidden: !isSignedIn }">
        <span class="badge">{{ displayName }}</span>
        <div class="user-button" ref="userButtonRoot"></div>
      </div>
    </header>

    <section class="panel auth-panel" :class="{ hidden: isSignedIn }">
      <h2>Sign in to start chatting</h2>
      <p class="muted">Your session unlocks authenticated Mesosphere writes.</p>
      <div v-if="clerkError" class="state error">{{ clerkError }}</div>
      <div ref="signInRoot" class="sign-in"></div>
    </section>

    <section class="panel chat-panel" :class="{ hidden: !isSignedIn }">
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
            :disabled="!isSignedIn"
          />
          <button
            class="button"
            type="submit"
            :disabled="!newMessageText.trim() || isSending || !isSignedIn"
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
