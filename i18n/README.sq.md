<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - Baza e të dhënave me burim të hapur Relacionale dhe Embeddings Vektoriale</b>. <br />
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

## Karakteristikat

- Relacionale: krijoni funksionet tuaja dhe ruani të dhënat tuaja në një bazë të dhënash relacionale.

- Përfshirje vektoriale: krijoni, kërkoni dhe fshini koleksionet e vektorëve.

- Ruajtja e skedarëve: ruani skedarët tuaj në një bazë të dhënash.

- Memoria: shtoni memorie në një LLM duke përdorur [mem0](https://github.com/mem0ai/mem0) dhe [integration](./demo/integration/mem0/) tonë.

- Burim i lirë dhe i hapur: Apache 2.0 i licencuar

- Ndër-platformë: Windows, Linux, MacOS

## HttpClients

### TypeScript

Mesosphere ofron një klient TypeScript për ndërveprim me bazën e të dhënave, ju mund të përdorni ose bazën e të dhënave të ngulitjes vektoriale ose bazën e të dhënave relacionale. Së pari do të shikojmë se si të përdorim bazën e të dhënave të ngulitjeve vektoriale.

#### Modeli vektorial

Ju mund të përdorni ofruesin e modeleve të AI të pemës për të krijuar ngulitje vektoriale.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

Këtu është një shembull se si të përdorni këtë ofrues të ndryshëm.

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

Pas krijimit të klientit, mund ta përdorni për të bashkëvepruar me bazën e të dhënave.

Shtoni të dhëna në bazën tuaj të të dhënave vektoriale.

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

Fshini të dhënat nga databaza juaj vektoriale.

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

Kërkoni të dhëna nga databaza juaj vektoriale.

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

#### Relacionale

Për shembull përdorimin e veçorive relacionale, shikoni dosjen [examples](./demo/examples/js/relational_examples/).

Për shembull, përdorimin e veçorive të ruajtjes së skedarëve, shikoni dosjen [examples](./demo/examples/js/files_upload_examples/).

Mësoni më shumë në [Docs](https://docs.ahen-studio.com/) tonë

### Python

Mesosphere ofron një klient Python për ndërveprim me bazën e të dhënave, ju mund të përdorni ose bazën e të dhënave të ngulitjeve vektoriale ose bazën e të dhënave relacionale. Së pari do të shikojmë se si të përdorim bazën e të dhënave të ngulitjeve vektoriale.

#### Modeli vektorial

Ju mund të përdorni ofruesin e modeleve të AI të pemës për të krijuar ngulitje vektoriale.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

Këtu është një shembull se si të përdorni këtë ofrues të ndryshëm.

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

Pas krijimit të klientit, mund ta përdorni për të bashkëvepruar me bazën e të dhënave.

Shtoni të dhëna në bazën tuaj të të dhënave vektoriale.

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

Fshini të dhënat nga databaza juaj vektoriale.

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

Kërkoni të dhëna nga databaza juaj vektoriale.

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

#### Relacionale

Për shembull përdorimin e veçorive relacionale, shikoni dosjen [examples](./demo/examples/python/relational_examples/).

Për momentin, klienti python nuk e mbështet funksionin e ruajtjes së skedarëve.

#### Integrimi

Klienti Python ju ofron mundësinë për të shtuar memorie në një AI duke përdorur [mem0](https://github.com/mem0ai/mem0) dhe [integration](./demo/integration/mem0/) tonë.

Mësoni më shumë në [Docs](https://docs.ahen-studio.com/) tonë

## Të gjitha faleminderit për kontribuesit tanë:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## Licencë

[Apache 2.0](./LICENSE)
