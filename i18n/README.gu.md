<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>મેસોસ્ફિયર-બેકએન્ડ - ઓપન સોર્સ રિલેશનલ અને વેક્ટર એમ્બેડિંગ્સ ડેટાબેઝ</b>. <br />
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

## સુવિધાઓ

- રિલેશનલ: તમારા કાર્યો બનાવો અને તમારા ડેટાને રિલેશનલ ડેટાબેઝમાં સ્ટોર કરો.

- વેક્ટર એમ્બેડિંગ્સ: વેક્ટર સંગ્રહો બનાવો, શોધો અને કાઢી નાખો.

- ફાઇલ સ્ટોરેજ: તમારી ફાઇલોને ડેટાબેઝમાં સ્ટોર કરો.

- મેમરી: [mem0](https://github.com/mem0ai/mem0) અને અમારા [integration](./demo/integration/mem0/)નો ઉપયોગ કરીને એલએલએમમાં ​​મેમરી ઉમેરો.

- ફ્રી અને ઓપન સોર્સ: અપાચે 2.0 લાઇસન્સ

- ક્રોસ-પ્લેટફોર્મ: Windows, Linux, MacOS

## HttpClients

### TypeScript

મેસોસ્ફિયર ડેટાબેઝ સાથે ક્રિયાપ્રતિક્રિયા કરવા માટે TypeScript ક્લાયંટ આપે છે, તમે વેક્ટર એમ્બેડિંગ્સ ડેટાબેઝ અથવા રિલેશનલ ડેટાબેઝનો ઉપયોગ કરી શકો છો. વેક્ટર એમ્બેડિંગ્સ ડેટાબેઝનો ઉપયોગ કેવી રીતે કરવો તે આપણે પહેલા જોઈશું.

#### વેક્ટર મોડેલ

તમે તમારા વેક્ટર એમ્બેડિંગ્સ બનાવવા માટે ટ્રી AI મોડલ્સ પ્રદાતાનો ઉપયોગ કરી શકો છો.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

આ પ્રતિષ્ઠિત પ્રદાતાનો ઉપયોગ કેવી રીતે કરવો તેનું એક ઉદાહરણ અહીં છે.

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

ક્લાયંટ બનાવ્યા પછી, તમે ડેટાબેઝ સાથે ક્રિયાપ્રતિક્રિયા કરવા માટે તેનો ઉપયોગ કરી શકો છો.

તમારા વેક્ટર ડેટાબેઝમાં ડેટા ઉમેરો.

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

તમારા વેક્ટર ડેટાબેઝમાંથી ડેટા કાઢી નાખો.

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

તમારા વેક્ટર ડેટાબેઝમાંથી ક્વેરી ડેટા.

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

#### સંબંધી

ઉદાહરણ તરીકે રિલેશનલ ફીચર્સનો ઉપયોગ, [examples](./demo/examples/js/relational_examples/) ફોલ્ડર તપાસો.

ઉદાહરણ તરીકે ફાઇલ સ્ટોરેજ સુવિધાઓના ઉપયોગ માટે, [examples](./demo/examples/js/files_upload_examples/) ફોલ્ડર તપાસો.

અમારા [Docs](https://docs.ahen-studio.com/) પર વધુ જાણો

### Python

મેસોસ્ફિયર ડેટાબેઝ સાથે ક્રિયાપ્રતિક્રિયા કરવા માટે Python ક્લાયંટ ઓફર કરે છે, તમે વેક્ટર એમ્બેડિંગ્સ ડેટાબેઝ અથવા રિલેશનલ ડેટાબેઝનો ઉપયોગ કરી શકો છો. વેક્ટર એમ્બેડિંગ્સ ડેટાબેઝનો ઉપયોગ કેવી રીતે કરવો તે આપણે પહેલા જોઈશું.

#### વેક્ટર મોડેલ

તમે તમારા વેક્ટર એમ્બેડિંગ્સ બનાવવા માટે ટ્રી AI મોડલ્સ પ્રદાતાનો ઉપયોગ કરી શકો છો.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

આ પ્રતિષ્ઠિત પ્રદાતાનો ઉપયોગ કેવી રીતે કરવો તેનું એક ઉદાહરણ અહીં છે.

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

ક્લાયંટ બનાવ્યા પછી, તમે ડેટાબેઝ સાથે ક્રિયાપ્રતિક્રિયા કરવા માટે તેનો ઉપયોગ કરી શકો છો.

તમારા વેક્ટર ડેટાબેઝમાં ડેટા ઉમેરો.

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

તમારા વેક્ટર ડેટાબેઝમાંથી ડેટા કાઢી નાખો.

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

તમારા વેક્ટર ડેટાબેઝમાંથી ક્વેરી ડેટા.

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

#### સંબંધી

ઉદાહરણ તરીકે રિલેશનલ ફીચર્સનો ઉપયોગ, [examples](./demo/examples/python/relational_examples/) ફોલ્ડર તપાસો.

હમણાં માટે python ક્લાયંટ ફાઇલ સ્ટોરેજ સુવિધાને સપોર્ટ કરતું નથી.

#### એકીકરણ

Python ક્લાયન્ટ તમને [mem0](https://github.com/mem0ai/mem0) અને અમારા [integration](./demo/integration/mem0/)નો ઉપયોગ કરીને AI માં મેમરી ઉમેરવાની ક્ષમતા પ્રદાન કરે છે.

અમારા [Docs](https://docs.ahen-studio.com/) પર વધુ જાણો

## અમારા સહયોગીઓ માટે બધા આભાર:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## લાઇસન્સ

[Apache 2.0](./LICENSE)
