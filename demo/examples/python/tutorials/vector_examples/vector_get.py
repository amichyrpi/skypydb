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

# Get an existing vector database
vectordb = client.get_collection("my-videos")
