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
    // Create a vector database
    const vectordb = await client.create_collection("my-videos");

    // Print the name of the created collection
    console.log(`Created collection: ${vectordb.name}`);
  } finally {
    // Close local resources
    await client.close();
  }
}
