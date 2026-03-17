import { FormEvent, useState } from "react";
import {
  IsAuthenticated,
  IsNotAuthenticated,
  callread,
  callwrite,
} from "mesosphere/reactlibrary";
import { SignInButton, SignOutButton, useUser } from "@clerk/clerk-react";
import { api } from "../mesosphere/deploy";

export default function Home() {
  return (
    <main>
      <header className="page-header">
        <div>
          <h1>Mesosphere + Clerk (Next.js)</h1>
          <p>Authenticate with Clerk, then read and write messages.</p>
        </div>
      </header>

      <IsNotAuthenticated>
        <section className="auth-panel">
          <h2>Sign in to start chatting</h2>
          <SignInButton />
        </section>
      </IsNotAuthenticated>

      <IsAuthenticated>
        <section className="chat-panel">
          <div className="chat-header">
            <UserBadge />
            <SignOutButton />
          </div>
          <Chat />
        </section>
      </IsAuthenticated>
    </main>
  );
}

function UserBadge() {
  const { user } = useUser();
  return (
    <div className="user-panel">
      <span className="user-name">
        Logged in{user?.fullName ? ` as ${user.fullName}` : ""}
      </span>
    </div>
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
