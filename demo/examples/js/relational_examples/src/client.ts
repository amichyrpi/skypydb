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

const api_url = import.meta.env.VITE_SKYPYDB_API_URL;
const api_key = import.meta.env.VITE_SKYPYDB_API_KEY;
const missing_env_vars = [
  typeof api_url === "string" && api_url.trim().length > 0
    ? null
    : "VITE_SKYPYDB_API_URL",
  typeof api_key === "string" && api_key.trim().length > 0
    ? null
    : "VITE_SKYPYDB_API_KEY",
].filter((value): value is string => value !== null);

if (missing_env_vars.length > 0) {
  throw new Error(
    `Missing required environment variable(s): ${missing_env_vars.join(", ")}`,
  );
}

const client = httpClient({
  api_url: api_url.trim(),
  api_key: api_key.trim(),
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

  const reader = writer.then(() => readUsers());

  return { writer, reader };
}
