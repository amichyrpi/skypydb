import { vecClient } from "skypydb";

async function main(): Promise<void> {
  // Create a client
  const client = new vecClient({
    embedding_provider: "ollama",
    embedding_model_config: {
      model: "mxbai-embed-large",
      base_url: "http://localhost:11434"
    }
  });

  try {
    // Create a vector database or get it if it already exists
    const vectordb = await client.get_or_create_collection("my-videos");

    // Print the name of the vector database
    console.log(`Collection ready: ${vectordb.name}`);
  } finally {
    // Close local resources
    await client.close();
  }
}