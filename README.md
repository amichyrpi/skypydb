<div align="center">
 <img alt="Skypydb" width="auto" height="auto" src="https://github.com/Ahen-Studio/skypydb/blob/main/docs/logo/dark.svg#gh-light-mode-only">
 <img alt="Skypydb" width="auto" height="auto" src="https://github.com/Ahen-Studio/skypydb/blob/main/docs/logo/dark.svg#gh-dark-mode-only">
</div>

<p align="center">
  <b>Skypydb</b> is a Rust + MySQL backend with HTTP SDKs for vector and relational workloads.
</p>

## HTTP-only SDKs

Python and TypeScript SDKs are HTTP-only.

- Backend default URL: `http://localhost:8000`
- Auth header: `X-API-Key`
- No local runtime database files are created by the SDKs

## Python quickstart

```bash
pip install skypydb
```

```python
from skypydb import HttpClient

client = HttpClient(
    api_url="http://localhost:8000",
    api_key="local-dev-key",
)

collection = client.get_or_create_collection("docs")
collection.add(
    ids=["doc1"],
    documents=["Skypydb stores vectors and relational rows over HTTP."],
)
print(collection.query(query_texts=["How does Skypydb work?"], n_results=1))
```

## TypeScript quickstart

```bash
cd skypydb-js
npm install
npm run build
```

```ts
import { httpClient } from "skypydb";

const client = httpClient({
  api_url: "http://localhost:8000",
  api_key: "local-dev-key",
});

const users = client.relational("users");
const id = await users.insert({ name: "Theo", email: "theo@example.com" });
const rows = await users.query({ orderBy: [{ field: "name", direction: "asc" }] });
console.log(id, rows);
```

## Relational schema apply

```python
client.schema.apply(
    {
        "tables": {
            "users": {
                "fields": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                },
                "indexes": [{"name": "by_email", "columns": ["email"]}],
            }
        }
    }
)
```

## Backend

The Rust backend and deployment assets are in `rust/` and `deployment/`.

- Local compose: `deployment/local/docker-compose.yml`
- Google compose scaffold: `deployment/google/docker-compose.yml`

## Examples

Examples are in `demo/examples`:

- JavaScript vector, cloud, relational examples
- Python vector, cloud, relational examples
- mem0 integration examples under `demo/integration/mem0`

## License

[MIT](./LICENSE)
