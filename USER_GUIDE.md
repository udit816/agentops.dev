# AgentOps - User Guide

**Turn AI Agent Failures Into Plain-English Post-Mortems**

AgentOps helps you understand why your AI agents fail, loop, hallucinate, or overspend by converting unreadable logs into clear, actionable explanations.

---

## Table of Contents

1. [What is AgentOps?](#what-is-agentops)
2. [Quick Start](#quick-start)
3. [SDK Integration](#sdk-integration)
4. [Viewing Post-Mortems](#viewing-post-mortems)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## What is AgentOps?

AgentOps is a failure intelligence platform for AI agents. It:

✅ **Captures** agent run data (steps, errors, costs)  
✅ **Analyzes** patterns (retries, loops, failures)  
✅ **Explains** what went wrong in plain English  
✅ **Visualizes** costs and signals in a web UI  

**Use Cases:**
- Debug production agent failures
- Understand cost explosions
- Detect infinite loops before they waste money
- Get root-cause analysis for hallucinations

---

## Quick Start

### 1. Deploy AgentOps

**Using Docker:**
```bash
git clone https://github.com/yourusername/agentops.dev
cd agentops.dev
docker-compose up -d
npm install
npm run setup-db
```

**Copy the API key** displayed after setup.

### 2. Start the Servers

**Backend:**
```bash
npm run dev  # Runs on http://localhost:3000
```

**Frontend:**
```bash
cd client
npm install
cp .env.local.example .env.local
# Edit .env.local and add your API key
npm run dev  # Runs on http://localhost:3001
```

### 3. Send Your First Run

```python
import requests

API_KEY = "your-api-key-here"
BASE_URL = "http://localhost:3000/api/v1"

# Start a run
requests.post(
    f"{BASE_URL}/ingest/run",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "run_id": "run-001",
        "agent_name": "my-agent",
        "framework": "langchain",
        "started_at": "2026-01-20T10:00:00Z"
    }
)

# Log a step
requests.post(
    f"{BASE_URL}/ingest/step",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "run_id": "run-001",
        "step_id": "step-001",
        "step_type": "llm_call",
        "timestamp": "2026-01-20T10:00:05Z",
        "model": "gpt-4",
        "cost_usd": 0.01,
        "tokens_prompt": 100,
        "tokens_completion": 50
    }
)
```

### 4. View in UI

Open **http://localhost:3001** to see your runs and post-mortems.

---

## SDK Integration

### Python Example (LangChain)

```python
import os
import requests
from datetime import datetime
from langchain.agents import initialize_agent, Tool
from langchain.chat_models import ChatOpenAI

# AgentOps configuration
AGENTOPS_URL = "http://localhost:3000/api/v1"
AGENTOPS_KEY = os.getenv("AGENTOPS_API_KEY")

class AgentOpsTracker:
    def __init__(self, run_id, agent_name):
        self.run_id = run_id
        self.agent_name = agent_name
        self.step_counter = 0
        
        # Start the run
        requests.post(
            f"{AGENTOPS_URL}/ingest/run",
            headers={"Authorization": f"Bearer {AGENTOPS_KEY}"},
            json={
                "run_id": run_id,
                "agent_name": agent_name,
                "framework": "langchain",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "environment": "production"
            }
        )
    
    def log_step(self, step_type, **kwargs):
        self.step_counter += 1
        step_id = f"{self.run_id}-step-{self.step_counter}"
        
        payload = {
            "run_id": self.run_id,
            "step_id": step_id,
            "step_type": step_type,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            **kwargs
        }
        
        requests.post(
            f"{AGENTOPS_URL}/ingest/step",
            headers={"Authorization": f"Bearer {AGENTOPS_KEY}"},
            json=payload
        )
        
        return step_id
    
    def end_run(self):
        requests.post(
            f"{AGENTOPS_URL}/ingest/run",
            headers={"Authorization": f"Bearer {AGENTOPS_KEY}"},
            json={
                "run_id": self.run_id,
                "agent_name": self.agent_name,
                "framework": "langchain",
                "started_at": datetime.utcnow().isoformat() + "Z",
                "ended_at": datetime.utcnow().isoformat() + "Z"
            }
        )

# Usage
tracker = AgentOpsTracker("run-123", "customer-support-agent")

try:
    # Your agent logic here
    llm = ChatOpenAI(model="gpt-4")
    
    # Log LLM call
    tracker.log_step(
        "llm_call",
        model="gpt-4",
        cost_usd=0.015,
        tokens_prompt=150,
        tokens_completion=75
    )
    
    result = llm.predict("What is the weather?")
    
    # Log tool call
    tracker.log_step(
        "tool_call",
        tool_name="weather_api",
        status="success"
    )
    
    tracker.end_run()
    
except Exception as e:
    # Log error
    tracker.log_step(
        "tool_call",
        status="error",
        error_type=str(type(e).__name__)
    )
    tracker.end_run()
    raise
```

### Node.js Example (CrewAI)

```javascript
const axios = require('axios');

const AGENTOPS_URL = 'http://localhost:3000/api/v1';
const AGENTOPS_KEY = process.env.AGENTOPS_API_KEY;

class AgentOpsTracker {
  constructor(runId, agentName) {
    this.runId = runId;
    this.agentName = agentName;
    this.stepCounter = 0;
    
    // Start run
    axios.post(`${AGENTOPS_URL}/ingest/run`, {
      run_id: runId,
      agent_name: agentName,
      framework: 'crewai',
      started_at: new Date().toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${AGENTOPS_KEY}` }
    });
  }
  
  async logStep(stepType, data = {}) {
    this.stepCounter++;
    const stepId = `${this.runId}-step-${this.stepCounter}`;
    
    await axios.post(`${AGENTOPS_URL}/ingest/step`, {
      run_id: this.runId,
      step_id: stepId,
      step_type: stepType,
      timestamp: new Date().toISOString(),
      ...data
    }, {
      headers: { 'Authorization': `Bearer ${AGENTOPS_KEY}` }
    });
    
    return stepId;
  }
  
  async endRun() {
    await axios.post(`${AGENTOPS_URL}/ingest/run`, {
      run_id: this.runId,
      agent_name: this.agentName,
      framework: 'crewai',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString()
    }, {
      headers: { 'Authorization': `Bearer ${AGENTOPS_KEY}` }
    });
  }
}

