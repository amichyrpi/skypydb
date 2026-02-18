import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434"
    }
)

# Create a collection
vectordb = client.create_vecdb("my-videos")

# Add data to your vector database
vectordb.add(
    data=["Video Theo1", "Video Theo2"], # data to add
    metadatas=[{"source": "youtube"}, {"source": "dailymotion"}], # metadata to add to the data
    ids=["vid1", "vid2"] # unique ids for the data
)