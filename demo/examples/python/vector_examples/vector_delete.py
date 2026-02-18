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
vectordb = client.create_collection("my-videos")

# Firts add data to your vector database
# Add data to your vector database
vectordb.add(
    data=["Video Theo1", "Video Theo2"], # data to add
    metadatas=[{"source": "youtube"}, {"source": "dailymotion"}], # metadata to add to the data
    ids=["vid1", "vid2"] # unique ids for the data
)

# Delete data from your vector database
vectordb.delete(
    by_ids=["vid1", "vid2"] # delete by ids
    # by_metadatas=[{"source": "youtube"}, {"source": "dailymotion"}] # delete by metadatas
    # by_data=["Video Theo1", "Video Theo2"] # delete by data
)