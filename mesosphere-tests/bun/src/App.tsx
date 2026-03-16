import { type FormEvent, useMemo, useState } from "react";
import { callread, callwrite } from "mesosphere/reactlibrarie";
import { api } from "../mesosphere/deploy";
import APITester from "./APITester";

declare global {
  interface Window {
    MESOSPHERE_URL?: string;
    MESOSPHERE_API_KEY?: string;
  }
}

export default function App() {
  const readmessages = callread(api.message.readMessages);
  const sendMessage = callwrite(api.message.newMessage);

  const [newMessageText, setNewMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const name = useMemo(
    () => `BunUser-${Math.floor(Math.random() * 10000)}`,
    [],
  );

  const hasConfig =
    Boolean(window.MESOSPHERE_URL) &&
    Boolean(window.MESOSPHERE_API_KEY) &&
    window.MESOSPHERE_URL !== "__MESOSPHERE_URL__" &&
    window.MESOSPHERE_API_KEY !== "__MESOSPHERE_API_KEY__";

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newMessageText.trim() || isSending || !hasConfig) return;
    setIsSending(true);
    try {
      setSendError(null);
      await sendMessage({ body: newMessageText, user: name });
      setNewMessageText("");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send message.";
      setSendError(message);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main>
      <header>
        <div>
          <h1>Mesosphere Chat</h1>
          <p>Real-time messages powered by Bun + React.</p>
        </div>
        <span className="badge">{name}</span>
      </header>

      <section className="panel">
        <div className="meta-row">
          <APITester />
          {!hasConfig ? (
            <div className="state error">
              Set MESOSPHERE_URL and MESOSPHERE_API_KEY to connect.
            </div>
          ) : null}
        </div>

        {readmessages.length === 0 ? (
          <div className="state">No messages yet. Start the conversation!</div>
        ) : (
          <ul className="messages">
            {readmessages.map((message) => (
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
              onChange={(event) => {
                setNewMessageText(event.target.value);
                if (sendError) {
                  setSendError(null);
                }
              }}
              placeholder="Write a message..."
              disabled={!hasConfig || isSending}
            />
            <button
              className="button"
              type="submit"
              disabled={!newMessageText.trim() || isSending || !hasConfig}
            >
              {isSending ? "Sending..." : "Send"}
            </button>
          </div>
          {sendError ? <div className="state error">{sendError}</div> : null}
        </form>
      </section>
    </main>
  );
}
