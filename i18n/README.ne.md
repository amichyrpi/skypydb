<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - खुला स्रोत रिलेशनल र भेक्टर इम्बेडिङ डाटाबेस</b>। <br />
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

## सुविधाहरू

- रिलेशनल: तपाईंको प्रकार्यहरू सिर्जना गर्नुहोस् र तपाईंको डाटालाई रिलेशनल डाटाबेसमा भण्डार गर्नुहोस्।

- भेक्टर इम्बेडिङहरू: भेक्टर सङ्ग्रहहरू सिर्जना गर्नुहोस्, खोज्नुहोस् र मेटाउनुहोस्।

- फाइल भण्डारण: डाटाबेसमा आफ्नो फाइलहरू भण्डारण गर्नुहोस्।

- मेमोरी: [mem0](https://github.com/mem0ai/mem0) र हाम्रो [integration](./demo/integration/mem0/) प्रयोग गरेर LLM मा मेमोरी थप्नुहोस्।

- नि: शुल्क र खुला स्रोत: Apache 2.0 लाइसेन्स

- क्रस-प्लेटफर्म: Windows, Linux, MacOS

## Http ग्राहकहरू

### TypeScript

मेसोस्फियरले डाटाबेससँग अन्तरक्रिया गर्नको लागि TypeScript क्लाइन्ट प्रदान गर्दछ, तपाइँ या त भेक्टर इम्बेडिङ डाटाबेस वा रिलेशनल डाटाबेस प्रयोग गर्न सक्नुहुन्छ। हामी पहिले भेक्टर इम्बेडिङ डाटाबेस कसरी प्रयोग गर्ने भनेर हेर्नेछौं।

#### भेक्टर मोडेल

तपाईंले आफ्नो भेक्टर इम्बेडिङहरू सिर्जना गर्न ट्री AI मोडेल प्रदायक प्रयोग गर्न सक्नुहुन्छ।

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

यहाँ यो deferent प्रदायक कसरी प्रयोग गर्ने को एक उदाहरण छ।

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

क्लाइन्ट सिर्जना गरेपछि, तपाइँ यसलाई डाटाबेससँग अन्तरक्रिया गर्न प्रयोग गर्न सक्नुहुन्छ।

तपाईंको भेक्टर डेटाबेसमा डाटा थप्नुहोस्।

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

तपाईंको भेक्टर डाटाबेसबाट डाटा मेटाउनुहोस्।

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

तपाईको भेक्टर डाटाबेसबाट डाटा क्वेरी गर्नुहोस्।

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

#### सम्बन्धात्मक

उदाहरणका लागि सापेक्षिक सुविधाहरूको प्रयोग, [examples](./demo/examples/js/relational_examples/) फोल्डर जाँच गर्नुहोस्।

उदाहरणका लागि फाइल भण्डारण सुविधाहरूको प्रयोग, [examples](./demo/examples/js/files_upload_examples/) फोल्डर जाँच गर्नुहोस्।

हाम्रो [Docs](https://docs.ahen-studio.com/) मा थप जान्नुहोस्

### Python

मेसोस्फियरले डाटाबेससँग अन्तरक्रिया गर्नको लागि Python क्लाइन्ट प्रदान गर्दछ, तपाईले भेक्टर इम्बेडिङ डाटाबेस वा रिलेशनल डाटाबेस प्रयोग गर्न सक्नुहुन्छ। हामी पहिले भेक्टर इम्बेडिङ डाटाबेस कसरी प्रयोग गर्ने भनेर हेर्नेछौं।

#### भेक्टर मोडेल

तपाईंले आफ्नो भेक्टर इम्बेडिङहरू सिर्जना गर्न ट्री AI मोडेल प्रदायक प्रयोग गर्न सक्नुहुन्छ।

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

यहाँ यो deferent प्रदायक कसरी प्रयोग गर्ने को एक उदाहरण छ।

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

क्लाइन्ट सिर्जना गरेपछि, तपाइँ यसलाई डाटाबेससँग अन्तरक्रिया गर्न प्रयोग गर्न सक्नुहुन्छ।

तपाईंको भेक्टर डेटाबेसमा डाटा थप्नुहोस्।

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

तपाईंको भेक्टर डाटाबेसबाट डाटा मेटाउनुहोस्।

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

तपाईको भेक्टर डाटाबेसबाट डाटा क्वेरी गर्नुहोस्।

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

#### सम्बन्धात्मक

उदाहरणका लागि रिलेशनल सुविधाहरूको प्रयोग, [examples](./demo/examples/python/relational_examples/) फोल्डर जाँच गर्नुहोस्।

अहिलेको लागि पाइथन क्लाइन्टले फाइल भण्डारण सुविधालाई समर्थन गर्दैन।

#### एकीकरण

Python ग्राहकले तपाईंलाई [mem0](https://github.com/mem0ai/mem0) र हाम्रो [integration](./demo/integration/mem0/) प्रयोग गरेर एआईमा मेमोरी थप्ने क्षमता प्रदान गर्दछ।

हाम्रो [Docs](https://docs.ahen-studio.com/) मा थप जान्नुहोस्

## हाम्रा योगदानकर्ताहरूलाई सबै धन्यवाद:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## लाइसेन्स

[Apache 2.0](./LICENSE)
