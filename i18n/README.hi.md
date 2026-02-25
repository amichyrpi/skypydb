<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>मेसोस्फीयर-बैकएंड - ओपन सोर्स रिलेशनल और वेक्टर एंबेडिंग डेटाबेस</b>। <br />
</p>

<div align="center">

![GitHub commit activity](https://img.shields.io/github/commit-activity/m/Ahen-Studio/mesosphere-backend)
[![PyPI](https://img.shields.io/pypi/v/mesosphere.svg)]https://pypi.org/project/mesosphere/)
![NPM Version](https://img.shields.io/npm/v/mesosphere)
![GitHub](https://img.shields.io/github/license/Ahen-Studio/mesosphere-backend)
[![Docs](https://img.shields.io/badge/Docs-blue.svg)]https://docs.ahen-studio.com/)

</div>

```bash
pip install mesosphere # python database
```

```bash
npm install mesosphere # typescript client
```

## विशेषताएँ

- रिलेशनल: अपने फ़ंक्शन बनाएं और अपने डेटा को रिलेशनल डेटाबेस में संग्रहीत करें।

- वेक्टर एम्बेडिंग: वेक्टर संग्रह बनाएं, खोजें और हटाएं।

- फ़ाइल भंडारण: अपनी फ़ाइलों को डेटाबेस में संग्रहीत करें।

- मेमोरी: [mem0](https://github.com/mem0ai/mem0) और हमारे [integration](./demo/integration/mem0/) का उपयोग करके एलएलएम में मेमोरी जोड़ें।

- नि:शुल्क और खुला स्रोत: अपाचे 2.0 लाइसेंस प्राप्त

- क्रॉस-प्लेटफ़ॉर्म: विंडोज़, लिनक्स, मैकओएस

## एचटीपीक्लाइंट्स

### TypeScript

मेसोस्फीयर डेटाबेस के साथ इंटरैक्ट करने के लिए TypeScript क्लाइंट प्रदान करता है, आप या तो वेक्टर एम्बेडिंग डेटाबेस या रिलेशनल डेटाबेस का उपयोग कर सकते हैं। हम सबसे पहले देखेंगे कि वेक्टर एम्बेडिंग डेटाबेस का उपयोग कैसे करें।

#### वेक्टर मॉडल

आप अपने वेक्टर एम्बेडिंग बनाने के लिए ट्री एआई मॉडल प्रदाता का उपयोग कर सकते हैं।

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

इस सम्मानित प्रदाता का उपयोग कैसे करें इसका एक उदाहरण यहां दिया गया है।

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

क्लाइंट बनाने के बाद, आप इसका उपयोग डेटाबेस के साथ इंटरैक्ट करने के लिए कर सकते हैं।

अपने वेक्टर डेटाबेस में डेटा जोड़ें।

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

अपने वेक्टर डेटाबेस से डेटा हटाएं.

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

अपने वेक्टर डेटाबेस से डेटा क्वेरी करें।

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

#### संबंधपरक

संबंधपरक सुविधाओं के उपयोग के उदाहरण के लिए, [examples](./demo/examples/js/relational_examples/) फ़ोल्डर देखें।

फ़ाइल संग्रहण सुविधाओं के उदाहरण के लिए, [examples](./demo/examples/js/files_upload_examples/) फ़ोल्डर देखें।

हमारे [Docs](https://docs.ahen-studio.com/) पर और जानें

### Python

मेसोस्फीयर डेटाबेस के साथ इंटरैक्ट करने के लिए Python क्लाइंट प्रदान करता है, आप या तो वेक्टर एम्बेडिंग डेटाबेस या रिलेशनल डेटाबेस का उपयोग कर सकते हैं। हम सबसे पहले देखेंगे कि वेक्टर एम्बेडिंग डेटाबेस का उपयोग कैसे करें।

#### वेक्टर मॉडल

आप अपने वेक्टर एम्बेडिंग बनाने के लिए ट्री एआई मॉडल प्रदाता का उपयोग कर सकते हैं।

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

इस सम्मानित प्रदाता का उपयोग कैसे करें इसका एक उदाहरण यहां दिया गया है।

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

क्लाइंट बनाने के बाद, आप इसका उपयोग डेटाबेस के साथ इंटरैक्ट करने के लिए कर सकते हैं।

अपने वेक्टर डेटाबेस में डेटा जोड़ें।

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

अपने वेक्टर डेटाबेस से डेटा हटाएं.

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

अपने वेक्टर डेटाबेस से डेटा क्वेरी करें।

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

#### संबंधपरक

संबंधपरक सुविधाओं के उपयोग के उदाहरण के लिए, [examples](./demo/examples/python/relational_examples/) फ़ोल्डर देखें।

अभी के लिए पायथन क्लाइंट फ़ाइल संग्रहण सुविधा का समर्थन नहीं करता है।

#### एकीकरण

Python क्लाइंट आपको [mem0](https://github.com/mem0ai/mem0) और हमारे [integration](./demo/integration/mem0/) का उपयोग करके एआई में मेमोरी जोड़ने की क्षमता प्रदान करता है।

हमारे [Docs](https://docs.ahen-studio.com/) पर और जानें

## हमारे योगदानकर्ताओं को सभी धन्यवाद:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## लाइसेंस

[Apache 2.0](./LICENSE)
