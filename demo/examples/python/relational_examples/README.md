## Relational Example (Python, HTTP)

This example uses the Python HTTP SDK only:

1. `skypydb.httpClient(...)` to connect to the backend.
2. `client.schema.apply(...)` to configure schema.
3. `client.relational("table")` for insert/update/delete/move/query/count/first.

### Run

From the repository root:

```bash
python demo/examples/python/relational_examples/src/client.py
```

### Backend requirement

Run the Rust API backend on `http://localhost:8000` and use a valid `X-API-Key`
value (`local-dev-key` in local compose defaults).
