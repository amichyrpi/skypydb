import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { callread, callwrite } from "mesosphere/reactlibrarie";
import { type FormEvent, useState } from "react";
import { api } from "../../mesosphere/deploy";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(callread(api.message.readMessages, {}));
  const messages = data ?? [];
  const { mutateAsync: sendMessage, isPending } = useMutation({
    mutationFn: callwrite(api.message.newMessage),
  });

  const [newMessageText, setNewMessageText] = useState("");
  const [name] = useState(() => `User ${Math.floor(Math.random() * 10000)}`);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMessageText.trim()) return;
    await sendMessage({ body: newMessageText, user: name });
    setNewMessageText("");
  }

  return (
    <main>
      <header>
        <div>
          <h1>Mesosphere Chat</h1>
          <p>Real-time messages powered by TanStack Start and Mesosphere.</p>
        </div>
        <span className="badge">{name}</span>
      </header>

      <section className="panel">
        {messages.length === 0 ? (
          <div className="state">No messages yet. Start the conversation!</div>
        ) : (
          <ul className="messages">
            {messages.map((message) => (
              <li key={message._id} className="message">
                <div className="message-header">
                  <strong>{message.user}</strong>
                  {message._creationTime ? (
                    <span>
                      {new Date(message._creationTime).toLocaleTimeString()}
                    </span>
                  ) : null}
                </div>
                <p className="message-body">{message.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="form" onSubmit={handleSendMessage}>
          <div className="form-row">
            <input
              className="input"
              type="text"
              value={newMessageText}
              onChange={(event) => setNewMessageText(event.target.value)}
              placeholder="Write a message..."
            />
            <button className="button" type="submit" disabled={isPending}>
              {isPending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
