import asyncio
import skypydb


async def main() -> None:
    # Create an async client.
    client = skypydb.AsyncHttpClient(
        api_url="http://localhost:8000",
        api_key="local-dev-key",
        embedding_provider="ollama",
        embedding_model_config={
            "model": "mxbai-embed-large",
            "base_url": "http://localhost:11434",
        },
    )

    # Create a vector database or get it if it already exists
    vectordb = await client.get_or_create_collection("my-videos")

    # Add data to your vector database.
    await vectordb.add(
        documents=["Video Theo1", "Video Theo2"],
        metadatas=[{"source": "youtube"}, {"source": "dailymotion"}],
        ids=["vid1", "vid2"],
    )

    await client.close()


if __name__ == "__main__":
    asyncio.run(main())
