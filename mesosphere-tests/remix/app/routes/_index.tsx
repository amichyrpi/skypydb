import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouteLoaderData } from "@remix-run/react";
import {
  MesosphereProvider,
  ReactClient,
  callread,
  callwrite,
} from "mesosphere/reactlibrarie";
import { api } from "../../mesosphere/deploy";
import type { loader as rootLoader } from "../root";

export default function Index() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return (
      <main>
        <h1>Mesosphere Chat</h1>
        <p>Loading client...</p>
      </main>
    );
  }

  return <ClientChat />;
}

function ClientChat() {
  const rootData = useRouteLoaderData<typeof rootLoader>("root");
  const env = rootData?.ENV ?? {
    VITE_MESOSPHERE_URL: "",
    VITE_MESOSPHERE_API_KEY: "",
  };

  const mesosphere = useMemo(
    () => new ReactClient(env.VITE_MESOSPHERE_URL, env.VITE_MESOSPHERE_API_KEY),
    [env.VITE_MESOSPHERE_URL, env.VITE_MESOSPHERE_API_KEY],
  );

  return (
    <MesosphereProvider client={mesosphere}>
      <Chat />
    </MesosphereProvider>
  );
}

function Chat() {
  const readmessages = callread(api.message.readMessages);
  const sendMessage = callwrite(api.message.newMessage);

  const [newMessageText, setNewMessageText] = useState("");
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
          type="text"
          value={newMessageText}
          onChange={(event) => setNewMessageText(event.target.value)}
          placeholder="Write a message..."
        />
        <input type="submit" value="Send" disabled={!newMessageText} />
      </form>
    </main>
  );
}
