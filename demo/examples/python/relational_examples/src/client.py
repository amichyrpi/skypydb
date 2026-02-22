import os

from skypydb import HttpRelationalClient
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

# Create a writer to write to the database using the function define in the skypydb folder
writer = client.write("users:createUser", {"name": "Theo", "email": "theo@example.com"})

# Create a reader to read from the database using the function define in the skypydb folder
reader = client.read("read:readDatabase", {"name": "Theo", "email": "theo@example.com"})

print(writer, reader)
