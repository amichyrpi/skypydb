import os

from mem0 import Memory

# Local mem0 config
config = {
    "vector_store": {
        "provider": "mesosphere",
        "config": {
            "collection_name": "memory",
            "api_url": os.getenv("MESOSPHERE_API_URL"),
            "api_key": os.getenv("MESOSPHERE_API_KEY"),
        },
    },
    "llm": {
        "provider": "ollama",
        "config": {
            "model": "llama3.1:latest",
            "temperature": 0.3,
            "max_tokens": 1024,
            "ollama_base_url": "http://localhost:11434",
        },
    },
    "embedder": {"provider": "ollama", "config": {"model": "mxbai-embed-large"}},
}

m = Memory.from_config(config)

# Add memories
m.add("I love Python programming", user_id="user1")
m.add("My favorite color is blue", user_id="user1")

# Search memories
results = m.search("What programming language do I like?", user_id="user1")

print(results)
