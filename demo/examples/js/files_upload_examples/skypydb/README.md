# Skypydb functions directory

## Relational functions

Write your Relational functions here.
Look at https://docs.ahen-studio.com/relational/functions for more information.

A read function that have two arguments:

```ts
// skypydb/read.ts
import { readFunction, value } from "skypydb/functions";

// Read a document from the database.
// A table is automatically created when you write a write function; it is created with the name of the file in which the function is written.
export const readDatabase = readFunction({
  // Validators for arguments.
  args: {
    name: value.number(),
    email: value.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    const documents = await ctx.db.read("users").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.name, args.email);

    // Return a value from your mutation.
    return documents;
  },
});
```

A write function:

```ts
// skypydb/users.ts
import { writeFunction, value } from "skypydb/functions";

// Add a new user to the database.
export const createUser = writeFunction({
  // Validators for arguments.
  args: {
    name: value.string(),
    email: value.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    const user = { author: args.name, body: args.email };
    const id = await ctx.db.insert("users", user);

    // Optionally, return a value from your mutation.
    return await ctx.db.get("users", id);
  },
});
```

Using these functions in a React component:

```ts
// src/App.tsx
import { FormEvent, useEffect, useState } from "react";
import { createUser, readUsers, type UserRecord } from "./client";

type FormState = {
  name: string;
  email: string;
};

const initialForm: FormState = {
  name: "Theo",
  email: "theo@example.com",
};

export default function App() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [lastCreated, setLastCreated] = useState<UserRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshUsers() {
    setPending(true);
    setError(null);

    try {
      const list = await readUsers();
      setUsers(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read users.");
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    void refreshUsers();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const created = await createUser(form);
      setLastCreated(created);
      const list = await readUsers();
      setUsers(list);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      style={{
        margin: "2rem auto",
        maxWidth: "48rem",
        padding: "0 1rem",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1.45,
      }}
    >
      <h1>Skypydb Relational Example</h1>
      <p>Create a user with a write function, then read all users.</p>

      <form
        onSubmit={onSubmit}
        style={{
          display: "grid",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <label>
          Name
          <input
            type="text"
            value={form.name}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, name: event.target.value }))
            }
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, email: event.target.value }))
            }
            required
            style={{ display: "block", width: "100%" }}
          />
        </label>

        <button type="submit" disabled={pending}>
          {pending ? "Working..." : "Create User"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => void refreshUsers()}
        disabled={pending}
      >
        Refresh Users
      </button>

      {error ? <p style={{ color: "#b00020" }}>{error}</p> : null}

      {lastCreated ? (
        <p>
          Last created user: <strong>{lastCreated.name}</strong> (
          {lastCreated.email})
        </p>
      ) : null}

      <h2>Users ({users.length})</h2>
      {users.length === 0 ? (
        <p>No users found yet.</p>
      ) : (
        <ul>
          {users.map((user, index) => {
            const key = user._id ?? `${user.email}-${index}`;
            return (
              <li key={key}>
                {user.name} ({user.email})
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
```

```ts
// src/client.ts
import { httpClient } from "skypydb/httpclient";
import { api } from "../skypydb/deploy";
import { callread, callwrite } from "skypydb/serverside";

// Normalized user shape returned by this relational example.
export type UserRecord = {
  _id?: string;
  _created_at?: string;
  _updated_at?: string;
  name: string;
  email: string;
};

// Returns a string value or `undefined` for non-string inputs.
const asString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

// Coerces an unknown payload into a `UserRecord` when required fields exist.
function toUserRecord(value: unknown): UserRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const { name, email } = record;

  if (typeof name !== "string" || typeof email !== "string") {
    return null;
  }

  return {
    _id: asString(record._id),
    _created_at: asString(record._created_at),
    _updated_at: asString(record._updated_at),
    name,
    email,
  };
}

const client = httpClient({
  api_url: import.meta.env.VITE_SKYPYDB_API_URL,
  api_key: import.meta.env.VITE_SKYPYDB_API_KEY,
});

const readArgs = {
  name: "viewer",
  email: "viewer@example.com",
};

// Calls the public write function and returns the created user.
export async function createUser(args: { name: string; email: string }) {
  const result = await callwrite(api.users.createUser, client, args);
  return toUserRecord(result);
}

// Reads all users from the database and normalizes each entry.
export async function readUsers() {
  const result = await callread(api.read.readDatabase, client, readArgs);

  if (!Array.isArray(result)) {
    return [];
  }

  return result
    .map((entry) => toUserRecord(entry))
    .filter((entry): entry is UserRecord => entry !== null);
}

// Convenience helper used by examples to run one write and one read call.
export default function databaseclient() {
  const writer = createUser({
    name: "Theo",
    email: "theo@example.com",
  });

  const reader = readUsers();

  return { writer, reader };
}
```

