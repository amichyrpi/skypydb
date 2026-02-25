import { FormEvent, useEffect, useRef, useState } from "react";
import { httpClient } from "mesosphere/httpclient";
import { callread, callwrite } from "mesosphere/serverside";
import { api } from "../mesosphere/deploy";

type ChatMessage = {
  _id: string;
  author: string;
  body: string;
  format: "text" | "image";
  imageUrl: string | null;
  _created_at: string | null;
};

const api_url = import.meta.env.VITE_MESOSPHERE_API_URL;
const api_key = import.meta.env.VITE_MESOSPHERE_API_KEY;

const client = httpClient({
  api_url,
  api_key,
});

// Returns a trimmed string when the input is a non-empty string.
function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

// Returns a finite number when the input is a valid number.
function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Converts an unknown database payload into a normalized chat message.
function normalizeMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const id = asNonEmptyString(record._id);
  if (!id) {
    return null;
  }

  const created_at_from_iso = asNonEmptyString(record._created_at);
  const created_at_from_epoch = asNumber(record._creationTime);
  const created_at =
    created_at_from_iso ??
    (created_at_from_epoch
      ? new Date(created_at_from_epoch).toISOString()
      : null);

  const author = asNonEmptyString(record.author) ?? "Unknown";
  const imageUrl = asNonEmptyString(record.imageUrl);
  const format =
    asNonEmptyString(record.format) === "image" || imageUrl ? "image" : "text";
  const body =
    asNonEmptyString(record.body) ??
    (format === "image" ? "Sent an image" : "");

  return {
    _id: id,
    author,
    body,
    format,
    imageUrl,
    _created_at: created_at,
  };
}

// Converts an unknown list payload into sorted chat messages.
function normalizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => normalizeMessage(entry))
    .filter((entry): entry is ChatMessage => entry !== null)
    .sort((left, right) => {
      const left_time = left._created_at ? Date.parse(left._created_at) : 0;
      const right_time = right._created_at ? Date.parse(right._created_at) : 0;
      return left_time - right_time;
    });
}

// Adds or replaces one message in the current state while preserving order.
function upsertMessage(
  current: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  const existing_index = current.findIndex(
    (message) => message._id === incoming._id,
  );

  const next =
    existing_index >= 0
      ? current.map((message, index) =>
          index === existing_index ? incoming : message,
        )
      : [...current, incoming];

  return [...next].sort((left, right) => {
    const left_time = left._created_at ? Date.parse(left._created_at) : 0;
    const right_time = right._created_at ? Date.parse(right._created_at) : 0;
    return left_time - right_time;
  });
}

// Extracts a storage id from accepted upload response shapes.
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

