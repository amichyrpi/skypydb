import skypydb

# Create a client
client = skypydb.vecClient(
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434"
    }
)

# Create a collection
vectordb = client.create_collection("my-videos")

# Firts add data to your vector database
# Add data to your vector database
vectordb.add(
    data=["Video Theo1", "Video Theo2"], # data to add
    metadatas=[{"source": "youtube"}, {"source": "dailymotion"}], # metadata to add to the data
    ids=["vid1", "vid2"] # unique ids for the data
)

# Query for similar data
results = vectordb.query(
    query_texts=["This is a query"],
    number_of_results=2
)

# Access results
if not results:
    print("No results found.")
else:
    for i, doc_id in enumerate(results["ids"][0]):
        print(f"{doc_id}, {results['documents'][0][i]}, {results['distances'][0][i]}")