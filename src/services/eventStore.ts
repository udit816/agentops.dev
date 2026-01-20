import { executeQuery, executeQueryOne } from '../db/client.js';
import type { RunMetadata, StepEvent } from '../validation/schemas.js';

interface DbRun {
    id: number;
    run_id: string;
    agent_name: string;
    framework: string;
    started_at: Date;
    ended_at?: Date;
    environment?: string;
    tags?: string[];
    created_at: Date;
}

interface DbStep {
    id: number;
    step_id: string;
    run_id: string;
    step_type: string;
    timestamp: Date;
    model?: string;
    tool_name?: string;
    status?: string;
    error_type?: string;
    latency_ms?: number;
    tokens_prompt?: number;
    tokens_completion?: number;
    cost_usd?: number;
    created_at: Date;
}

// Insert a run (immutable, idempotent)
export async function insertRun(run: RunMetadata): Promise<DbRun> {
    // Check if run already exists (idempotency)
    const existing = await executeQueryOne<DbRun>(
        'SELECT * FROM agent_runs WHERE run_id = $1',
        [run.run_id]
    );

    if (existing) {
        return existing;
    }

    // Insert new run
    const query = `
    INSERT INTO agent_runs (run_id, agent_name, framework, started_at, ended_at, environment, tags)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `;

    const params = [
        run.run_id,
        run.agent_name,
        run.framework,
        run.started_at,
        run.ended_at || null,
        run.environment || null,
        run.tags || null,
    ];

    const rows = await executeQuery<DbRun>(query, params);
    return rows[0];
}

// Insert a step (immutable, idempotent)
export async function insertStep(step: StepEvent): Promise<DbStep> {
    // Check if step already exists (idempotency)
    const existing = await executeQueryOne<DbStep>(
        'SELECT * FROM agent_steps WHERE run_id = $1 AND step_id = $2',
        [step.run_id, step.step_id]
    );

    if (existing) {
        return existing;
    }

    // Insert new step
    const query = `
    INSERT INTO agent_steps 
    (step_id, run_id, step_type, timestamp, model, tool_name, status, 
     error_type, latency_ms, tokens_prompt, tokens_completion, cost_usd)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;

    const params = [
        step.step_id,
        step.run_id,
        step.step_type,
        step.timestamp,
        step.model || null,
        step.tool_name || null,
        step.status || null,
        step.error_type || null,
        step.latency_ms || null,
        step.tokens_prompt || null,
        step.tokens_completion || null,
        step.cost_usd || null,
    ];

    const rows = await executeQuery<DbStep>(query, params);
    return rows[0];
}

// Insert multiple runs and steps in a transaction
export async function insertBatch(
    runs: RunMetadata[],
    steps: StepEvent[]
): Promise<{ runsInserted: number; stepsInserted: number }> {
    let runsInserted = 0;
    let stepsInserted = 0;

    // Insert runs
    for (const run of runs) {
        const result = await insertRun(run);
        if (result) runsInserted++;
    }

    // Insert steps
    for (const step of steps) {
        const result = await insertStep(step);
        if (result) stepsInserted++;
    }

    return { runsInserted, stepsInserted };
}

// Get run by ID (for testing)
export async function getRunById(runId: string): Promise<DbRun | null> {
    return executeQueryOne<DbRun>(
        'SELECT * FROM agent_runs WHERE run_id = $1',
        [runId]
    );
}

// Get steps by run ID (for testing)
export async function getStepsByRunId(runId: string): Promise<DbStep[]> {
    return executeQuery<DbStep>(
        'SELECT * FROM agent_steps WHERE run_id = $1 ORDER BY timestamp ASC',
        [runId]
    );
}
