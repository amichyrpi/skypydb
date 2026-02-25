<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - Open Source Relational සහ Vector Embeddings Database</b>. <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)](https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)](https://docs.ahen-studio.com/)

</div>

```bash
pip install mesosphere # python database
```

```bash
npm install mesosphere # typescript client
```

## විශේෂාංග

- Relational: ඔබගේ කාර්යයන් නිර්මාණය කර ඔබගේ දත්ත සම්බන්ධතා දත්ත ගබඩාවක ගබඩා කරන්න.

- දෛශික කාවැද්දීම: දෛශික එකතු කිරීම් සාදන්න, සොයන්න සහ මකන්න.

- ගොනු ගබඩාව: ඔබගේ ගොනු දත්ත ගබඩාවක ගබඩා කරන්න.

- මතකය: [mem0](https://github.com/mem0ai/mem0) සහ අපගේ [integration](./demo/integration/mem0/) භාවිතා කිරීමෙන් LLM එකකට මතකය එක් කරන්න.

- නිදහස් සහ විවෘත මූලාශ්‍රය: Apache 2.0 බලපත්‍රලාභී

- හරස් වේදිකාව: Windows, Linux, MacOS

## HttpClients

### TypeScript

Mesosphere දත්ත සමුදාය සමඟ අන්තර්ක්‍රියා කිරීම සඳහා TypeScript සේවාලාභියෙකු ලබා දෙයි, ඔබට දෛශික කාවැද්දීමේ දත්ත සමුදාය හෝ සම්බන්ධතා දත්ත සමුදාය භාවිතා කළ හැක. අපි මුලින්ම බලමු දෛශික කාවැද්දීම් දත්ත සමුදාය භාවිතා කරන්නේ කෙසේද කියා.

#### දෛශික ආකෘතිය

ඔබේ දෛශික කාවැද්දීම සෑදීමට ඔබට ගස් AI ආකෘති සපයන්නා භාවිතා කළ හැකිය.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

මෙන්න මෙම deferent සපයන්නා භාවිතා කරන ආකාරය පිළිබඳ උදාහරණයක්.

```ts
import { httpClient } from "mesosphere";

// Sentence Transformers provider

// Create a client
async function use_sentence_transformers_provider(): Promise<void> {
  const client = httpClient({
    api_url: "http://localhost:8000",
    api_key: "local-dev-key",
    embedding_provider: "sentence-transformers",
    embedding_model_config: {
      model: "all-MiniLM-L6-v2",
    },
  });
}
```

```ts
import { httpClient } from "mesosphere";

// Ollama provider

// Create a client
async function use_ollama_provider(): Promise<void> {
  const client = httpClient({
    api_url: "http://localhost:8000",
    api_key: "local-dev-key",
    embedding_provider: "ollama",
    embedding_model_config: {
      model: "mxbai-embed-large",
      base_url: "http://localhost:11434",
    },
  });
}
```

```ts
import { httpClient } from "mesosphere";

// OpenAI provider

// Create a client
async function use_openai_provider(): Promise<void> {
  const client = httpClient({
    api_url: "http://localhost:8000",
    api_key: "local-dev-key",
    embedding_provider: "openai",
    embedding_model_config: {
      api_key: "your-openai-api-key",
      model: "text-embedding-3-small",
    },
  });
}
```

සේවාලාභියා නිර්මාණය කිරීමෙන් පසු, දත්ත සමුදාය සමඟ අන්තර් ක්රියා කිරීමට ඔබට එය භාවිතා කළ හැකිය.

ඔබගේ දෛශික දත්ත ගබඩාවට දත්ත එක් කරන්න.

```ts
  try {
    // Create a vector database or get it if it already exists
    const vectordb = await client.get_or_create_collection("my-videos");

    // Add data to your vector database
    await vectordb.add({
      data: ["Video Theo1", "Video Theo2"], // data to add
      metadatas: [{ source: "youtube" }, { source: "dailymotion" }], // metadata to add to the data
      ids: ["vid1", "vid2"], // unique ids for the data
    });
  } finally {
    // Close local resources
    await client.close();
  }
}
```

ඔබගේ දෛශික දත්ත ගබඩාවෙන් දත්ත මකන්න.

```ts
  try {
    // Create a vector database or get it if it already exists
    const vectordb = await client.get_or_create_collection("my-videos");

    // Firts add data to your vector database
    // Add data to your vector database
    await vectordb.add({
      data: ["Video Theo1", "Video Theo2"], // data to add
      metadatas: [{ source: "youtube" }, { source: "dailymotion" }], // metadata to add to the data
      ids: ["vid1", "vid2"], // unique ids for the data
    });

    // Delete data from your vector database
    await vectordb.delete({
      by_ids: ["vid1", "vid2"],
      // by_metadatas: [{ source: "youtube" }, { source: "dailymotion" }] // delete by metadatas
      // by_data: ["Video Theo1", "Video Theo2"] // delete by data
    });
  } finally {
    // Close local resources
    await client.close();
  }
}
```

ඔබගේ දෛශික දත්ත ගබඩාවෙන් දත්ත විමසන්න.

```ts
  try {
    // Create a vector database or get it if it already exists
    const vectordb = await client.get_or_create_collection("my-videos");

    // Firts add data to your vector database
    // Add data to your vector database
    await vectordb.add({
      data: ["Video Theo1", "Video Theo2"], // data to add
      metadatas: [{ source: "youtube" }, { source: "dailymotion" }], // metadata to add to the data
      ids: ["vid1", "vid2"], // unique ids for the data
    });

    // Query for similar data
    const results = await vectordb.query({
      query_texts: ["This is a query"],
      number_of_results: 2,
    });

    // Access results
    for (let index = 0; index < results.ids[0].length; index += 1) {
      const doc_id = results.ids[0][index];
      const document = results.documents?.[0]?.[index];
      const distance = results.distances?.[0]?.[index];
      console.log(`${doc_id}, ${document}, ${distance}`);
    }
  } finally {
    // Close local resources
    await client.close();
  }
}
```

#### සම්බන්ධක

උදාහරණයක් ලෙස සම්බන්ධතා විශේෂාංග භාවිතය සඳහා, [examples](./demo/examples/js/relational_examples/) ෆෝල්ඩරය පරීක්ෂා කරන්න.

උදාහරණයක් ලෙස ගොනු ගබඩා විශේෂාංග භාවිතය සඳහා, [examples](./demo/examples/js/files_upload_examples/) ෆෝල්ඩරය පරීක්ෂා කරන්න.

අපගේ [Docs](https://docs.ahen-studio.com/) මත තව දැනගන්න

### Python

Mesosphere දත්ත සමුදාය සමඟ අන්තර්ක්‍රියා කිරීම සඳහා Python සේවාලාභියෙකු ඉදිරිපත් කරයි, ඔබට දෛශික කාවැද්දීමේ දත්ත සමුදාය හෝ සම්බන්ධතා දත්ත සමුදාය භාවිතා කළ හැක. අපි මුලින්ම බලමු දෛශික කාවැද්දීම් දත්ත සමුදාය භාවිතා කරන්නේ කෙසේද කියා.

#### දෛශික ආකෘතිය

ඔබේ දෛශික කාවැද්දීම සෑදීමට ඔබට ගස් AI ආකෘති සපයන්නා භාවිතා කළ හැකිය.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

මෙන්න මෙම deferent සපයන්නා භාවිතා කරන ආකාරය පිළිබඳ උදාහරණයක්.

```python
# Sentence Transformers provider
import mesosphere

# Create a client
client = mesosphere.HttpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
    embedding_provider="sentence-transformers",
    embedding_model_config={"model": "all-MiniLM-L6-v2"},
)
```

```python
# Ollama provider
import mesosphere

# Create a client
client = mesosphere.HttpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
    embedding_provider="ollama",
    embedding_model_config={
        "model": "mxbai-embed-large",
        "base_url": "http://localhost:11434",
    },
)
```

```python
# OpenAI provider
import mesosphere

# Create a client
client = mesosphere.HttpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
    embedding_provider="openai",
    embedding_model_config={
        "api_key": "your-openai-api-key",
        "model": "text-embedding-3-small",
    },
)
```

සේවාලාභියා නිර්මාණය කිරීමෙන් පසු, දත්ත සමුදාය සමඟ අන්තර් ක්රියා කිරීමට ඔබට එය භාවිතා කළ හැකිය.

ඔබගේ දෛශික දත්ත ගබඩාවට දත්ත එක් කරන්න.

```python
# Create a vector database or get it if it already exists
vectordb = client.get_or_create_collection("my-videos")

# Add data to your vector database
vectordb.add(
    documents=["Video Theo1", "Video Theo2"],  # data to add
    metadatas=[
        {"source": "youtube"},
        {"source": "dailymotion"},
    ],  # metadata to add to the data
    ids=["vid1", "vid2"],  # unique ids for the data
)
```

ඔබගේ දෛශික දත්ත ගබඩාවෙන් දත්ත මකන්න.

```python
# Create a vector database or get it if it already exists
vectordb = client.get_or_create_collection("my-videos")

# Firts add data to your vector database
# Add data to your vector database
vectordb.add(
    documents=["Video Theo1", "Video Theo2"],  # data to add
    metadatas=[
        {"source": "youtube"},
        {"source": "dailymotion"},
    ],  # metadata to add to the data
    ids=["vid1", "vid2"],  # unique ids for the data
)

# Delete data from your vector database
vectordb.delete(
    ids=["vid1", "vid2"]  # delete by ids
    # where={"source": "youtube"} # delete by metadata
    # where_document={"$contains": "Video Theo1"} # delete by document text
)
```

ඔබගේ දෛශික දත්ත ගබඩාවෙන් දත්ත විමසන්න.

```python
# Create a vector database or get it if it already exists
vectordb = client.get_or_create_collection("my-videos")

# Firts add data to your vector database
# Add data to your vector database
vectordb.add(
    documents=["Video Theo1", "Video Theo2"],  # data to add
    metadatas=[
        {"source": "youtube"},
        {"source": "dailymotion"},
    ],  # metadata to add to the data
    ids=["vid1", "vid2"],  # unique ids for the data
)

# Query for similar data
results = vectordb.query(query_texts=["This is a query"], n_results=2)

# Access results
if not results:
    print("No results found.")
else:
    for i, doc_id in enumerate(results["ids"][0]):
        print(f"{doc_id}, {results['documents'][0][i]}, {results['distances'][0][i]}")
```

#### සම්බන්ධක

උදාහරණයක් ලෙස සම්බන්ධතා විශේෂාංග භාවිතය සඳහා, [examples](./demo/examples/python/relational_examples/) ෆෝල්ඩරය පරීක්ෂා කරන්න.

දැනට python සේවාදායකයා ගොනු ගබඩා කිරීමේ විශේෂාංගයට සහය නොදක්වයි.

#### ඒකාබද්ධ කිරීම

Python සේවාදායකයා ඔබට [mem0](https://github.com/mem0ai/mem0) සහ අපගේ [integration](./demo/integration/mem0/) භාවිතා කරමින් AI වෙත මතකය එක් කිරීමේ හැකියාව ලබා දෙයි.

අපගේ [Docs](https://docs.ahen-studio.com/) මත තව දැනගන්න

## අපගේ දායකයින්ට සියලුම ස්තූතියි:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## බලපත්‍රය

[Apache 2.0](./LICENSE)
