import { MesosphereClient } from "mesosphere";

async function main(): Promise<void> {
  // Create a client
  const client = MesosphereClient({
    api_url: "http://localhost:8000",
    api_key: "local-dev-key",
    embedding_provider: "ollama",
    embedding_model_config: {
      model: "mxbai-embed-large",
      base_url: "http://localhost:11434",
    },
  });

  try {
    // Get an existing vector database.
    const vectordb = await client.get_collection("my-videos");

    // Print the name of the vector database.
    console.log(`Loaded collection: ${vectordb.name}`);
  } finally {
    // Close local resources
    await client.close();
  }
}
