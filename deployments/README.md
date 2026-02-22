## Deployment

This directory contains the deployment scripts for the project.

### Local

Use `deployment/local/docker-compose.yml` to start:

1. `skypydb-api` on port `8000`
2. MySQL 8.4
3. Optional Adminer UI (`--profile debug`)
4. TypeScript function manifest mounted from:
   - `demo/examples/python/relational_examples/skypydb/.generated/functions.manifest.json`

```bash
docker compose -f deployment/local/docker-compose.yml up -d
```

Before running relational function examples, build the manifest:

```bash
cd demo/examples/python/relational_examples
npx skypydb functions build
```

### Google Cloud

Use:

- `deployment/google/docker-compose.yml` for MySQL on GCE VM
- `deployment/google/cloudrun-service.yaml` for Cloud Run API deployment
- `deployment/google/README.md` for full runbook
