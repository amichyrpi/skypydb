## Google Deployment (Cloud Run + GCE MySQL)

This directory contains deployment artifacts for:

1. Rust API on Cloud Run (port `8000`)
2. Self-managed MySQL on a Google Compute Engine VM using Docker Compose

### 1 Provision MySQL VM

Create a VM with persistent disks mounted at:

- `/mnt/disks/mysql-data`
- `/mnt/disks/mysql-backups`

Copy this folder to the VM and run:

```bash
cd deployment/google
chmod +x scripts/backup.sh
docker compose up -d
```

Environment variables required on VM:

- `MYSQL_PASSWORD`
- `MYSQL_ROOT_PASSWORD`

### 2 Build and push API image

```bash
gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT_ID/mesosphere/mesosphere-api:latest .
```

### 3 Configure secrets

Create Secret Manager entries:

- `mesosphere-api-key`
- `mesosphere-mysql-url`
- `mesosphere-gcs-backup-bucket`

`mesosphere-mysql-url` should point to your VM private IP, for example:

```text
mysql://mesosphere:<password>@10.10.0.5:3306/mesosphere
```

`mesosphere-gcs-backup-bucket` should contain the target GCS bucket name used for
startup snapshot artifacts (for example: `my-mesosphere-backups`).

### 4 Deploy Cloud Run service

Update placeholders in `cloudrun-service.yaml`:

- `PROJECT_ID`
- `REGION`
- `CONNECTOR_NAME`

Deploy:

```bash
gcloud run services replace cloudrun-service.yaml --region REGION
```

Cloud Run defaults in `cloudrun-service.yaml` now include:

- `MESOSPHERE_POSTHOG_HOST=https://eu.i.posthog.com`
- startup backup enabled with `MESOSPHERE_BACKUP_TARGET=gcs`

Ensure the Cloud Run service account has:

- `Storage Object Creator` on the backup bucket
- `Storage Object Viewer` if read/list access is needed later

### 5 Smoke test

```bash
curl -H "X-API-Key: <api-key>" https://<cloud-run-url>/healthz
curl -H "X-API-Key: <api-key>" https://<cloud-run-url>/openapi.json
```
