import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { httpClient } from "skypydb/httpclient";
import { api } from "../skypydb/deploy";
import { callread, callwrite } from "skypydb/serverside";

type ImageMessage = { _id: string; imageUrl: string; author: string };

/**
 * Returns a trimmed non-empty string, otherwise null.
 */
function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

/**
 * Extracts a storage id from known upload response shapes.
 */
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

/**
 * Uploads a file to a storage URL and returns the created storage id.
 */
async function uploadImage(postUrl: string, file: File): Promise<string> {
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!result.ok) {
    const body = await result.text();
    throw new Error(`Upload failed (${result.status}): ${body}`);
  }

  const storageId = extractStorageId(await result.json());
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
