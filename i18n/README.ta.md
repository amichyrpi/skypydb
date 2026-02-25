<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>மெசோஸ்பியர்-பேக்கெண்ட் - ஓப்பன் சோர்ஸ் ரிலேஷனல் மற்றும் வெக்டர் எம்பெடிங்ஸ் டேட்டாபேஸ்</b>. <br />
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

## அம்சங்கள்

- தொடர்புடையது: உங்கள் செயல்பாடுகளை உருவாக்கி, உங்கள் தரவை தொடர்புடைய தரவுத்தளத்தில் சேமிக்கவும்.

- வெக்டர் உட்பொதிப்புகள்: வெக்டார் சேகரிப்புகளை உருவாக்குதல், தேடுதல் மற்றும் நீக்குதல்.

- கோப்பு சேமிப்பு: உங்கள் கோப்புகளை ஒரு தரவுத்தளத்தில் சேமிக்கவும்.

- நினைவகம்: [mem0](https://github.com/mem0ai/mem0) மற்றும் எங்கள் [integration](./demo/integration/mem0/) ஐப் பயன்படுத்தி LLMக்கு நினைவகத்தைச் சேர்க்கவும்.

- இலவச & திறந்த மூல: Apache 2.0 உரிமம் பெற்றது

- குறுக்கு-தளம்: விண்டோஸ், லினக்ஸ், மேகோஸ்

## HttpClients

### TypeScript

Mesosphere தரவுத்தளத்துடன் தொடர்புகொள்வதற்கு TypeScript கிளையண்டை வழங்குகிறது, நீங்கள் திசையன் உட்பொதித்தல் தரவுத்தளத்தையோ அல்லது தொடர்புடைய தரவுத்தளத்தையோ பயன்படுத்தலாம். திசையன் உட்பொதித்தல் தரவுத்தளத்தை எவ்வாறு பயன்படுத்துவது என்பதை முதலில் பார்ப்போம்.

#### வெக்டர் மாதிரி

உங்கள் திசையன் உட்பொதிவுகளை உருவாக்க, மரம் AI மாதிரிகள் வழங்குநரைப் பயன்படுத்தலாம்.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

இந்த டிஃபெரன்ட் வழங்குநரை எவ்வாறு பயன்படுத்துவது என்பதற்கான எடுத்துக்காட்டு இங்கே.

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

கிளையண்டை உருவாக்கிய பிறகு, தரவுத்தளத்துடன் தொடர்பு கொள்ள அதைப் பயன்படுத்தலாம்.

உங்கள் திசையன் தரவுத்தளத்தில் தரவைச் சேர்க்கவும்.

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

உங்கள் திசையன் தரவுத்தளத்திலிருந்து தரவை நீக்கவும்.

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

உங்கள் திசையன் தரவுத்தளத்திலிருந்து தரவை வினவவும்.

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

#### உறவுமுறை

எடுத்துக்காட்டாக தொடர்புடைய அம்சங்களைப் பயன்படுத்த, [examples](./demo/examples/js/relational_examples/) கோப்புறையைப் பார்க்கவும்.

எடுத்துக்காட்டாக, கோப்பு சேமிப்பக அம்சங்களைப் பயன்படுத்த, [examples](./demo/examples/js/files_upload_examples/) கோப்புறையைப் பார்க்கவும்.

எங்கள் [Docs](https://docs.ahen-studio.com/) இல் மேலும் அறிக

### Python

மெசோஸ்பியர் தரவுத்தளத்துடன் தொடர்புகொள்வதற்கு Python கிளையண்டை வழங்குகிறது, நீங்கள் திசையன் உட்பொதித்தல் தரவுத்தளத்தையோ அல்லது தொடர்புடைய தரவுத்தளத்தையோ பயன்படுத்தலாம். திசையன் உட்பொதித்தல் தரவுத்தளத்தை எவ்வாறு பயன்படுத்துவது என்பதை முதலில் பார்ப்போம்.

#### வெக்டர் மாதிரி

உங்கள் திசையன் உட்பொதிவுகளை உருவாக்க, மரம் AI மாதிரிகள் வழங்குநரைப் பயன்படுத்தலாம்.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

இந்த டிஃபெரன்ட் வழங்குநரை எவ்வாறு பயன்படுத்துவது என்பதற்கான எடுத்துக்காட்டு இங்கே.

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

கிளையண்டை உருவாக்கிய பிறகு, தரவுத்தளத்துடன் தொடர்பு கொள்ள அதைப் பயன்படுத்தலாம்.

உங்கள் திசையன் தரவுத்தளத்தில் தரவைச் சேர்க்கவும்.

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

உங்கள் திசையன் தரவுத்தளத்திலிருந்து தரவை நீக்கவும்.

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

உங்கள் திசையன் தரவுத்தளத்திலிருந்து தரவை வினவவும்.

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

#### உறவுமுறை

எடுத்துக்காட்டாக தொடர்புடைய அம்சங்களைப் பயன்படுத்த, [examples](./demo/examples/python/relational_examples/) கோப்புறையைப் பார்க்கவும்.

இப்போது பைதான் கிளையன்ட் கோப்பு சேமிப்பக அம்சத்தை ஆதரிக்கவில்லை.

#### ஒருங்கிணைப்பு

Python கிளையன்ட் [mem0](https://github.com/mem0ai/mem0) மற்றும் எங்கள் [integration](./demo/integration/mem0/) ஐப் பயன்படுத்தி AIக்கு நினைவகத்தைச் சேர்க்கும் திறனை வழங்குகிறது.

எங்கள் [Docs](https://docs.ahen-studio.com/) இல் மேலும் அறிக

## எங்கள் பங்களிப்பாளர்களுக்கு நன்றி:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## உரிமம்

[Apache 2.0](./LICENSE)