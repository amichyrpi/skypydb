import { httpClient } from "mesosphere";

async function main(): Promise<void> {
  // Create a client.
  const client = httpClient({
    api_url: "https://ahen-studio.com/mesosphere",
    api_key: "your-api-key",
  });
  // You can also use a self-hosted server:
  // const client = httpClient({
  //   api_url: "http://localhost:8000",
  //   api_key: "local-dev-key",
  // });

  // Create a collection
  const vectordb = await client.create_collection("my-videos");
  // get_or_create_collection
  // get_collection

  // Add data to your vector database
  await vectordb.add({
    data: ["Video Theo1", "Video Theo2"], // data to add
    metadatas: [{ source: "youtube" }, { source: "dailymotion" }], // metadata to add to the data
    ids: ["vid1", "vid2"], // unique ids for the data
  });

  // Query for similar data
  const results = await vectordb.query({
    query_texts: ["This is a query"],
    number_of_results: 2,
  });

  // Access results
  for (let index = 0; index < results.ids[0].length; index += 1) {
    const doc_id = results.ids[0][index];
    const document = results.documents?.[0]?.[index];
    const distance = results.distances?.[0]?.[index];
    console.log(`${doc_id}, ${document}, ${distance}`);
  }
}
