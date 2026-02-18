import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434"
    }
)

# Create a vector database
vectordb = client.create_collection("my-videos")