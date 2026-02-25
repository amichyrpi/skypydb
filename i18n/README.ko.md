<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - 오픈 소스 관계형 및 벡터 임베딩 데이터베이스</b>. <br />
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

## 기능

- 관계형: 함수를 생성하고 데이터를 관계형 데이터베이스에 저장합니다.

- 벡터 임베딩: 벡터 컬렉션을 생성, 검색 및 삭제합니다.

- 파일 저장: 파일을 데이터베이스에 저장합니다.

- 메모리: [mem0](https://github.com/mem0ai/mem0) 및 [integration](./demo/integration/mem0/)을 사용하여 LLM에 메모리를 추가합니다.

- 무료 및 오픈 소스: Apache 2.0 라이센스

- 크로스 플랫폼: Windows, Linux, MacOS

## HttpClient

### TypeScript

Mesosphere는 데이터베이스와 상호 작용하기 위해 TypeScript 클라이언트를 제공하며 벡터 임베딩 데이터베이스 또는 관계형 데이터베이스를 사용할 수 있습니다. 먼저 벡터 임베딩 데이터베이스를 사용하는 방법을 살펴보겠습니다.

#### 벡터 모델

트리 AI 모델 제공자를 사용하여 벡터 임베딩을 생성할 수 있습니다.

- [x] HuggingFace Sentence Transformers
- [엑스] Ollama
- [x] OpenAI

다음은 이 종속 공급자를 사용하는 방법에 대한 예입니다.

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

클라이언트를 생성한 후 이를 사용하여 데이터베이스와 상호 작용할 수 있습니다.

벡터 데이터베이스에 데이터를 추가하세요.

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

벡터 데이터베이스에서 데이터를 삭제합니다.

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

벡터 데이터베이스에서 데이터를 쿼리합니다.

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

#### 관계형

관계형 기능의 사용 예는 [examples](./demo/examples/js/relational_examples/) 폴더를 확인하세요.

파일 저장 기능의 사용 예는 [examples](./demo/examples/js/files_upload_examples/) 폴더를 확인하세요.

[Docs](https://docs.ahen-studio.com/)에서 자세히 알아보세요.

### Python

Mesosphere는 데이터베이스와 상호 작용하기 위해 Python 클라이언트를 제공하며 벡터 임베딩 데이터베이스 또는 관계형 데이터베이스를 사용할 수 있습니다. 먼저 벡터 임베딩 데이터베이스를 사용하는 방법을 살펴보겠습니다.

#### 벡터 모델

트리 AI 모델 제공자를 사용하여 벡터 임베딩을 생성할 수 있습니다.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

다음은 이 종속 공급자를 사용하는 방법에 대한 예입니다.

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

클라이언트를 생성한 후 이를 사용하여 데이터베이스와 상호 작용할 수 있습니다.

벡터 데이터베이스에 데이터를 추가하세요.

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

벡터 데이터베이스에서 데이터를 삭제합니다.

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

벡터 데이터베이스에서 데이터를 쿼리합니다.

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

#### 관계형

관계형 기능의 사용 예는 [examples](./demo/examples/python/relational_examples/) 폴더를 확인하세요.

현재 Python 클라이언트는 파일 저장 기능을 지원하지 않습니다.

#### 통합

Python 클라이언트는 [mem0](https://github.com/mem0ai/mem0) 및 [integration](./demo/integration/mem0/)을 사용하여 AI에 메모리를 추가하는 기능을 제공합니다.

[Docs](https://docs.ahen-studio.com/)에서 자세히 알아보세요.

## 기여자들에게 감사드립니다:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## 라이센스

[Apache 2.0](./LICENSE)