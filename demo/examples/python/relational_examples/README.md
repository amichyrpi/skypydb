## Relational Example

This example uses the Python HTTP SDK and calls backend-executed TypeScript functions via `/v1/functions/call`.

### 1) Build the TypeScript function manifest

From this folder (`demo/examples/python/relational_examples`):

```bash
npx skypydb functions build
```

This generates:

- `./skypydb/.generated/functions.manifest.json`

### 2) Start backend with manifest path

From repository root:

```bash
set SKYPYDB_FUNCTIONS_MANIFEST_PATH=demo/examples/python/relational_examples/skypydb/.generated/functions.manifest.json
set SKYPYDB_API_KEY=local-dev-key
# plus your MySQL env vars
```

Start the Rust backend after setting env vars.

If you use Docker Compose local deployment, this path is mounted automatically by
`deployment/local/docker-compose.yml`.

### 3) Run the Python client

From this folder:

```bash
set SKYPYDB_API_URL=http://localhost:8000
set SKYPYDB_API_KEY=local-dev-key
python src/client.py
```
