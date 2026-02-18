import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434"
    }
)

# Create a vector database or get it if it already exists
vectordb = client.get_or_create_vecdb("my-videos")