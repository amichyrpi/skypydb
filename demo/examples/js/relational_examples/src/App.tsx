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
      try {
        const created = await createUser(form);
        setLastCreated(created);
        setForm(initialForm);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create user.");
        return;
      }

      try {
        const list = await readUsers();
        setUsers(list);
      } catch (err) {
        console.error(err);
        setError("Failed to load users.");
      }
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
      <h1>SkyPyDB Relational Example</h1>
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
