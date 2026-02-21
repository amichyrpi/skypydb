# Ollama provider
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

# OpenAI provider
import skypydb

# Create a client
client = skypydb.httpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
    embedding_provider="openai",
    embedding_model_config={
        "api_key": "your-openai-api-key",
        "model": "text-embedding-3-small"
    }
)

# Sentence Transformers provider
import skypydb

# Create a client
client = skypydb.httpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
    embedding_provider="sentence-transformers",
    embedding_model_config={
        "model": "all-MiniLM-L6-v2"
    }
)