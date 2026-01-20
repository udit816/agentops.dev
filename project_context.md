# Project Name
Agent Run & Failure Intelligence (MicroSaaS)

# One-Line Pitch
We help teams understand why AI agents fail, loop, hallucinate, or overspend — in plain English.

# Chosen Wedge (LOCKED)
Post-run observability and failure analysis for agentic AI systems (LangChain / CrewAI / custom agents).

# Non-Goals (Critical)
- No agent orchestration or execution
- No prompt engineering services
- No model hosting or fine-tuning
- No replacement of existing logging/infra tools
- No autonomous remediation or self-healing (for now)

# ICP
AI engineers, MLOps engineers, and small GenAI teams building agent-based workflows in startups or enterprises.

# Why People Pay vs Free Alternatives
- Converts unreadable logs into step-by-step agent narratives with root-cause analysis
- Prevents silent failures and runaway costs that existing logging tools do not explain

# MVP Scope (Current)
- Agent run timeline (LLM calls, tools, memory, actions)
- Automatic failure classification (hallucination, tool error, loop, bad context)
- Cost attribution per run / per agent
- Plain-English post-mortem explanation
- SDK + webhook-based ingestion

# Atomic User Journey (LOCKED)
**Trigger:** An agent run fails, loops, produces a wrong output, or incurs unexpectedly high cost.

**Step 1 — Ingest:** Developer sends run metadata via SDK or webhook (run_id, agent name, framework, logs).

**Step 2 — Understand:** System reconstructs the run into a chronological narrative with:
- What the agent tried to do
- Where it deviated or failed
- What signals indicate the failure type

**Step 3 — Explain:** User receives a plain-English post-mortem answering:
- What failed
- Why it failed
- Where in the run it failed
- Approximate cost impact

**Success Definition:** A developer can explain the failure to another engineer in under 60 seconds.

# Failure Taxonomy v1 (LOCKED)
The system classifies each agent run into **one primary failure type** (with optional secondary tags).

1. **Hallucination / Invalid Output**
   - Confident but incorrect or unverifiable answers
   - Fabricated facts, APIs, citations, or entities

2. **Tool Execution Failure**
   - Tool/API errors, timeouts, schema mismatches
   - Null or malformed responses not handled by the agent

3. **Context Failure**
   - Missing, outdated, or incorrect context/memory
   - RAG retrieval failures or irrelevant context injection

4. **Control Flow Failure (Loop / Stall)**
   - Infinite or near-infinite loops
   - Repeated retries without state change or progress

5. **Instruction Misalignment**
   - Agent follows instructions literally but incorrectly
   - Conflicting system / developer / tool prompts

6. **Cost Explosion (Non-Functional Failure)**
   - Excessive token usage relative to task complexity
   - Run succeeds functionally but violates cost expectations

**Explicit Exclusions (v1):**
- No accuracy scoring
- No performance optimization suggestions
- No auto-fix or remediation

# Pricing Posture (LOCKED)
**Primary model:** Usage-based pricing aligned to **agent runs** (not seats).

**Principles:**
- Charge for *diagnosed value*, not dashboards or storage
- Pricing scales with engineering activity, not team size
- Free tier allows limited runs to build trust and adoption

**Included in paid usage:**
- Run reconstruction and failure classification
- Plain-English post-mortem generation
- Cost attribution per run

**Not monetized (v1):**
- Number of users/seats
- Agent frameworks supported
- Historical data beyond base retention window

**Future pricing levers (explicitly deferred):**
- Enterprise retention windows
- Advanced evals or benchmarks
- Governance and compliance features

