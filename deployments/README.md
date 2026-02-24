## Deployment

This directory contains the deployment scripts for the project.

### Local

Use `deployments/local/docker-compose.yml` to start:

1. `skypydb-api` on port `8000`
2. MySQL 8.4
3. Optional Adminer UI (`--profile debug`)

No function source bind mount is required.
Deploy functions from any directory with the CLI:

```powershell
docker compose -f deployments/local/docker-compose.yml up -d
npx skypydb deploy --local --source C:/path/to/your/functions
```

```bash
docker compose -f deployments/local/docker-compose.yml up -d
npx skypydb deploy --local --source /path/to/your/functions
```

The deploy command also generates/updates `deploy.ts` in the source directory.

### Cloud

Deploy to a cloud backend by setting API URL/API key and running:

```bash
SKYPYDB_API_URL=https://your-api.example.com \
SKYPYDB_API_KEY=your-api-key \
npx skypydb deploy --cloud --source /path/to/your/functions
```

### Google Cloud

Use:

- `deployments/google/docker-compose.yml` for MySQL on GCE VM
- `deployments/google/cloudrun-service.yaml` for Cloud Run API deployment
- `deployments/google/README.md` for full runbook
