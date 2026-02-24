import os

from skypydb import HttpRelationalClient, api
from dotenv import load_dotenv

load_dotenv()

# Get the API URL and API key from the environment variables.
SKYPYDB_API_URL = os.getenv("SKYPYDB_API_URL")
SKYPYDB_API_KEY = os.getenv("SKYPYDB_API_KEY")

# Create a client to interact with the database.
client = HttpRelationalClient(
    api_url=SKYPYDB_API_URL,
    api_key=SKYPYDB_API_KEY,
)

# Create a writer to write to the database using the function defined in the skypydb folder
writer = client.write(
    api.users.createUser, {"name": "Theo", "email": "theo@example.com"}
)

# Create a reader to read from the database using the function defined in the skypydb folder
reader = client.read(
    api.read.readDatabase, {"name": "Theo", "email": "theo@example.com"}
)

print(writer, reader)
