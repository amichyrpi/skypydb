import { useState } from "react";
import { callread, callwrite, callupload } from "mesosphere/reactlibrarie";
import { api } from "../mesosphere/deploy";
import { faker } from "@faker-js/faker";

// Set a random name for the user.
const NAME = getOrSetFakeName();

// Generate a random name for the user with the faker library.
function getOrSetFakeName() {
  const NAME_KEY = "name";
  const name = sessionStorage.getItem(NAME_KEY);
  if (!name) {
    const newName = faker.person.firstName();
    sessionStorage.setItem(NAME_KEY, newName);
    return newName;
  }
  return name;
}

export default function App() {
  // Read all the messages from the database.
  const messages = callread(api.message.readMessages);
  // Write a new message to the database.
  const sendMessage = callwrite(api.message.newMessage);
  // Upload a file to the database.
  const uploadFile = callupload(api.message.uploadFile);

  const [TextMessage, setTextMessage] = useState("");

  const [file, setFile] = useState<File | null>(null);

  return (
    <main className="chat">
      <header>
        <h1>Mesosphere Chat</h1>
        <p>
          Connected as <strong>{NAME}</strong>
        </p>
      </header>
      {messages?.map((message) => (
        <article
          key={message._id}
          className={message.user === NAME ? "message-mine" : ""}
        >
          <div>{message.user}</div>

          <p>{message.body}</p>
        </article>
      ))}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await sendMessage({ user: NAME, body: TextMessage });
          setTextMessage("");
        }}
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (file) {
              await uploadFile({ user: NAME, file });
              setFile(null);
            }
          }}
        >
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button type="submit" disabled={!file}>
            Upload
          </button>
        </form>
        <input
          value={TextMessage}
          onChange={async (e) => {
            const text = e.target.value;
            setTextMessage(text);
          }}
          placeholder="Write a message…"
          autoFocus
        />
        <button type="submit" disabled={!TextMessage}>
          Send
        </button>
      </form>
    </main>
  );
}
