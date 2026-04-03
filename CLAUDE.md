# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mesosphere is an open-source relational and vector embeddings database. This is a monorepo containing:

- **Rust backend** (`/rust`) — Axum HTTP server with MySQL (SQLx), providing relational functions, file storage, and vector embeddings APIs
- **TypeScript/JS client** (`/mesosphere-js`) — SDK with ESM/CJS dual exports and a CLI
- **Python client** (`/mesosphere`) — SDK using httpx + sentence-transformers
- **Rust client** (`/mesosphere-rs`)
- **Frontend apps** (`/apps`) — Docusaurus docs site + three Next.js dashboards (EU, US, self-hosted)
- **Shared packages** (`/packages`) — eslint-config, typescript-config, UI component library

License: FSL-1.1-ALv2 (not Apache 2.0).

## Build & Dev Commands

### Monorepo (npm workspaces + Turborepo)

```bash
npm install            # install all workspace deps (requires Node >=22, npm 11.6.2)
npm run build          # turbo build all packages
npm run dev            # turbo dev (watch mode)
npm run lint           # turbo lint (eslint, --max-warnings 0)
npm run check-types    # turbo tsc --noEmit
npm run format         # prettier on ts/tsx/md/mdx files
```

### Rust backend

```bash
cd rust
cargo build            # compile
cargo run              # start server (needs DATABASE_URL and other env vars)
cargo test             # run tests
cargo check            # fast type-check
```

Env vars for the backend are loaded via `dotenv`. See `AppConfig` in `rust/application/` for the full list (SERVER_PORT, API_KEY, MYSQL_URL, LOG_LEVEL, CORS_ORIGINS, etc.).

### TypeScript/JS SDK

```bash
cd mesosphere-js
npm run build          # tsup build (clean + codegen)
npm run test           # vitest run
npm run check-types    # tsc --noEmit
```

### Python SDK

```bash
pip install -e ".[mem0]"   # editable install with optional mem0 integration
```

### Formatting

- **dprint** is configured at root for TS, JSON, Markdown, TOML, Dockerfile, CSS, HTML, YAML
- **prettier** handles ts/tsx/md/mdx via `npm run format`

## Architecture

### Rust Backend (`/rust/main.rs`)

Layered Axum application:

1. **Middleware stack**: request ID → tracing → CORS → API key auth
2. **Route groups**: public storage routes at `/v1`, protected routes (storage, functions, vectors) behind API key middleware
3. **Bootstrap**: loads env config → inits metrics/tracing → builds MySQL pool → runs migrations → optional file backup → starts server

Key crates (all prefixed `mesosphere-`):

- `application` — `AppConfig` (env-based) and `AppState` (shared state)
- `authentication` — `require_api_key` middleware
- `relational` — function execution and storage (routes, repos, models)
- `vector` — vector collection CRUD and cosine similarity search (encode/decode/score)
- `database` — query building abstractions
- `db_connection` — MySQL connection pool builder
- `mysql` — bootstrap migrations
- `file_storage` — file handling + backup-on-startup
- `metrics` / `telemetry` — Prometheus metrics and tracing
- `common` — shared middleware and OpenAPI schema generation
- `health_check` — health endpoint

### Client Libraries

All three SDKs (JS, Python, Rust) are HTTP clients wrapping the backend REST API at `/v1`.

The JS SDK (`mesosphere-js`) also includes sub-packages: `mesosphere/httpclient`, `mesosphere/functions`, `mesosphere/serverside`. It has framework-specific wrappers under `reactlibrary`, `svelte`, `vue`, and auth integrations (`reactlibrary-auth0`, `reactlibrary-clerk`, `reactlibrary-betterauth`).

### Frontend Apps

- `apps/docs` — Docusaurus 3.9 documentation site, deployed to Cloudflare Pages
- `apps/{eu,us}-dashboard` and `apps/self-hosted-dashboard` — Next.js 16 + React 19 dashboards using `@opennextjs/cloudflare`

## Important Notes

- **Deprecated Python modules**: `mesosphere/embeddings`, `mesosphere/functions`, `mesosphere/httpclient`, `mesosphere/utils` are all deprecated and slated for deletion. The active code is in `mesosphere/client` and `mesosphere/vectorclient`.
- **Test examples**: `/mesosphere-tests` contains 30+ example apps covering various auth providers and frameworks — useful as integration test references.
- **CI/CD**: GitHub Actions workflows in `.github/workflows/` handle releases to npm, PyPI, crates.io, and Docker. PR trust is managed via a vouch system (`.github/VOUCHED.td`).
