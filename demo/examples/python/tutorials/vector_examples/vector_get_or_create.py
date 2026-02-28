import os
from mesosphere import MesosphereVectorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
MESOSPHERE_URL = os.getenv("MESOSPHERE_URL")
MESOSPHERE_API_KEY = os.getenv("MESOSPHERE_API_KEY")

# Create a client
client = MesosphereVectorClient(
    api_url=MESOSPHERE_URL,
    api_key=MESOSPHERE_API_KEY,
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434",
    },
)

# Create a vector database or get it if it already exists
vectordb = client.get_or_create_collection("my-videos")
