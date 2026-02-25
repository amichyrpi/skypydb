<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - Open Source Relational and Vector Embeddings Database</b>. <br />
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

## Χαρακτηριστικά

- Relational: δημιουργήστε τις συναρτήσεις σας και αποθηκεύστε τα δεδομένα σας σε μια σχεσιακή βάση δεδομένων.

- Διανυσματικές ενσωματώσεις: δημιουργία, αναζήτηση και διαγραφή συλλογών διανυσμάτων.

- Αποθήκευση αρχείων: αποθηκεύστε τα αρχεία σας σε μια βάση δεδομένων.

- Μνήμη: προσθέστε μνήμη σε ένα LLM χρησιμοποιώντας τα [mem0](https://github.com/mem0ai/mem0) και τα [integration](./demo/integration/mem0/) μας.

- Δωρεάν & ανοιχτού κώδικα: Άδεια χρήσης Apache 2.0

- Cross-platform: Windows, Linux, MacOS

## HttpClients

### TypeScript

Το Mesosphere προσφέρει έναν πελάτη TypeScript για αλληλεπίδραση με τη βάση δεδομένων, μπορείτε να χρησιμοποιήσετε είτε τη βάση δεδομένων διανυσματικών ενσωματώσεων είτε τη σχεσιακή βάση δεδομένων. Πρώτα θα δούμε πώς να χρησιμοποιήσουμε τη βάση δεδομένων ενσωματώσεων διανυσμάτων.

#### Διανυσματικό μοντέλο

Μπορείτε να χρησιμοποιήσετε τον πάροχο μοντέλων τεχνητής νοημοσύνης δέντρου για να δημιουργήσετε τις διανυσματικές ενσωματώσεις σας.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

Ακολουθεί ένα παράδειγμα του τρόπου χρήσης αυτού του διαφορετικού παρόχου.

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

Αφού δημιουργήσετε τον πελάτη, μπορείτε να τον χρησιμοποιήσετε για να αλληλεπιδράσετε με τη βάση δεδομένων.

Προσθέστε δεδομένα στη διανυσματική βάση δεδομένων σας.

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

Διαγράψτε δεδομένα από τη διανυσματική βάση δεδομένων σας.

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

Ζητήστε δεδομένα από τη διανυσματική βάση δεδομένων σας.

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

#### Σχεσιακό

Για παράδειγμα, τη χρήση των σχεσιακών χαρακτηριστικών, ανατρέξτε στον φάκελο [examples](./demo/examples/js/relational_examples/).

Για παράδειγμα, τη χρήση των δυνατοτήτων αποθήκευσης αρχείων, ανατρέξτε στον φάκελο [examples](./demo/examples/js/files_upload_examples/).

Μάθετε περισσότερα στο [Docs](https://docs.ahen-studio.com/) μας

### Python

Το Mesosphere προσφέρει έναν πελάτη Python για αλληλεπίδραση με τη βάση δεδομένων, μπορείτε να χρησιμοποιήσετε είτε τη βάση δεδομένων διανυσματικών ενσωματώσεων είτε τη σχεσιακή βάση δεδομένων. Πρώτα θα δούμε πώς να χρησιμοποιήσουμε τη βάση δεδομένων ενσωματώσεων διανυσμάτων.

#### Διανυσματικό μοντέλο

Μπορείτε να χρησιμοποιήσετε τον πάροχο μοντέλων τεχνητής νοημοσύνης δέντρου για να δημιουργήσετε τις διανυσματικές ενσωματώσεις σας.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

Ακολουθεί ένα παράδειγμα του τρόπου χρήσης αυτού του διαφορετικού παρόχου.

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

Αφού δημιουργήσετε τον πελάτη, μπορείτε να τον χρησιμοποιήσετε για να αλληλεπιδράσετε με τη βάση δεδομένων.

Προσθέστε δεδομένα στη διανυσματική βάση δεδομένων σας.

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

Διαγράψτε δεδομένα από τη διανυσματική βάση δεδομένων σας.

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

Ζητήστε δεδομένα από τη διανυσματική βάση δεδομένων σας.

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

#### Σχεσιακό

Για παράδειγμα, τη χρήση των σχεσιακών χαρακτηριστικών, ανατρέξτε στον φάκελο [examples](./demo/examples/python/relational_examples/).

Προς το παρόν ο πελάτης python δεν υποστηρίζει τη δυνατότητα αποθήκευσης αρχείων.

#### Ενσωμάτωση

Ο πελάτης Python σας προσφέρει τη δυνατότητα να προσθέσετε μνήμη σε ένα AI χρησιμοποιώντας τα [mem0](https://github.com/mem0ai/mem0) και τα [integration](./demo/integration/mem0/) μας.

Μάθετε περισσότερα στο [Docs](https://docs.ahen-studio.com/) μας

## Ευχαριστούμε όλους τους συντελεστές μας:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## Άδεια

[Apache 2.0](./LICENSE)