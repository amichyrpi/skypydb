<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - ฐานข้อมูลการฝังเชิงสัมพันธ์และเวกเตอร์แบบโอเพ่นซอร์ส</b> <br />
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

## คุณสมบัติ

- เชิงสัมพันธ์: สร้างฟังก์ชันของคุณและจัดเก็บข้อมูลของคุณในฐานข้อมูลเชิงสัมพันธ์

- การฝังเวกเตอร์: สร้าง ค้นหา และลบคอลเลกชันเวกเตอร์

- การจัดเก็บไฟล์: เก็บไฟล์ของคุณในฐานข้อมูล

- หน่วยความจำ: เพิ่มหน่วยความจำให้กับ LLM โดยใช้ [mem0](https://github.com/mem0ai/mem0) และ [integration](./demo/integration/mem0/) ของเรา

- ฟรีและโอเพ่นซอร์ส: Apache 2.0 ได้รับใบอนุญาต

- ข้ามแพลตฟอร์ม: Windows, Linux, MacOS

## ลูกค้า Http

### TypeScript

Mesosphere มีไคลเอนต์ TypeScript สำหรับการโต้ตอบกับฐานข้อมูล คุณสามารถใช้ฐานข้อมูลการฝังเวกเตอร์หรือฐานข้อมูลเชิงสัมพันธ์ก็ได้ ก่อนอื่นเราจะดูวิธีใช้ฐานข้อมูลการฝังเวกเตอร์

#### โมเดลเวกเตอร์

คุณสามารถใช้ผู้ให้บริการโมเดล AI แบบต้นไม้เพื่อสร้างการฝังเวกเตอร์ของคุณได้

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

นี่คือตัวอย่างวิธีการใช้ตัวให้บริการที่เลื่อนออกไปนี้

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

หลังจากสร้างไคลเอนต์แล้ว คุณสามารถใช้มันเพื่อโต้ตอบกับฐานข้อมูลได้

เพิ่มข้อมูลลงในฐานข้อมูลเวกเตอร์ของคุณ

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

ลบข้อมูลจากฐานข้อมูลเวกเตอร์ของคุณ

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

ค้นหาข้อมูลจากฐานข้อมูลเวกเตอร์ของคุณ

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

#### เชิงสัมพันธ์

ตัวอย่างเช่น การใช้คุณลักษณะเชิงสัมพันธ์ โปรดดูที่โฟลเดอร์ [examples](./demo/examples/js/relational_examples/)

ตัวอย่างเช่น การใช้คุณสมบัติการจัดเก็บไฟล์ โปรดดูที่โฟลเดอร์ [examples](./demo/examples/js/files_upload_examples/)

เรียนรู้เพิ่มเติมที่ [Docs](https://docs.ahen-studio.com/) ของเรา

### Python

Mesosphere มีไคลเอนต์ Python สำหรับการโต้ตอบกับฐานข้อมูล คุณสามารถใช้ฐานข้อมูลการฝังเวกเตอร์หรือฐานข้อมูลเชิงสัมพันธ์ก็ได้ ก่อนอื่นเราจะดูวิธีใช้ฐานข้อมูลการฝังเวกเตอร์

#### โมเดลเวกเตอร์

คุณสามารถใช้ผู้ให้บริการโมเดล AI แบบต้นไม้เพื่อสร้างการฝังเวกเตอร์ของคุณได้

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

นี่คือตัวอย่างวิธีการใช้ตัวให้บริการที่เลื่อนออกไปนี้

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

หลังจากสร้างไคลเอนต์แล้ว คุณสามารถใช้มันเพื่อโต้ตอบกับฐานข้อมูลได้

เพิ่มข้อมูลลงในฐานข้อมูลเวกเตอร์ของคุณ

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

ลบข้อมูลจากฐานข้อมูลเวกเตอร์ของคุณ

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

ค้นหาข้อมูลจากฐานข้อมูลเวกเตอร์ของคุณ

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

#### เชิงสัมพันธ์

ตัวอย่างเช่น การใช้คุณลักษณะเชิงสัมพันธ์ โปรดดูที่โฟลเดอร์ [examples](./demo/examples/python/relational_examples/)

ในตอนนี้ไคลเอนต์ python ไม่รองรับคุณสมบัติการจัดเก็บไฟล์

#### บูรณาการ

ไคลเอนต์ Python ช่วยให้คุณสามารถเพิ่มหน่วยความจำให้กับ AI โดยใช้ [mem0](https://github.com/mem0ai/mem0) และ [integration](./demo/integration/mem0/) ของเรา

เรียนรู้เพิ่มเติมเกี่ยวกับ [Docs](https://docs.ahen-studio.com/) ของเรา

## ขอขอบคุณผู้สนับสนุนของเรา:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## ใบอนุญาต

[Apache 2.0](./LICENSE)
