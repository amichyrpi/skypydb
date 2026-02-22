## Relational Example

This example calls backend-executed TypeScript functions through the HTTP SDK.

### 1) Build TypeScript SDK (once)

From repository root:

```bash
cd skypydb-js
npm install
npm run build
cd ..
```

### 2) Build the example function manifest

From `demo/examples/js/relational_examples`:

```bash
npx skypydb functions build
```

This writes:

- `./skypydb/.generated/functions.manifest.json`

### 3) Start backend with manifest path

From repository root:

```bash
set SKYPYDB_FUNCTIONS_MANIFEST_PATH=demo/examples/js/relational_examples/skypydb/.generated/functions.manifest.json
set SKYPYDB_API_KEY=local-dev-key
# plus your MySQL env vars
```

Start the Rust backend after setting env vars.

### 4) Run the JS client

From `demo/examples/js/relational_examples`:

```bash
npm install
set SKYPYDB_API_URL=http://localhost:8000
set SKYPYDB_API_KEY=local-dev-key
npx tsx src/client.ts
```