// Usage
const tracker = new AgentOpsTracker('run-456', 'data-analyst');

try {
  await tracker.logStep('llm_call', {
    model: 'gpt-4',
    cost_usd: 0.02,
    tokens_prompt: 200,
    tokens_completion: 100
  });
  
  // Your agent logic...
  
  await tracker.endRun();
} catch (error) {
  await tracker.logStep('action', {
    status: 'error',
    error_type: error.name
  });
  await tracker.endRun();
}
```

---

## Viewing Post-Mortems

### Run List Page

**URL:** http://localhost:3001

**Features:**
- See all your agent runs
- Status badges (complete/incomplete/failed)
- Sort by timestamp
- Click "View Details" to see post-mortem

### Run Detail Page

**URL:** http://localhost:3001/runs/{run_id}

**What You'll See:**

**1. Post-Mortem Analysis**
- **Classification**: Type of failure (control_flow, cost_explosion, etc.)
- **Summary**: One-line explanation
- **What happened**: Chronological breakdown
- **Why it failed**: Root cause analysis
- **Where it failed**: Specific steps involved
- **Cost impact**: Financial breakdown

**2. Failure Signals**
- Retry patterns detected
- Loop behaviors
- Error counts
- Tool failures
- Latency spikes

**3. Cost Summary**
- Total USD cost
- Token breakdown (prompt + completion)
- Most expensive step
- Cost by step type

**4. Timeline**
- Start/end timestamps
- Total duration
- Step count

---

## API Reference

### Authentication

All requests require an API key:

```bash
Authorization: Bearer YOUR_API_KEY
```

Or as query parameter:
```bash
?api_key=YOUR_API_KEY
```

### Endpoints

#### POST /api/v1/ingest/run

Start or end a run.

**Request:**
```json
{
  "run_id": "run-001",
  "agent_name": "my-agent",
  "framework": "langchain",
  "started_at": "2026-01-20T10:00:00Z",
  "ended_at": "2026-01-20T10:05:00Z",
  "environment": "production",
  "tags": ["experiment-1"]
}
```

**Response:** `201 Created`

---

#### POST /api/v1/ingest/step

Log a step event.

**Request:**
```json
{
  "run_id": "run-001",
  "step_id": "step-001",
  "step_type": "llm_call",
  "timestamp": "2026-01-20T10:00:05Z",
  "model": "gpt-4",
  "status": "success",
  "latency_ms": 1200,
  "tokens_prompt": 150,
  "tokens_completion": 75,
  "cost_usd": 0.015
}
```

**Step Types:**
- `llm_call` - LLM generation
- `tool_call` - External tool/API call
- `memory_read` - RAG/memory retrieval
- `memory_write` - Save to memory
- `action` - General action
- `retry` - Retry attempt

**Response:** `201 Created`

---

#### GET /api/v1/runs

List recent runs.

**Query Params:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "runs": [
    {
      "run_id": "run-001",
      "agent_name": "my-agent",
      "framework": "langchain",
      "started_at": "2026-01-20T10:00:00Z",
      "status": "complete"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0
  }
}
```