# README / Landing Narrative (LOCKED)
1. **Problem:** When AI agents fail, teams are left with raw logs, rising costs, and no clear explanation of what went wrong.
2. **Solution:** Agent Run & Failure Intelligence reconstructs each agent run into a human-readable timeline and explains failures in plain English.
3. **How it works:** Send run data via SDK or webhook; we classify the failure, pinpoint where it happened, and show the cost impact.
4. **Why it’s different:** We focus on *post-run understanding*, not orchestration or auto-fixing—so engineers get clarity fast without changing their stack.
5. **Outcome:** Engineers can explain any agent failure to another engineer in under 60 seconds.

# Data Logging & Privacy Posture (LOCKED)
**Principle:** We log only what is required to explain *why* an agent failed. We never log data to improve models or resell insights.

## What We Log (v1)
- Agent run metadata (run_id, agent name, framework, timestamps)
- Step-level events (LLM call, tool invocation, memory read/write, action)
- Token usage and cost metrics (prompt tokens, completion tokens)
- Error signals (exceptions, retries, null responses, timeouts)
- User-provided tags or annotations (optional)

## What We NEVER Log
- Raw end-user PII or personal content by default
- Full prompt or response bodies unless explicitly enabled
- API keys, secrets, credentials, or auth tokens
- Training data for model fine-tuning
- Cross-customer data or shared agent insights

## Retention (v1)
- Default short retention window suitable for debugging
- Automatic deletion after retention window expires
- No long-term archival unless explicitly configured in future plans

## Explicit Non-Goals
- No model training on customer data
- No behavioral profiling or usage resale
- No silent data capture

# Minimal SDK Contract (LOCKED)
**Design goal:** Small, framework-agnostic, append-only events. If a field is not listed here, it does not exist in v1.

## Required (per run)
- `run_id` (string): Client-generated unique identifier
- `agent_name` (string)
- `framework` (enum): langchain | crewai | custom | other
- `started_at` (ISO-8601 timestamp)

## Optional (per run)
- `ended_at` (ISO-8601 timestamp)
- `environment` (enum): local | staging | prod
- `tags` (string[])

## Required (per step/event)
- `step_id` (string)
- `step_type` (enum): llm_call | tool_call | memory_read | memory_write | action | retry
- `timestamp` (ISO-8601 timestamp)

## Optional (per step/event)
- `model` (string)
- `tool_name` (string)
- `status` (enum): success | error
- `error_type` (string)
- `latency_ms` (number)
- `tokens_prompt` (number)
- `tokens_completion` (number)
- `cost_usd` (number)

## Explicitly Excluded (v1)
- Raw prompts or responses (unless opt-in)
- File contents or payload bodies
- Secrets or credentials
- PII fields

## Ingestion Modes (v1)
- Server-side SDK (Node.js / Python)
- HTTPS webhook (JSON)

**Stability promise:** This contract is stable for v1. Additions require a minor version bump; breaking changes require v2.

# v1 Architecture (LOCKED — Boxes Only)
**Design goal:** Simple, observable, and replaceable components. No tight coupling. No orchestration.

1. **Ingestion Layer**
   - Receives events via SDK or webhook
   - Validates schema and timestamps
   - Enforces rate limits and size caps

2. **Event Store (Append-Only)**
   - Persists raw run and step events
   - Immutable writes; no in-place updates
   - Short default retention aligned with pricing posture

3. **Run Reconstructor**
   - Groups events by `run_id`
   - Orders steps chronologically
   - Builds a normalized run timeline

4. **Signal Extractor**
   - Detects retries, loops, errors, latency spikes
   - Computes token and cost aggregates
   - Produces structured failure signals

5. **Failure Classifier**
   - Maps signals to **one primary failure type** (v1 taxonomy)
   - Assigns optional secondary tags

6. **Explanation Engine**
   - Converts structured signals into plain-English post-mortems
   - Uses templates + lightweight LLM reasoning
   - No auto-fix or remediation

7. **API / UI Layer**
   - Fetch run summaries and post-mortems
   - Minimal UI focused on explanation, not dashboards

8. **Lifecycle & Deletion Worker**
   - Enforces retention windows
   - Performs automatic data deletion

