import asyncio
import skypydb

async def main() -> None:
    # Create an async client.
    client = skypydb.AsyncvecClient(
        embedding_provider="ollama",
        embedding_model_config={
            "model": "mxbai-embed-large",
            "base_url": "http://localhost:11434",
        },
    )

    # Create a collection.
    vectordb = await client.create_collection("my-videos")

    # Add data to your vector database.
    await vectordb.add(
        data=["Video Theo1", "Video Theo2"],
        metadatas=[{"source": "youtube"}, {"source": "dailymotion"}],
        ids=["vid1", "vid2"],
    )

    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
