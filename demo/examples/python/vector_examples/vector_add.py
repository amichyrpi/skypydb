import skypydb

# Create a client
client = skypydb.httpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434"
    }
)

# Create a vector database or get it if it already exists
vectordb = client.get_or_create_collection("my-videos")

# Remove prior demo rows so this script can be rerun safely.
vectordb.delete(ids=["vid1", "vid2"])

# Add data to your vector database
vectordb.add(
    data=["Video Theo1", "Video Theo2"], # data to add
    metadatas=[{"source": "youtube"}, {"source": "dailymotion"}], # metadata to add to the data
    ids=["vid1", "vid2"] # unique ids for the data
)