## Upload functions

Write your upload functions here.
Look at https://docs.ahen-studio.com/upload/functions for more information.

A read function that read an image messages:

```ts
// skypydb/read.ts
import { readFunction, value } from "skypydb/functions";

// Read image messages for React pages.
export const readImageMessages = readFunction({
  handler: async (ctx) => {
    const messages = await ctx.db.read("messages").collect();
    return messages;
  },
});

// Resolve a storage id to a public file URL.
export const getImageUrl = readFunction({
  args: {
    storageId: value.id("_storage"),
  },

  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});
```

A write function that upload an image:

```ts
// skypydb/users.ts
import { writeFunction, value } from "skypydb/functions";

// Generate a one-time upload URL for binary file upload.
export const createUploadUrl = writeFunction({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.createUploadUrl();
  },
});

// Store an uploaded image by referencing its storage id.
export const sendImage = writeFunction({
  args: {
    storageId: value.id("_storage"),
    author: value.string(),
  },

  handler: async (ctx, args) => {
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    const message = {
      body: args.storageId,
      author: args.author,
      format: "image",
      imageUrl,
    };
    const id = await ctx.db.insert("messages", message);
    return await ctx.db.get("messages", id);
  },
});
```

Using these functions in a React component:

```ts
// src/client.tsx
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { httpClient } from "skypydb/httpclient";
import { api } from "../skypydb/deploy";
import { callread, callwrite } from "skypydb/serverside";

type ImageMessage = { _id: string; imageUrl: string; author: string };

// Returns a trimmed non-empty string, otherwise null.
function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

// Extracts a storage id from known upload response shapes.
function extractStorageId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const root = payload as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;

  return (
    asNonEmptyString(root.storageId) ??
    asNonEmptyString(root.storage_id) ??
    asNonEmptyString(data?.storageId) ??
    asNonEmptyString(data?.storage_id) ??
    null
  );
}

// Uploads a file to a storage URL and returns the created storage id.
async function uploadImage(postUrl: string, file: File): Promise<string> {
  const parsedUrl = new URL(postUrl, window.location.origin);
  const uploadToken = parsedUrl.hash.startsWith("#")
    ? parsedUrl.hash.slice(1).trim()
    : "";
  if (!uploadToken) {
    throw new Error("Upload URL did not include a one-time upload token.");
  }
  parsedUrl.hash = "";

  const result = await fetch(parsedUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": file.type,
      "X-Upload-Token": uploadToken,
    },
    body: file,
  });

  if (!result.ok) {
    const body = await result.text();
    throw new Error(`Upload failed (${result.status}): ${body}`);
  }

  let parsed: unknown;
  try {
    parsed = await result.json();
  } catch {
    throw new Error("Upload succeeded but response was not valid JSON.");
  }

  const storageId = extractStorageId(parsed);
  if (!storageId) {
    throw new Error("Upload response did not include a storage id.");
  }

  return storageId;
}

// Initialize the client outside of the component to avoid recreating it on every render.
const client = httpClient({
  api_url: import.meta.env.VITE_SKYPYDB_API_URL,
  api_key: import.meta.env.VITE_SKYPYDB_API_KEY,
});

export default function App() {
  const createUploadUrl = () =>
    callwrite(api.users.createUploadUrl, client, {});
  const [messages, setMessages] = useState<ImageMessage[]>([]);

  useEffect(() => {
    callread(api.read.readImageMessages, client, {}).then((list) =>
      setMessages(list as ImageMessage[]),
    );
  }, [client]);

  const imageInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));
  async function handleSendImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Get an upload URL
    const postUrl = await createUploadUrl();
    const storageId = await uploadImage(postUrl, selectedImage!);

    // Save the storage id to the database
    await callwrite(api.users.sendImage, client, { storageId, author: name });

    const list = (await callread(
      api.read.readImageMessages,
      client,
      {},
    )) as ImageMessage[];
    setMessages(list);

    setSelectedImage(null);
    imageInput.current!.value = "";
  }
  return (
    <form onSubmit={handleSendImage}>
      <input
        type="file"
        accept="image/*"
        ref={imageInput}
        onChange={(event) => setSelectedImage(event.target.files![0])}
        disabled={selectedImage !== null}
      />
      <input
        type="submit"
        value="Send Image"
        disabled={selectedImage === null}
      />
      <div>
        {messages.map((m) => (
          <img key={m._id} src={m.imageUrl} alt={m.author} />
        ))}
      </div>
    </form>
  );
}
```

Use the Skypydb CLI to push your functions to the server (cloud or self-hosted).
See everything the Skypydb CLI can do by running `npx skypydb --help` in your project root directory.
To learn more, see the docs at `https://docs.ahen-studio.com/`.