---

#### GET /api/v1/runs/:runId

Get full reconstruction with post-mortem.

**Response:**
```json
{
  "run": {
    "metadata": { ... },
    "steps": [ ... ],
    "signals": {
      "retries": [],
      "loops": [],
      "errors": [],
      "hasAnomalies": true
    },
    "cost": {
      "totalCostUsd": 0.32,
      "totalTokens": 10650
    },
    "postMortem": {
      "classification": {
        "primaryType": "cost_explosion",
        "confidence": 0.8
      },
      "explanation": "..."
    }
  }
}
```

---

#### GET /api/v1/runs/:runId/postmortem

Get post-mortem only (faster).

**Response:**
```json
{
  "postMortem": {
    "classification": { ... },
    "explanation": "...",
    "generatedAt": "2026-01-20T10:30:00Z"
  }
}
```

---

## Troubleshooting

### "Unauthorized" error

**Problem:** API returns 401

**Solution:**
- Check your API key is correct
- Ensure `Authorization: Bearer YOUR_KEY` header is set
- Generate a new key: `npm run generate-key`

### "Run not found" in UI

**Problem:** Frontend shows 404 error

**Solution:**
- Verify backend is running on port 3000
- Check `NEXT_PUBLIC_API_URL` in `client/.env.local`
- Ensure the run exists: `curl http://localhost:3000/api/v1/runs`

### Post-mortem shows "unclear" classification

**Problem:** System can't determine failure type

**Possible Reasons:**
- Run succeeded (no failure)
- Not enough signal data (add more step events)
- Failure type requires semantic analysis (hallucination, context failure)

**Solution:**
- Log `status: "error"` on failed steps
- Add `error_type` field for better classification
- Use `retry` step type for retry patterns

### No runs showing in UI

**Problem:** Run list is empty

**Solution:**
- Run test ingestion: `npm run test-ingestion`
- Check PostgreSQL is running: `docker ps`
- Verify API key works: `curl -H "Authorization: Bearer YOUR_KEY" http://localhost:3000/api/v1/runs`

### Cost is always $0

**Problem:** Cost summary shows zero

**Reason:** You're not logging `cost_usd` or token fields

**Solution:**
```python
tracker.log_step(
    "llm_call",
    cost_usd=0.015,  # Add this
    tokens_prompt=150,  # Add this
    tokens_completion=75  # Add this
)
```

---

## Best Practices

### 1. Always Log Costs

Include `cost_usd`, `tokens_prompt`, and `tokens_completion` for every LLM call:

```python
tracker.log_step(
    "llm_call",
    model="gpt-4",
    cost_usd=0.015,
    tokens_prompt=150,
    tokens_completion=75
)
```

### 2. Mark Failed Steps

Set `status: "error"` and `error_type` for failures:

```python
tracker.log_step(
    "tool_call",
    tool_name="weather_api",
    status="error",
    error_type="timeout"
)
```

### 3. End Your Runs

Always call `ended_at` when done:

```python
requests.post(
    f"{BASE_URL}/ingest/run",
    json={
        "run_id": "run-001",
        "ended_at": datetime.utcnow().isoformat() + "Z"
    }
)
```

### 4. Use Meaningful Run IDs

Use descriptive, unique IDs:
- ✅ `run-2026-01-20-customer-123`
- ❌ `run-1`

---

## Next Steps

- **Production Deploy**: See deployment guide
- **Custom Integrations**: Build your own SDK wrapper
- **Analytics**: Export data for further analysis
- **Alerts**: Set up notifications for high-cost runs

---

**Questions?** Check the [GitHub Issues](https://github.com/yourusername/agentops.dev/issues) or contribute!
