import { vecClient } from "skypydb-js";

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
    // Create a collection
    const vectordb = await client.create_collection("my-videos");

    // Add data to your vector database
    await vectordb.add({
      data: ["Video Theo1", "Video Theo2"], // data to add
      metadatas: [{ source: "youtube" }, { source: "dailymotion" }], // metadata to add to the data
      ids: ["vid1", "vid2"] // unique ids for the data
    });
  } finally {
    // Close local resources
    await client.close();
  }
}