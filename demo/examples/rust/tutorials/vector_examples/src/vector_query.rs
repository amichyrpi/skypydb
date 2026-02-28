use std::{collections::BTreeMap, env};

use mesosphere::MesosphereVectorClient;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    // load your mesosphere url and api key from the .env file
    let mesosphere_url = env::var("MESOSPHERE_URL").unwrap();
    let mesosphere_api_key = env::var("MESOSPHERE_API_KEY").unwrap();

    // Create a client to interact with the mesosphere server.
    let mut client = MesosphereVectorClient::new(
        &mesosphere_url,
        &mesosphere_api_key,
        &embedding_provider = "ollama",
        &embedding_model_config = maplit::btreemap! {
            "model": "mxbai-embed-large",
            "base_url": "http://localhost:11434",
        },
    )
    .await?;

    // Create a vector database or get it if it already exists
    let vectordb = client.get_or_create_collection("my-videos").await?;

    // Firts add data to your vector database
    // Add data to your vector database
    let mut data = vectordb
        .add(
            documents = maplit::btreemap! {
                "Video Theo1", "Video Theo2"
            },
            metadatas = maplit::btreemap! {
                {"source": "youtube"},
                {"source": "dailymotion"},
            },
            ids = maplit::btreemap! {
                "vid1", "vid2"
            },
        )
        .await?;

    // Query for similar data
    let mut result = vectordb
        .query(
            query_texts = maplit::btreemap! {
                "This is a query"
            },
            n_results = 2,
        )
        .await?;

    // Print the results
    println!("{result:#?}");
}
