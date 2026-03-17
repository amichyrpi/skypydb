import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import { ClerkProvider, SignOutButton, useAuth } from "@clerk/clerk-react";
import { Mesosphereproviderwithclerkauth } from "mesosphere/reactwithclerk";
import {
  IsAuthenticated,
  IsNotAuthenticated,
  ReactClient,
  callread,
  callwrite,
} from "mesosphere/reactlibrary";
import { api } from "../../mesosphere/deploy";
import type { loader as rootLoader } from "../root";
import LoginPage from "../components/LoginPage";
import Users from "../components/Users";

export default function Index() {
  const [hydrated, setHydrated] = useState(false);
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const env = rootData?.ENV ?? {
    VITE_MESOSPHERE_URL: "",
    VITE_MESOSPHERE_API_KEY: "",
    VITE_CLERK_PUBLISHABLE_KEY: "",
  };

  useEffect(() => {
    setHydrated(true);
  }, []);

  const mesosphere = useMemo(
    () => new ReactClient(env.VITE_MESOSPHERE_URL, env.VITE_MESOSPHERE_API_KEY),
    [env.VITE_MESOSPHERE_URL, env.VITE_MESOSPHERE_API_KEY],
  );

  if (!hydrated) {
    return (
      <main>
        <h1>Mesosphere + Clerk (Remix)</h1>
        <p>Loading client...</p>
      </main>
    );
  }

  return (
    <ClerkProvider publishableKey={env.VITE_CLERK_PUBLISHABLE_KEY}>
      <Mesosphereproviderwithclerkauth client={mesosphere} useAuth={useAuth}>
        <ChatApp />
      </Mesosphereproviderwithclerkauth>
    </ClerkProvider>
  );
}

function ChatApp() {
  return (
    <main>
      <header className="page-header">
        <div>
          <h1>Mesosphere + Clerk (Remix)</h1>
          <p>Authenticate with Clerk, then read and write messages.</p>
        </div>
      </header>

      <IsNotAuthenticated>
        <section className="auth-panel">
          <LoginPage />
        </section>
      </IsNotAuthenticated>

      <IsAuthenticated>
        <section className="chat-panel">
          <div className="chat-header">
            <div className="user-panel">
              <Users />
              <SignOutButton />
            </div>
          </div>
          <Chat />
        </section>
      </IsAuthenticated>
    </main>
  );
}

function Chat() {
  const readmessages = callread(api.message.readMessages);
  const sendMessage = callwrite(api.message.newMessage);

  const [newMessageText, setNewMessageText] = useState("");

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    await sendMessage({ body: newMessageText });
    setNewMessageText("");
  }

  return (
    <>
      <div className="messages">
        {readmessages.length === 0 ? (
          <div className="state">No messages yet. Start the conversation!</div>
        ) : (
          readmessages.map((message) => (
            <article className="message" key={message._id}>
              <header>
                <strong>{message.user}</strong>
                <span>
                  {new Date(message._creationTime).toLocaleTimeString()}
                </span>
              </header>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="message-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessageText}
          onChange={(event) => setNewMessageText(event.target.value)}
          placeholder="Write a message..."
        />
        <button type="submit" disabled={!newMessageText}>
          Send
        </button>
      </form>
    </>
  );
}
