import { SubmitEvent, useEffect, useRef, useState } from "react";
import { httpClient } from "skypydb/httpclient";
import { api } from "../skypydb/deploy";
import { callread, callwrite } from "skypydb/serverside";
import dotenv from "dotenv";

dotenv.config();

type ImageMessage = { _id: string; imageUrl: string; author: string };

export default function App() {
  const client = httpClient({
    api_url: process.env.SKYPYDB_API_URL ?? "http://localhost:8000",
    api_key: process.env.SKYPYDB_API_KEY ?? "local-dev-key",
  });

  const createUploadUrl = callwrite(api.users.createUploadUrl, client, {});
  const [messages, setMessages] = useState<ImageMessage[]>([]);

  useEffect(() => {
    callread(api.read.readImageMessages, client, {}).then((list) =>
      setMessages(list as ImageMessage[]),
    );
  }, [client]);

  const imageInput = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));
  async function handleSendImage(event: SubmitEvent) {
    event.preventDefault();

    // Get an upload URL
    const postUrl = await createUploadUrl;

    // POST the file to the URL
    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": selectedImage!.type },
      body: selectedImage,
    });
    const { storageId } = await result.json();

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
