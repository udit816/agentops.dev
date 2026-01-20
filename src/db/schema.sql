-- Agent Runs Table (Immutable)
-- Stores run-level metadata for each agent execution
CREATE TABLE IF NOT EXISTS agent_runs (
  id SERIAL PRIMARY KEY,
  run_id VARCHAR(255) UNIQUE NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  framework VARCHAR(50) NOT NULL CHECK (framework IN ('langchain', 'crewai', 'custom', 'other')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  environment VARCHAR(50) CHECK (environment IN ('local', 'staging', 'prod')),
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Steps Table (Immutable)
-- Stores step-level events for each agent run
CREATE TABLE IF NOT EXISTS agent_steps (
  id SERIAL PRIMARY KEY,
  step_id VARCHAR(255) NOT NULL,
  run_id VARCHAR(255) NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
  step_type VARCHAR(50) NOT NULL CHECK (step_type IN ('llm_call', 'tool_call', 'memory_read', 'memory_write', 'action', 'retry')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  model VARCHAR(255),
  tool_name VARCHAR(255),
  status VARCHAR(50) CHECK (status IN ('success', 'error')),
  error_type VARCHAR(255),
  latency_ms INTEGER,
  tokens_prompt INTEGER,
  tokens_completion INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(run_id, step_id)
);

-- API Keys Table
-- Stores hashed API keys for authentication
CREATE TABLE IF NOT EXISTS api_keys (
  id SERIAL PRIMARY KEY,
  key_hash VARCHAR(255) UNIQUE NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_runs_run_id ON agent_runs(run_id);
CREATE INDEX IF NOT EXISTS idx_runs_started_at ON agent_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_steps_run_id ON agent_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_steps_timestamp ON agent_steps(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
