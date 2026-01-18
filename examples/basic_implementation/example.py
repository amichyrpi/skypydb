import skypydb
from datetime import datetime

# setup skypydb client.
client = skypydb.Client(path="./data/skypy.db")

# Create table. get_table, delete_table are also available.
table = client.create_table("all-my-documents")

# Add docs to the table.
table.add(
    documents=[
        {
            "user_id": None,
            "message": "this is a document",
            "details": None,
            "creationtime": datetime.now().isoformat()
        }
    ]
)

# Query/search results. You can also .get by the id of the document
results = table.query(
    query_texts=["This is a document"],
    n_results=1,
)