**Non-Components (Explicit):**
- No live control plane
- No agent execution hooks
- No optimization engine

# Canonical Post-Mortems (v1 Reference)
These examples define tone, depth, and clarity. All explanations must match this standard.

## Example 1 — Hallucination / Invalid Output
**Summary:** The agent produced an answer that appeared confident but was not supported by any verified data.

**What happened:**
- The agent was asked to summarize a policy document.
- During step 4, the LLM generated a citation to a policy section that was not present in the retrieved context.

**Why it failed:**
- The retrieved context did not contain the required information.
- The agent did not verify the answer against available sources before responding.

**Where it failed:**
- Step 4 (LLM call using `gpt-4.x`).

**Cost impact:**
- Total run cost: $0.14
- 38% of tokens were spent regenerating similar answers.

---

## Example 2 — Control Flow Failure (Loop)
**Summary:** The agent entered a retry loop and failed to make progress toward task completion.

**What happened:**
- The agent attempted to call an external API.
- The API returned a timeout error.
- The agent retried the same call 7 times without changing parameters.

**Why it failed:**
- Retry logic lacked a termination condition or fallback path.
- No state change occurred between retries.

**Where it failed:**
- Steps 6–12 (tool_call: `fetch_customer_data`).

**Cost impact:**
- Total run cost: $0.62
- 81% of tokens were consumed during repeated retries.

---

## Example 3 — Cost Explosion (Non-Functional Failure)
**Summary:** The agent completed the task but used significantly more tokens than expected.

**What happened:**
- The agent successfully generated a report.
- Multiple intermediate reasoning steps were repeated unnecessarily.

**Why it failed:**
- The agent was configured with verbose reasoning enabled.
- No cost guardrails or early-stop conditions were defined.

**Where it failed:**
- Steps 2–5 (multiple LLM calls with similar prompts).

**Cost impact:**
- Total run cost: $1.84
- Expected cost for similar tasks: ~$0.30

# Out of Scope (For Now — GLOBAL)
The following are explicitly out of scope across **all v1 components and discussions** unless this section is intentionally revised:

- Live agent control, pausing, retries, or orchestration
- Agent governance, approvals, or role-based permissions
- Compliance certifications (SOC2, ISO, HIPAA, etc.)
- Agent performance optimization, tuning, or auto-remediation
- Prompt engineering or prompt rewrite suggestions
- Accuracy scoring, benchmarking, or model comparison

This section supersedes any previously repeated out-of-scope lists.

# v1 Build Plan (4 Weeks — LOCKED)
The goal is to ship a **usable, trustworthy MicroSaaS** quickly, not a complete platform.

## Week 1 — Foundations & Ingestion
**Goal:** Accept data safely and store it immutably.
- Set up ingestion API (SDK + webhook)
- Implement schema validation for runs and steps
- Build append-only event store
- Basic rate limiting and payload size guards

**Deliverable:** Able to ingest and persist real agent runs end-to-end.

---

## Week 2 — Reconstruction & Signals
**Goal:** Turn raw events into structured understanding.
- Run reconstructor (group + order events)
- Signal extractor (errors, retries, loops, latency, cost)
- Cost aggregation per run
- Internal run timeline representation

**Deliverable:** Structured run object with signals and cost summary.

---

## Week 3 — Classification & Explanation
**Goal:** Produce explanations engineers trust.
- Implement failure classifier (v1 taxonomy)
- Build explanation templates aligned to canonical post-mortems
- Integrate lightweight LLM reasoning for narrative polish
- Manual QA against reference examples

**Deliverable:** Plain-English post-mortem matching SSOT examples.

---

## Week 4 — UI, Polish, Release
**Goal:** Make it usable and shippable.
- Minimal UI (run list + post-mortem view)
- API for fetching run summaries
- Retention & deletion worker
- Basic auth (API keys only)
- Documentation + README

**Deliverable:** Public beta with real users and real failures.

