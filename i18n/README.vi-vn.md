<div align="center">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="mesosphere-backend" width="auto" height="auto" src="https://github.com/Ahen-Studio/mesosphere-backend/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
    <b>mesosphere-backend - Cơ sở dữ liệu nhúng vectơ và quan hệ mã nguồn mở</b>. <br />
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

## Tính năng

- Quan hệ: tạo các hàm và lưu trữ dữ liệu của bạn trong cơ sở dữ liệu quan hệ.

- Nhúng vectơ: tạo, tìm kiếm và xóa bộ sưu tập vectơ.

- Lưu trữ tệp: lưu trữ các tệp của bạn trong cơ sở dữ liệu.

- Bộ nhớ: thêm bộ nhớ vào LLM bằng cách sử dụng [mem0](https://github.com/mem0ai/mem0) và [integration](./demo/integration/mem0/) của chúng tôi.

- Nguồn mở & miễn phí: Được cấp phép Apache 2.0

- Đa nền tảng: Windows, Linux, MacOS

## HttpClient

### TypeScript

Mesosphere cung cấp ứng dụng khách TypeScript để tương tác với cơ sở dữ liệu, bạn có thể sử dụng cơ sở dữ liệu nhúng vectơ hoặc cơ sở dữ liệu quan hệ. Đầu tiên chúng ta sẽ xem cách sử dụng cơ sở dữ liệu nhúng vector.

#### Mô hình vectơ

Bạn có thể sử dụng nhà cung cấp mô hình AI dạng cây để tạo các phần nhúng vectơ của mình.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

Dưới đây là một ví dụ về cách sử dụng nhà cung cấp trì hoãn này.

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

Sau khi tạo ứng dụng khách, bạn có thể sử dụng nó để tương tác với cơ sở dữ liệu.

Thêm dữ liệu vào cơ sở dữ liệu vector của bạn.

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

Xóa dữ liệu khỏi cơ sở dữ liệu vector của bạn.

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

Truy vấn dữ liệu từ cơ sở dữ liệu vector của bạn.

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

#### Quan hệ

Ví dụ: cách sử dụng các tính năng quan hệ, hãy xem thư mục [examples](./demo/examples/js/relational_examples/).

Ví dụ: cách sử dụng các tính năng lưu trữ tệp, hãy xem thư mục [examples](./demo/examples/js/files_upload_examples/).

Tìm hiểu thêm trên [Docs](https://docs.ahen-studio.com/) của chúng tôi

### Python

Mesosphere cung cấp ứng dụng khách Python để tương tác với cơ sở dữ liệu, bạn có thể sử dụng cơ sở dữ liệu nhúng vectơ hoặc cơ sở dữ liệu quan hệ. Đầu tiên chúng ta sẽ xem cách sử dụng cơ sở dữ liệu nhúng vector.

#### Mô hình vectơ

Bạn có thể sử dụng nhà cung cấp mô hình AI dạng cây để tạo các phần nhúng vectơ của mình.

- [x] HuggingFace Sentence Transformers
- [x] Ollama
- [x] OpenAI

Dưới đây là một ví dụ về cách sử dụng nhà cung cấp trì hoãn này.

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

Sau khi tạo ứng dụng khách, bạn có thể sử dụng nó để tương tác với cơ sở dữ liệu.

Thêm dữ liệu vào cơ sở dữ liệu vector của bạn.

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

Xóa dữ liệu khỏi cơ sở dữ liệu vector của bạn.

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

Truy vấn dữ liệu từ cơ sở dữ liệu vector của bạn.

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

#### Quan hệ

Ví dụ: cách sử dụng các tính năng quan hệ, hãy xem thư mục [examples](./demo/examples/python/relational_examples/).

Hiện tại, máy khách python không hỗ trợ tính năng lưu trữ tệp.

#### Tích hợp

Ứng dụng khách Python cung cấp cho bạn khả năng thêm bộ nhớ vào AI bằng cách sử dụng [mem0](https://github.com/mem0ai/mem0) và [integration](./demo/integration/mem0/) của chúng tôi.

Tìm hiểu thêm trên [Docs](https://docs.ahen-studio.com/) của chúng tôi

## Tất cả là nhờ những người đóng góp của chúng tôi:

<a href="https://github.com/Ahen-Studio/mesosphere-backend/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Ahen-Studio/mesosphere-backend" />
</a>

## Giấy phép

[Apache 2.0](./LICENSE)