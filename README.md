# Agent Run & Failure Intelligence

> Post-run observability and failure analysis for agentic AI systems

**We help teams understand why AI agents fail, loop, hallucinate, or overspend — in plain English.**

---

## 🎯 What This Is

Agent Run & Failure Intelligence converts unreadable agent logs into clear, step-by-step narratives with root-cause analysis. When your **LangChain**, **CrewAI**, or custom agent fails, we explain:

* **What** failed
* **Why** it failed
* **Where** in the run it failed
* **Cost impact** of the failure

**Outcome:** Explain any agent failure to another engineer in under **60 seconds**.

---

## 📖 Documentation

* **[USER_GUIDE.md](USER_GUIDE.md)** — Complete integration guide with SDK examples
* **[QUICKSTART.md](QUICKSTART.md)** — Fast local setup and testing
* **[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md)** — Architecture, contracts, and design decisions

---

## ✅ V1 Status

**All 4 Weeks Delivered**

* ✅ **Week 1:** Ingestion API + immutable event store
* ✅ **Week 2:** Run reconstruction + signal extraction
* ✅ **Week 3:** Failure classification + plain‑English post‑mortems
* ✅ **Week 4:** UI + production readiness

### Try it now

1. `docker-compose up -d && npm run setup-db`
2. `npm run dev` (backend on **[http://localhost:3000](http://localhost:3000)**)
3. `cd client && npm run dev` (frontend on **[http://localhost:3001](http://localhost:3001)**)
4. Open **[http://localhost:3001](http://localhost:3001)** to explore runs

---

## 🚀 Quick Start

### Prerequisites

* Node.js **20+**
* PostgreSQL **15+**

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=agentops
DB_USER=postgres
DB_PASSWORD=your_password_here
```

### 3. Setup Database

```bash
npm run setup-db
```

This will:

* Create tables: `agent_runs`, `agent_steps`, `api_keys`
* Generate your first API key (**save it**)

### 4. Start the Server

```bash
npm run dev
```

Server runs on **[http://localhost:3000](http://localhost:3000)**

### 5. Test the API

#### Health check

```bash
curl http://localhost:3000/health
```

#### Ingest a run

```bash
curl -X POST http://localhost:3000/api/v1/ingest/run \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-001",
    "agent_name": "my-agent",
    "framework": "langchain",
    "started_at": "2026-01-20T08:00:00Z"
  }'
```

#### Ingest a step

```bash
curl -X POST http://localhost:3000/api/v1/ingest/step \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "run_id": "test-001",
    "step_id": "step-001",
    "step_type": "llm_call",
    "timestamp": "2026-01-20T08:00:05Z",
    "model": "gpt-4",
    "tokens_prompt": 150,
    "tokens_completion": 75,
    "cost_usd": 0.0045,
    "status": "success"
  }'
```

---

## 📚 API Reference

### Authentication

All endpoints require an API key via **one** of the following:

* **Header:** `Authorization: Bearer YOUR_API_KEY`
* **Query:** `?api_key=YOUR_API_KEY`

---

### Endpoints

#### POST `/api/v1/ingest/run`

Ingest run metadata.

**Request body**

```json
{
  "run_id": "string (required)",
  "agent_name": "string (required)",
  "framework": "langchain | crewai | custom | other (required)",
  "started_at": "ISO-8601 timestamp (required)",
  "ended_at": "ISO-8601 timestamp (optional)",
  "environment": "local | staging | prod (optional)",
  "tags": ["string"]
}
```

**Response:** `202 Accepted`

---

#### POST `/api/v1/ingest/step`

Ingest a single step event.

**Request body**

```json
{
  "step_id": "string (required)",
  "run_id": "string (required)",
  "step_type": "llm_call | tool_call | memory_read | memory_write | action | retry (required)",
  "timestamp": "ISO-8601 timestamp (required)",
  "model": "string (optional)",
  "tool_name": "string (optional)",
  "status": "success | error (optional)",
  "error_type": "string (optional)",
  "latency_ms": "number (optional)",
  "tokens_prompt": "number (optional)",
  "tokens_completion": "number (optional)",
  "cost_usd": "number (optional)"
}
```

**Response:** `202 Accepted`

---

#### POST `/api/v1/webhook/batch`

Batch ingestion via webhook.

**Request body**

```json
{
  "runs": ["run objects"],
  "steps": ["step objects"]
}
```

**Response:** `202 Accepted`

---

### Rate Limits

* **1000 requests / hour / API key**
* **100 KB max payload size**

### Error Codes

* `400` — Bad Request (schema validation failed)
* `401` — Unauthorized (missing or invalid API key)
* `413` — Payload Too Large
* `429` — Too Many Requests
* `500` — Internal Server Error

---

## 🛠️ Development

### Commands

```bash
npm run dev           # Start dev server with hot reload
npm run build         # Build for production
npm run start         # Start production server
npm run setup-db      # Initialize database
npm run generate-key  # Generate new API key
npm test              # Run tests
npm run lint          # Lint code
npm run format        # Format code
```

### Generate API Keys

```bash
npm run generate-key -- --user="your-user-id"
```

---

## 📁 Project Structure

```text
agentops.dev/
├── src/
│   ├── api/
│   │   ├── middleware/      # Auth, rate limiting, error handling
│   │   └── routes/          # Ingestion endpoints
│   ├── db/
│   │   ├── client.ts        # PostgreSQL connection
│   │   └── schema.sql       # Database schema
│   ├── services/
│   │   └── eventStore.ts    # Immutable event persistence
│   ├── validation/
│   │   └── schemas.ts       # Zod schemas
│   ├── utils/
│   │   └── apiKey.ts        # API key generation / hashing
│   ├── server.ts            # Express app setup
│   └── index.ts             # Entry point
├── scripts/
│   ├── setup-db.ts
│   └── generate-api-key.ts
├── tests/
│   └── fixtures/
└── PROJECT_CONTEXT.md       # Source of truth
```

---

## 📋 SDK Contract (v1)

Per `PROJECT_CONTEXT.md`, this contract is **stable for v1**.

### Required Fields — Run

* `run_id` (string)
* `agent_name` (string)
* `framework` (enum)
* `started_at` (ISO‑8601)

### Required Fields — Step

* `step_id` (string)
* `step_type` (enum)
* `timestamp` (ISO‑8601)

### Explicitly Excluded (v1)

* Raw prompts / responses (unless opt‑in)
* PII
* Secrets or credentials

---

## 🗓️ Roadmap

* **Week 1:** Foundations & ingestion ✅
* **Week 2:** Reconstruction & signals ✅
* **Week 3:** Classification & explanation ✅
* **Week 4:** UI, polish, release ✅

**V1 is complete.** See **USER_GUIDE.md** for integration details.

---

## 📄 License

MIT

---

## 🤝 Contributing

This is a MicroSaaS in active development.

For questions, issues, or design rationale, see **PROJECT_CONTEXT.md**.
