import os

from mesosphere import MesosphereClient
from dotenv import load_dotenv

# load your mesosphere url and api key from the .env file
load_dotenv()
MESOSPHERE_URL = os.getenv("MESOSPHERE_URL")
MESOSPHERE_API_KEY = os.getenv("MESOSPHERE_API_KEY")

# Create a client to interact with the mesosphere server.
client = MesosphereClient(MESOSPHERE_URL, MESOSPHERE_API_KEY)

# Add a task to the database with a task name and a boolean to indicate if it succeed or not.
client.write("tasks:newtask", {"task": "task1", "succeed": True})

# Read all tasks from the database and print them.
task = client.read("tasks:readtask")

for tasks in task:
    print(tasks)
