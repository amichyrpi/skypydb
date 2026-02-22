import { httpClient } from "skypydb/httpclient";
import { api } from "../skypydb/deploy";
import { callread, callwrite } from "skypydb/serverside";
import { dotenv } from "dotenv";

dotenv.config();

export default function databaseclient() {
  // Create a client to interact with the database.
  const client = httpClient({
    api_url: process.env.SKYPYDB_API_URL,
    api_key: process.env.SKYPYDB_API_KEY,
  });

  // Create a writer to write to the database using the function define in the skypydb folder
  const writer = callwrite(api.users.createUser, client, {
    name: "Theo",
    email: "theo@example.com",
  });

  // Create a reader to read from the database using the function define in the skypydb folder
  const reader = callread(api.read.readDatabase, client, {
    name: "Theo",
    email: "theo@example.com",
  });

  return { writer, reader };
}
