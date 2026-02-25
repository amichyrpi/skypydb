<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - منبع باز پایگاه داده جاسازی های رابطه ای و برداری</b>. <br />
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

## ویژگی ها

- رابطه ای: توابع خود را ایجاد کنید و داده های خود را در یک پایگاه داده رابطه ای ذخیره کنید.

- جاسازی های برداری: مجموعه های بردار را ایجاد، جستجو و حذف کنید.

- ذخیره سازی فایل: فایل های خود را در یک پایگاه داده ذخیره کنید.

- حافظه: با استفاده از [mem0](https://github.com/mem0ai/mem0) و [integration](./demo/integration/mem0/)، حافظه را به یک LLM اضافه کنید.

- رایگان و منبع باز: Apache 2.0 دارای مجوز

- کراس پلتفرم: ویندوز، لینوکس، MacOS

## HttpClients

### TypeScript

Mesosphere یک سرویس گیرنده TypeScript را برای تعامل با پایگاه داده ارائه می دهد، شما می توانید از پایگاه داده embeddings برداری یا پایگاه داده رابطه ای استفاده کنید. ابتدا نحوه استفاده از پایگاه داده embeddings vector را بررسی خواهیم کرد.

#### مدل برداری

می‌توانید از ارائه‌دهنده مدل‌های هوش مصنوعی درختی برای ایجاد جاسازی‌های برداری خود استفاده کنید.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

در اینجا مثالی از نحوه استفاده از این ارائه دهنده متفاوت آورده شده است.

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

پس از ایجاد مشتری، می توانید از آن برای تعامل با پایگاه داده استفاده کنید.

داده ها را به پایگاه داده برداری خود اضافه کنید.

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

داده ها را از پایگاه داده برداری خود حذف کنید.

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

داده ها را از پایگاه داده برداری خود جستجو کنید.

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

#### رابطه ای

برای مثال استفاده از ویژگی های رابطه ای، پوشه [examples](./demo/examples/js/relational_examples/) را بررسی کنید.

برای مثال استفاده از ویژگی‌های ذخیره‌سازی فایل، پوشه [examples](./demo/examples/js/files_upload_examples/) را بررسی کنید.

در [Docs](https://docs.ahen-studio.com/) ما بیشتر بیاموزید

### Python

Mesosphere یک سرویس گیرنده Python را برای تعامل با پایگاه داده ارائه می دهد، می توانید از پایگاه داده embeddings برداری یا پایگاه داده رابطه ای استفاده کنید. ابتدا نحوه استفاده از پایگاه داده embeddings vector را بررسی خواهیم کرد.

#### مدل برداری

می‌توانید از ارائه‌دهنده مدل‌های هوش مصنوعی درختی برای ایجاد جاسازی‌های برداری خود استفاده کنید.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

در اینجا مثالی از نحوه استفاده از این ارائه دهنده متفاوت آورده شده است.

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

پس از ایجاد مشتری، می توانید از آن برای تعامل با پایگاه داده استفاده کنید.

داده ها را به پایگاه داده برداری خود اضافه کنید.

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

داده ها را از پایگاه داده برداری خود حذف کنید.

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

داده ها را از پایگاه داده برداری خود جستجو کنید.

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

#### رابطه ای

برای مثال استفاده از ویژگی های رابطه ای، پوشه [examples](./demo/examples/python/relational_examples/) را بررسی کنید.

در حال حاضر کلاینت پایتون از ویژگی ذخیره سازی فایل پشتیبانی نمی کند.

#### یکپارچه سازی

مشتری Python این امکان را به شما ارائه می دهد که با استفاده از [mem0](https://github.com/mem0ai/mem0) و [integration](./demo/integration/mem0/)، حافظه را به هوش مصنوعی اضافه کنید.

در [Docs](https://docs.ahen-studio.com/) ما بیشتر بیاموزید

## همه با تشکر از همکاران ما:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## مجوز

[Apache 2.0](./LICENSE)