# Skypydb Local Project

This folder contains TypeScript files for a Skypydb backend project.

Suggested next files:

1. `schemas.ts` with the schema JSON payload sent to `/v1/admin/schema/apply`
2. helper modules that call `client.relational("<table>")` over HTTP
3. a client entrypoint that configures `api_url` and `api_key`

Typecheck your project files with:

```bash
npx tsc -p skypydb/tsconfig.json
```
