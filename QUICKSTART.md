# Week 1 Quick Start Guide

This guide will help you verify the Week 1 implementation.

## Prerequisites

You need either:
- **Option A:** Docker Desktop (recommended for quick testing)
- **Option B:** PostgreSQL 15+ installed locally

## Option A: Using Docker (Recommended)

### 1. Start PostgreSQL

```bash
docker-compose up -d
```

This starts PostgreSQL on port 5432. Wait a few seconds for it to initialize.

### 2. Initialize Database

```bash
npm run setup-db
```

**IMPORTANT:** Save the API key that's displayed!

### 3. Start the Server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

### 4. Test Ingestion

In a new terminal:

```bash
tsx scripts/test-ingestion.ts
```

This will insert all canonical failure scenarios from PROJECT_CONTEXT.md.

### 5. Test API Endpoints

Replace `YOUR_API_KEY` with the key from step 2:

```bash
# Health check
curl http://localhost:3000/health

# Ingest a run
curl -X POST http://localhost:3000/api/v1/ingest/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "manual-test-001",
    "agent_name": "test-agent",
    "framework": "langchain",
    "started_at": "2026-01-20T08:00:00Z"
  }'

# Ingest a step
curl -X POST http://localhost:3000/api/v1/ingest/step \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "manual-test-001",
    "step_id": "step-001",
    "step_type": "llm_call",
    "timestamp": "2026-01-20T08:00:05Z",
    "status": "success"
  }'
```

### 6. Verify in Database

```bash
docker exec -it agentops-postgres psql -U postgres -d agentops
```

Then run:

```sql
-- See all runs
SELECT run_id, agent_name, framework, started_at FROM agent_runs;

-- See all steps
SELECT run_id, step_id, step_type, status FROM agent_steps;

-- Exit
\q
```

### 7. Stop PostgreSQL

```bash
docker-compose down
```

---

## Option B: Local PostgreSQL

If you have PostgreSQL installed locally:

1. Update `.env` with your PostgreSQL credentials
2. Create the database: `createdb agentops`
3. Follow steps 2-6 from Option A above

---

## Troubleshooting

### Port 5432 already in use
Stop existing PostgreSQL or change the port in `docker-compose.yml`

### Database connection failed
- Check PostgreSQL is running: `docker ps`
- Verify credentials in `.env`

### API returns 401
- Make sure you're using the API key from `npm run setup-db`
- Check the `Authorization` header format

---

## Next Steps

With Week 1 complete, you can now:
- ✅ Ingest agent runs via API
- ✅ Store events immutably in PostgreSQL
- ✅ Validate schemas with Zod
- ✅ Enforce rate limits and payload sizes

**Week 2 Preview:** Run reconstruction and signal extraction
