# Ollama provider

import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434"
    }
)

# OpenAI provider

import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="openai",
    embedding_model_config={
        "api_key": "your-openai-api-key",
        "model": "text-embedding-3-small"
    }
)

# Sentence Transformers

import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="sentence-transformers",
    embedding_model_config={
        "model": "all-MiniLM-L6-v2"
    }
)