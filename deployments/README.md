## Deployment

This directory contains the deployment scripts for the project.

### Local

Use `deployment/local/docker-compose.yml` to start:

1. `skypydb-api` on port `8000`
2. MySQL 8.4
3. Optional Adminer UI (`--profile debug`)
4. TypeScript function source mounted from:
   - `demo/examples/python/relational_examples/skypydb/`

```bash
docker compose -f deployment/local/docker-compose.yml up -d
```

No build step is required for relational functions in local mode.

### Google Cloud

Use:

- `deployment/google/docker-compose.yml` for MySQL on GCE VM
- `deployment/google/cloudrun-service.yaml` for Cloud Run API deployment
- `deployment/google/README.md` for full runbook
