import type {
    ReconstructedRun,
    RunMetadata,
    StepEvent,
    Timeline,
    TimelineStep,
    RunStatus,
} from '../types/reconstructed.js';
import { getRunById, getStepsByRunId } from './eventStore.js';
import { extractSignals } from './signalExtractor.js';
import { aggregateCost } from './costAggregator.js';
import { generateExplanation } from './explanationEngine.js';

const INCOMPLETE_RUN_TIMEOUT_MS = parseInt(
    process.env.INCOMPLETE_RUN_TIMEOUT_MS || '3600000'
); // 1 hour

// Build timeline from run and steps
export function buildTimeline(
    run: RunMetadata,
    steps: StepEvent[]
): Timeline {
    const startedAt = new Date(run.started_at);
    const endedAt = run.ended_at ? new Date(run.ended_at) : undefined;

    const durationMs = endedAt
        ? endedAt.getTime() - startedAt.getTime()
        : undefined;

    const timelineSteps: TimelineStep[] = steps.map((step) => ({
        stepId: step.step_id,
        type: step.step_type,
        timestamp: new Date(step.timestamp),
        status: step.status,
        latencyMs: step.latency_ms,
        cost: step.cost_usd,
    }));

    return {
        startedAt,
        endedAt,
        durationMs,
        stepCount: steps.length,
        steps: timelineSteps,
    };
}

// Determine run status
export function determineRunStatus(
    run: RunMetadata,
    steps: StepEvent[]
): RunStatus {
    // If explicitly ended, it's complete
    if (run.ended_at) {
        return 'complete';
    }

    // Check for fatal errors
    const hasFatalError = steps.some(
        (step) =>
            step.status === 'error' &&
            step.error_type &&
            (step.error_type.toLowerCase().includes('fatal') ||
                step.error_type.toLowerCase().includes('critical'))
    );

    if (hasFatalError) {
        return 'failed';
    }

    // Check if incomplete (no activity for >1 hour)
    if (steps.length > 0) {
        const lastStep = steps[steps.length - 1];
        const lastTimestamp = new Date(lastStep.timestamp).getTime();
        const now = Date.now();
        const timeSinceLastActivity = now - lastTimestamp;

        if (timeSinceLastActivity > INCOMPLETE_RUN_TIMEOUT_MS) {
            return 'incomplete';
        }
    } else {
        // No steps and no end time - check run start time
        const startTime = new Date(run.started_at).getTime();
        const timeSinceStart = Date.now() - startTime;

        if (timeSinceStart > INCOMPLETE_RUN_TIMEOUT_MS) {
            return 'incomplete';
        }
    }

    // Default: still running
    return 'complete'; // Assume complete if recent
}

// Convert database run to RunMetadata
function dbRunToMetadata(dbRun: {
    run_id: string;
    agent_name: string;
    framework: string;
    started_at: Date;
    ended_at?: Date;
    environment?: string;
    tags?: string[];
}): RunMetadata {
    return {
        run_id: dbRun.run_id,
        agent_name: dbRun.agent_name,
        framework: dbRun.framework as RunMetadata['framework'],
        started_at: dbRun.started_at.toISOString(),
        ended_at: dbRun.ended_at?.toISOString(),
        environment: dbRun.environment as RunMetadata['environment'],
        tags: dbRun.tags,
    };
}

// Convert database step to StepEvent
function dbStepToEvent(dbStep: {
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
}): StepEvent {
    return {
        step_id: dbStep.step_id,
        run_id: dbStep.run_id,
        step_type: dbStep.step_type as StepEvent['step_type'],
        timestamp: dbStep.timestamp.toISOString(),
        model: dbStep.model,
        tool_name: dbStep.tool_name,
        status: dbStep.status as StepEvent['status'],
        error_type: dbStep.error_type,
        latency_ms: dbStep.latency_ms,
        tokens_prompt: dbStep.tokens_prompt,
        tokens_completion: dbStep.tokens_completion,
        cost_usd: dbStep.cost_usd ? Number(dbStep.cost_usd) : undefined,
    };
}

// Main reconstruction function
export async function reconstructRun(
    runId: string
): Promise<ReconstructedRun | null> {
    // Fetch run from database
    const dbRun = await getRunById(runId);
    if (!dbRun) {
        return null;
    }

    // Fetch steps
    const dbSteps = await getStepsByRunId(runId);

    // Convert to internal types
    const metadata = dbRunToMetadata(dbRun);
    const steps = dbSteps.map(dbStepToEvent);

    // Build timeline
    const timeline = buildTimeline(metadata, steps);

    // Extract signals
    const signals = extractSignals(steps);

    // Aggregate cost
    const cost = aggregateCost(steps);

    // Determine status
    const status = determineRunStatus(metadata, steps);

    const reconstructed: ReconstructedRun = {
        metadata,
        steps,
        signals,
        cost,
        timeline,
        status,
    };

    // Generate post-mortem
    try {
        const postMortem = await generateExplanation(reconstructed);
        reconstructed.postMortem = postMortem;
    } catch (error) {
        console.error('Failed to generate post-mortem:', error);
        // Post-mortem is optional, continue without it
    }

    return reconstructed;
}
