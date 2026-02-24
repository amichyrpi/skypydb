import os

from mesosphere import HttpRelationalClient, api
from dotenv import load_dotenv

load_dotenv()

# Get the API URL and API key from the environment variables.
MESOSPHERE_API_URL = os.getenv("MESOSPHERE_API_URL")
MESOSPHERE_API_KEY = os.getenv("MESOSPHERE_API_KEY")

# Create a client to interact with the database.
client = HttpRelationalClient(
    api_url=MESOSPHERE_API_URL,
    api_key=MESOSPHERE_API_KEY,
)

# Create a writer to write to the database using the function defined in the mesosphere folder
writer = client.write(
    api.users.createUser, {"name": "Theo", "email": "theo@example.com"}
)

# Create a reader to read from the database using the function defined in the mesosphere folder
reader = client.read(
    api.read.readDatabase, {"name": "Theo", "email": "theo@example.com"}
)

print(writer, reader)
