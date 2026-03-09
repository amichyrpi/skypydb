use std::{collections::BTreeMap, env};

use mesosphere::MesosphereClient;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    // load your mesosphere url and api key from the .env file
    let mesosphere_url = env::var("MESOSPHERE_URL").unwrap();
    let mesosphere_api_key = env::var("MESOSPHERE_API_KEY").unwrap();

    // Create a client to interact with the mesosphere server.
    let mut client = MesosphereClient::new(&mesosphere_url, &mesosphere_api_key).await?;

    // Add a task to the database with a task name and a boolean to indicate if it succeed or not.
    let data = client
        .write(
            "tasks:newtask",
            maplit::btreemap! {
                "task".into() => "task1".into(),
                "succeed".into() => True.into(),
            },
        )
        .await?;

    // Read all tasks from the database and print them.
    let result = client.read("tasks:readtask", maplit::btreemap! {}).await?;
    println!("{result:#?}");
}
