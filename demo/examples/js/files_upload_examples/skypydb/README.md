# Skypydb functions directory

Write your upload functions here.
Look at https://docs.ahen-studio.com/upload/functions for more information.

A read function that read an image messages:

```ts
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
```

Use the Skypydb CLI to push your functions to the server (cloud or self-hosted).
See everything the Skypydb CLI can do by running `npx skypydb --help` in your project root directory.
To learn more, see the docs at `https://docs.ahen-studio.com/`.
