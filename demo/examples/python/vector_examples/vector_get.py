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

# Get an existing vector database
vectordb = client.get_collection("my-videos")