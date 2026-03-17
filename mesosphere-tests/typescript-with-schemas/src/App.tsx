import { FormEvent, useState } from "react";
import { callread, callwrite } from "mesosphere/reactlibrary";
import { api } from "../mesosphere/deploy";

export default function App() {
  const readmessages = callread(api.message.readMessages);

  const [newMessageText, setNewMessageText] = useState("");
  const sendMessage = callwrite(api.message.newMessage);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));
  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    await sendMessage({ body: newMessageText, user: name });
    setNewMessageText("");
  }
  return (
    <main>
      <h1>Mesosphere Chat</h1>
      <p className="badge">
        <span>{name}</span>
      </p>
      <ul>
        {readmessages.map((message) => (
          <li key={message._id}>
            <span>{message.user}:</span>
            <span>{message.body}</span>
            <span>{new Date(message._creationTime).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSendMessage}>
        <input
          value={newMessageText}
          onChange={(event) => setNewMessageText(event.target.value)}
          placeholder="Write a message…"
        />
        <input type="submit" value="Send" disabled={!newMessageText} />
      </form>
    </main>
  );
}
