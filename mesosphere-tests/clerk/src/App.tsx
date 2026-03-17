import { FormEvent, useState } from "react";
import {
  callread,
  callwrite,
  IsAuthenticated,
  IsNotAuthenticated,
} from "mesosphere/reactlibrary";
import { api } from "../mesosphere/deploy";
import { SignOutButton } from "@clerk/clerk-react";
import Users from "./Users";
import LoginPage from "./LoginPage";

export default function App() {
  return (
    <main>
      <IsNotAuthenticated>
        <LoginPage />
      </IsNotAuthenticated>
      <IsAuthenticated>
        <Content />
      </IsAuthenticated>
    </main>
  );
}

function Content() {
  const readmessages = callread(api.message.readMessages);

  const sendMessage = callwrite(api.message.newMessage);

  const [newMessageText, setNewMessageText] = useState("");

  async function handleSendNewMessage(event: FormEvent) {
    event.preventDefault();
    await sendMessage({ body: newMessageText });
    setNewMessageText("");
  }
  return (
    <>
      <h1>Mesosphere Chat</h1>
      <Users />
      <h2>
        <SignOutButton />
      </h2>
      <ul>
        {readmessages.map((message) => (
          <li key={message._id}>
            <span>{message.user}:</span>
            <span>{message.body}</span>
            <span>{new Date(message._creationTime).toLocaleTimeString()}</span>
          </li>
        ))}
      </ul>
      <form onSubmit={handleSendNewMessage}>
        <input
          value={newMessageText}
          onChange={(event) => setNewMessageText(event.target.value)}
          placeholder="Write a message…"
        />
        <input type="submit" value="Send" disabled={newMessageText === ""} />
      </form>
    </>
  );
}
