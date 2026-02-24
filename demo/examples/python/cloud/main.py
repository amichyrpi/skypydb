import mesosphere

# Create a client
client = mesosphere.HttpClient(
    api_url="https://ahen-studio.com/mesosphere", api_key="your-api-key"
)
# you can also use the self-hosted server
# client = mesosphere.HttpClient(
#     api_url="http://localhost:8000",
#     api_key="local-dev-key"
# )

# Create a collection
vectordb = client.create_collection("my-videos")
# get_or_create_collection
# get_collection

# Add data to your vector database
vectordb.add(
    documents=["Video Theo1", "Video Theo2"],  # data to add
    metadatas=[
        {"source": "youtube"},
        {"source": "dailymotion"},
    ],  # metadata to add to the data
    ids=["vid1", "vid2"],  # unique ids for the data
)

# Query for similar data
results = vectordb.query(query_texts=["This is a query"], n_results=2)

# Access results
if not results:
    print("No results found.")
else:
    for i, doc_id in enumerate(results["ids"][0]):
        print(f"{doc_id}, {results['documents'][0][i]}, {results['distances'][0][i]}")