// Uploads an image file with a one-time upload URL and returns its storage id.
async function uploadImage(postUrl: string, file: File): Promise<string> {
  const parsedUrl = new URL(postUrl, window.location.origin);
  const uploadToken = parsedUrl.hash.startsWith("#")
    ? parsedUrl.hash.slice(1).trim()
    : "";

  if (!uploadToken) {
    throw new Error("Upload URL did not include a one-time upload token.");
  }

  parsedUrl.hash = "";

  const response = await fetch(parsedUrl.toString(), {
    method: "POST",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "X-Upload-Token": uploadToken,
    },
    body: file,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Upload failed (${response.status}): ${body}`);
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    throw new Error("Upload succeeded but response was not valid JSON.");
  }

  const storageId = extractStorageId(parsed);
  if (!storageId) {
    throw new Error("Upload response did not include a storage id.");
  }

  return storageId;
}

// Formats a message timestamp into the local time string for display.
function formatMessageTime(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleTimeString();
}

type StreamEventPayload = Record<string, unknown> | null;

// Opens a server-sent events stream and invokes a callback for each event.
async function streamFunctionEvents(
  signal: AbortSignal,
  onEvent: (eventName: string, payload: StreamEventPayload) => void,
): Promise<void> {
  const response = await fetch(`${api_url}/v1/functions/stream`, {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
      "X-API-Key": api_key,
    },
    signal,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to connect stream (${response.status}): ${body}`);
  }

  if (!response.body) {
    throw new Error("Function stream response did not include a body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!signal.aborted) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

    let event_boundary = buffer.indexOf("\n\n");
    while (event_boundary >= 0) {
      const raw_event = buffer.slice(0, event_boundary).trim();
      buffer = buffer.slice(event_boundary + 2);

      if (raw_event.length > 0) {
        let event_name = "message";
        const data_lines: string[] = [];

        for (const line of raw_event.split("\n")) {
          if (line.startsWith(":")) {
            continue;
          }
          if (line.startsWith("event:")) {
            event_name = line.slice("event:".length).trim();
            continue;
          }
          if (line.startsWith("data:")) {
            data_lines.push(line.slice("data:".length).trimStart());
          }
        }

        const data_text = data_lines.join("\n");
        let payload: StreamEventPayload = null;
        if (data_text.length > 0) {
          try {
            const parsed = JSON.parse(data_text) as unknown;
            if (parsed && typeof parsed === "object") {
              payload = parsed as Record<string, unknown>;
            }
          } catch {
            payload = null;
          }
        }

        onEvent(event_name, payload);
      }

      event_boundary = buffer.indexOf("\n\n");
    }
  }
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingText, setSendingText] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);

  // Reads the full chat history from the backend and updates local state.
  async function refreshMessages() {
    const result = await callread(api.messages.list, client, {});
    setMessages(normalizeMessages(result));
  }

  useEffect(() => {
    let is_active = true;
    const stream_abort_controller = new AbortController();
    let reconnect_timer: number | null = null;

    const startStream = async () => {
      try {
        await streamFunctionEvents(
          stream_abort_controller.signal,
          (event_name, payload) => {
            if (!is_active || event_name !== "function.call.completed") {
              return;
            }

            const endpoint = payload
              ? asNonEmptyString(payload.endpoint)
              : null;
            if (!endpoint || !endpoint.startsWith("messages.")) {
              return;
            }
            if (endpoint === "messages.createUploadUrl") {
              return;
            }

            const event_result = payload ? payload.result : undefined;
            const pushed_message = normalizeMessage(event_result);
            if (pushed_message) {
              setMessages((previous) =>
                upsertMessage(previous, pushed_message),
              );
              return;
            }

            void refreshMessages().catch((err) => {
              if (!is_active) {
                return;
              }
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to load chat messages.",
              );
            });
          },
        );
      } catch (err) {
        if (stream_abort_controller.signal.aborted || !is_active) {
          return;
        }

        setError(
          err instanceof Error ? err.message : "Chat stream disconnected.",
        );
      }

      if (is_active && !stream_abort_controller.signal.aborted) {
        reconnect_timer = window.setTimeout(() => {
          void startStream();
        }, 1000);
      }
    };

    void refreshMessages().catch((err) => {
      if (!is_active) {
        return;
      }
      setError(
        err instanceof Error ? err.message : "Failed to load chat messages.",
      );
    });
    void startStream();

    return () => {
      is_active = false;
      stream_abort_controller.abort();
      if (reconnect_timer !== null) {
        window.clearTimeout(reconnect_timer);
      }
    };
  }, []);

  // Sends a text message through the backend write function.
  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = newMessageText.trim();
    if (!body || sendingText) {
      return;
    }

    setSendingText(true);
    setError(null);

    try {
      await callwrite(api.messages.send, client, {
        body,
        author: name,
      });
      setNewMessageText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send chat message.",
      );
    } finally {
      setSendingText(false);
    }
  }

  // Uploads an image and sends the created storage reference as a message.
  async function handleSendImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedImage || sendingImage) {
      return;
    }

    setSendingImage(true);
    setError(null);

    try {
      const uploadUrl = await callwrite(
        api.messages.createUploadUrl,
        client,
        {},
      );
      if (typeof uploadUrl !== "string" || uploadUrl.trim().length === 0) {
        throw new Error("Invalid upload URL returned by createUploadUrl.");
      }

      const storageId = await uploadImage(uploadUrl, selectedImage);
      await callwrite(api.messages.sendImage, client, {
        storageId,
        author: name,
      });

      setSelectedImage(null);
      if (imageInput.current) {
        imageInput.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send image message.",
      );
    } finally {
      setSendingImage(false);
    }
  }

  return (
    <main>
      <h1>Mesosphere Chat</h1>
      <p className="badge">
        <span>{name}</span>
      </p>

      {error ? (
        <p style={{ color: "#b00020", textAlign: "center" }}>{error}</p>
      ) : null}

      <ul>
        {messages.map((message) => (
          <li key={message._id}>
            <span>{message.author}:</span>
            <span>
              {message.format === "image" && message.imageUrl ? (
                <img
                  src={message.imageUrl}
                  alt={`${message.author}'s upload`}
                  style={{
                    maxHeight: "160px",
                    maxWidth: "220px",
                    borderRadius: "8px",
                    display: "block",
                  }}
                />
              ) : (
                message.body
              )}
            </span>
            <span>{formatMessageTime(message._created_at)}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSendMessage}>
        <input
          value={newMessageText}
          onChange={(event) => setNewMessageText(event.target.value)}
          placeholder="Write a message..."
          disabled={sendingText}
        />
        <input
          type="submit"
          value={sendingText ? "Sending..." : "Send"}
          disabled={!newMessageText.trim() || sendingText}
        />
      </form>

      <form onSubmit={handleSendImage} style={{ marginTop: "8px" }}>
        <input
          type="file"
          accept="image/*"
          ref={imageInput}
          onChange={(event) =>
            setSelectedImage(event.target.files?.[0] ?? null)
          }
          disabled={sendingImage}
        />
        <button type="submit" disabled={!selectedImage || sendingImage}>
          {sendingImage ? "Uploading..." : "Send Image"}
        </button>
      </form>
    </main>
  );
}
