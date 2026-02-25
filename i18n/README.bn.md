<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-ব্যাকেন্ড - ওপেন সোর্স রিলেশনাল এবং ভেক্টর এমবেডিংস ডাটাবেস</b>। <br />
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

## বৈশিষ্ট্য

- রিলেশনাল: আপনার ফাংশন তৈরি করুন এবং আপনার ডেটা একটি রিলেশনাল ডাটাবেসে সংরক্ষণ করুন।

- ভেক্টর এম্বেডিং: ভেক্টর সংগ্রহ তৈরি করুন, অনুসন্ধান করুন এবং মুছুন।

- ফাইল স্টোরেজ: একটি ডাটাবেসে আপনার ফাইল সংরক্ষণ করুন।

- মেমরি: [mem0](https://github.com/mem0ai/mem0) এবং আমাদের [integration](./demo/integration/mem0/) ব্যবহার করে এলএলএম-এ মেমরি যোগ করুন।

- বিনামূল্যে এবং উন্মুক্ত উৎস: Apache 2.0 লাইসেন্সপ্রাপ্ত

- ক্রস-প্ল্যাটফর্ম: উইন্ডোজ, লিনাক্স, ম্যাকওএস

## Http ক্লায়েন্ট

### TypeScript

ডাটাবেসের সাথে ইন্টারঅ্যাক্ট করার জন্য মেসোস্ফিয়ার একটি TypeScript ক্লায়েন্ট অফার করে, আপনি ভেক্টর এমবেডিং ডাটাবেস বা রিলেশনাল ডাটাবেস ব্যবহার করতে পারেন। আমরা প্রথমে দেখব কিভাবে ভেক্টর এমবেডিং ডাটাবেস ব্যবহার করতে হয়।

#### ভেক্টর মডেল

আপনি আপনার ভেক্টর এমবেডিং তৈরি করতে ট্রি এআই মডেল প্রদানকারী ব্যবহার করতে পারেন।

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

এই deferent প্রদানকারী কিভাবে ব্যবহার করতে এখানে একটি উদাহরণ.

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

ক্লায়েন্ট তৈরি করার পরে, আপনি ডাটাবেসের সাথে ইন্টারঅ্যাক্ট করতে এটি ব্যবহার করতে পারেন।

আপনার ভেক্টর ডাটাবেসে ডেটা যোগ করুন।

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

আপনার ভেক্টর ডাটাবেস থেকে ডেটা মুছুন।

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

আপনার ভেক্টর ডাটাবেস থেকে তথ্য অনুসন্ধান করুন।

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

#### সম্পর্কীয়

উদাহরণের জন্য রিলেশনাল ফিচারের ব্যবহার, [examples](./demo/examples/js/relational_examples/) ফোল্ডারটি দেখুন।

ফাইল স্টোরেজ বৈশিষ্ট্যগুলির উদাহরণের জন্য, [examples](./demo/examples/js/files_upload_examples/) ফোল্ডারটি দেখুন।

আমাদের [Docs](https://docs.ahen-studio.com/) এ আরও জানুন

### Python

ডাটাবেসের সাথে ইন্টারঅ্যাক্ট করার জন্য মেসোস্ফিয়ার একটি Python ক্লায়েন্ট অফার করে, আপনি ভেক্টর এমবেডিং ডাটাবেস বা রিলেশনাল ডাটাবেস ব্যবহার করতে পারেন। আমরা প্রথমে দেখব কিভাবে ভেক্টর এমবেডিং ডাটাবেস ব্যবহার করতে হয়।

#### ভেক্টর মডেল

আপনি আপনার ভেক্টর এমবেডিং তৈরি করতে ট্রি এআই মডেল প্রদানকারী ব্যবহার করতে পারেন।

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

এই deferent প্রদানকারী কিভাবে ব্যবহার করতে এখানে একটি উদাহরণ.

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

ক্লায়েন্ট তৈরি করার পরে, আপনি ডাটাবেসের সাথে ইন্টারঅ্যাক্ট করতে এটি ব্যবহার করতে পারেন।

আপনার ভেক্টর ডাটাবেসে ডেটা যোগ করুন।

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

আপনার ভেক্টর ডাটাবেস থেকে ডেটা মুছুন।

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

আপনার ভেক্টর ডাটাবেস থেকে তথ্য অনুসন্ধান করুন।

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

#### সম্পর্কীয়

উদাহরণের জন্য রিলেশনাল ফিচারের ব্যবহার, [examples](./demo/examples/python/relational_examples/) ফোল্ডারটি দেখুন।

আপাতত পাইথন ক্লায়েন্ট ফাইল স্টোরেজ বৈশিষ্ট্য সমর্থন করে না।

#### ইন্টিগ্রেশন

Python ক্লায়েন্ট আপনাকে [mem0](https://github.com/mem0ai/mem0) এবং আমাদের [integration](./demo/integration/mem0/) ব্যবহার করে একটি AI-তে মেমরি যোগ করার ক্ষমতা প্রদান করে।

আমাদের [Docs](https://docs.ahen-studio.com/) এ আরও জানুন

## আমাদের অবদানকারীদের সমস্ত ধন্যবাদ:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## লাইসেন্স

[Apache 2.0](./LICENSE)