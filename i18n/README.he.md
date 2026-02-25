<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - מסד נתונים יחסי והטמעות וקטוריות בקוד פתוח</b>. <br />
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

## תכונות

- יחסי: צור את הפונקציות שלך ואחסן את הנתונים שלך במסד נתונים יחסי.

- הטבעות וקטוריות: צור, חפש ומחק אוספי וקטורים.

- אחסון קבצים: אחסן את הקבצים שלך במסד נתונים.

- זיכרון: הוסף זיכרון ל-LLM באמצעות [mem0](https://github.com/mem0ai/mem0) ו-[integration](./demo/integration/mem0/) שלנו.

- קוד חופשי ופתוח: Apache 2.0 ברישיון

- בין פלטפורמות: Windows, Linux, MacOS

## HTTPClients

### TypeScript

Mesosphere מציעה לקוח TypeScript לאינטראקציה עם מסד הנתונים, אתה יכול להשתמש במסד הנתונים של הטבעות וקטוריות או במסד הנתונים היחסי. תחילה נראה כיצד להשתמש במסד הנתונים של הטבעות וקטוריות.

#### דגם וקטור

אתה יכול להשתמש בספק מודלים של עצים בינה מלאכותית כדי ליצור את ההטבעות הווקטוריות שלך.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

להלן דוגמה כיצד להשתמש בספק הראוי הזה.

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

לאחר יצירת הלקוח, אתה יכול להשתמש בו כדי ליצור אינטראקציה עם מסד הנתונים.

הוסף נתונים למסד הנתונים הוקטורי שלך.

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

מחק נתונים ממסד הנתונים הווקטוריים שלך.

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

שאילתה נתונים ממסד הנתונים הווקטוריים שלך.

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

#### יחסי

לדוגמה שימוש בתכונות היחסיות, בדוק את התיקיה [examples](./demo/examples/js/relational_examples/).

לדוגמה שימוש בתכונות אחסון הקבצים, בדוק את התיקיה [examples](./demo/examples/js/files_upload_examples/).

למידע נוסף ב-[Docs](https://docs.ahen-studio.com/) שלנו

### Python

Mesosphere מציעה לקוח Python לאינטראקציה עם מסד הנתונים, אתה יכול להשתמש במסד הנתונים של הטבעות וקטוריות או במסד הנתונים היחסי. תחילה נראה כיצד להשתמש במסד הנתונים של הטבעות וקטוריות.

#### דגם וקטור

אתה יכול להשתמש בספק מודלים של עצים בינה מלאכותית כדי ליצור את ההטבעות הווקטוריות שלך.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

להלן דוגמה כיצד להשתמש בספק הראוי הזה.

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

לאחר יצירת הלקוח, אתה יכול להשתמש בו כדי ליצור אינטראקציה עם מסד הנתונים.

הוסף נתונים למסד הנתונים הוקטורי שלך.

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

מחק נתונים ממסד הנתונים הווקטוריים שלך.

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

שאילתה נתונים ממסד הנתונים הווקטוריים שלך.

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

#### יחסי

לדוגמה שימוש בתכונות היחסיות, בדוק את התיקיה [examples](./demo/examples/python/relational_examples/).

לעת עתה לקוח python אינו תומך בתכונת אחסון הקבצים.

#### אינטגרציה

הלקוח Python מציע לך את היכולת להוסיף זיכרון ל-AI באמצעות [mem0](https://github.com/mem0ai/mem0) וה-[integration](./demo/integration/mem0/) שלנו.

למידע נוסף ב-[Docs](https://docs.ahen-studio.com/) שלנו

## הכל בזכות התורמים שלנו:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## רישיון

[Apache 2.0](./LICENSE)
