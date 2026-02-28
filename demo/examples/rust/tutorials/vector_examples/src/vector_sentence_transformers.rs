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
        &embedding_provider = "sentence-transformers",
        &embedding_model_config = maplit::btreemap! {
            "model": "all-MiniLM-L6-v2"
        },
    )
    .await?;

    // Create a vector database or get it if it already exists
    let vectordb = client.get_or_create_collection("my-videos").await?;

    // Add a task to the database with a task name and a boolean to indicate if it succeed or not.
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
}
