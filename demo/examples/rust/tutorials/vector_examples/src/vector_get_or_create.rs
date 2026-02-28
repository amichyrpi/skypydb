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
}
