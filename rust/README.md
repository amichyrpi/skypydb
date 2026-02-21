## Rust Backend (`skypydb`)

This crate hosts the production backend API for Skypydb.

### Features

- REST JSON API on port `8000`
- API key auth (`X-API-Key`)
- MySQL-backed relational and vector operations
- Non-destructive schema management
- OpenAPI document at `/openapi.json`

### Run locally

```bash
cargo run -p skypydb
```

Required env vars:

- `SKYPYDB_API_KEY`
- `SKYPYDB_MYSQL_URL`

Optional env vars:

- `SKYPYDB_SERVER_PORT` (default `8000`)
- `SKYPYDB_MYSQL_POOL_MIN` (default `1`)
- `SKYPYDB_MYSQL_POOL_MAX` (default `10`)
- `SKYPYDB_LOG_LEVEL` (default `info`)
- `SKYPYDB_CORS_ORIGINS` (default `*`)
- `SKYPYDB_VECTOR_MAX_DIM` (default `4096`)
- `SKYPYDB_QUERY_MAX_LIMIT` (default `500`)

### Tests

Unit tests run with:

```bash
cargo test -p skypydb
```

Integration test (`rust/tests/integration_mysql.rs`) requires:

```bash
SKYPYDB_TEST_MYSQL_URL=mysql://user:password@host:3306/database
```
