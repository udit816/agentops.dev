import type {
    StepEvent,
    FailureSignals,
    RetrySignal,
    LoopSignal,
    ErrorSignal,
    LatencySignal,
    ToolFailureSignal,
} from '../types/reconstructed.js';

// Configuration thresholds
const RETRY_THRESHOLD = parseInt(process.env.RETRY_THRESHOLD || '3');
const LOOP_THRESHOLD = parseInt(process.env.LOOP_THRESHOLD || '3');
const LATENCY_SPIKE_MS = parseInt(process.env.LATENCY_SPIKE_MS || '5000');

// Detect retry patterns
export function detectRetries(steps: StepEvent[]): RetrySignal[] {
    const signals: RetrySignal[] = [];
    let retrySequence: StepEvent[] = [];
    let startStepId = '';

    for (let i = 0; i < steps.length; i++) {
        const step = steps[i];

        if (step.step_type === 'retry') {
            if (retrySequence.length === 0) {
                // Start of a retry sequence - find the original failed step
                startStepId = i > 0 ? steps[i - 1].step_id : step.step_id;
            }
            retrySequence.push(step);
        } else {
            // End of retry sequence
            if (retrySequence.length >= RETRY_THRESHOLD - 1) {
                const allFailed = retrySequence.every((s) => s.status === 'error');
                const tool = retrySequence[0].tool_name;

                signals.push({
                    startStepId,
                    endStepId: retrySequence[retrySequence.length - 1].step_id,
                    count: retrySequence.length,
                    tool,
                    allFailed,
                });
            }
            retrySequence = [];
        }
    }

    // Check final sequence
    if (retrySequence.length >= RETRY_THRESHOLD - 1) {
        const allFailed = retrySequence.every((s) => s.status === 'error');
        const tool = retrySequence[0].tool_name;

        signals.push({
            startStepId,
            endStepId: retrySequence[retrySequence.length - 1].step_id,
            count: retrySequence.length,
            tool,
            allFailed,
        });
    }

    return signals;
}

// Detect loop patterns (repeated tool calls)
export function detectLoops(steps: StepEvent[]): LoopSignal[] {
    const signals: LoopSignal[] = [];
    const toolSequences: Map<string, StepEvent[]> = new Map();

    for (const step of steps) {
        if (step.step_type === 'tool_call' || step.step_type === 'retry') {
            const tool = step.tool_name;
            if (!tool) continue;

            const sequence = toolSequences.get(tool) || [];
            sequence.push(step);
            toolSequences.set(tool, sequence);
        }
    }

    // Analyze sequences for loops
    for (const [tool, sequence] of toolSequences) {
        if (sequence.length >= LOOP_THRESHOLD) {
            // Check if they're consecutive and have similar errors
            const errorTypes = sequence.map((s) => s.error_type).filter(Boolean);
            const hasRepeatedErrors = errorTypes.length >= LOOP_THRESHOLD;

            if (hasRepeatedErrors) {
                const pattern = errorTypes[0]
                    ? `${errorTypes[0]} loop`
                    : 'repeated calls';

                signals.push({
                    tool,
                    repetitions: sequence.length,
                    pattern,
                    stepIds: sequence.map((s) => s.step_id),
                });
            }
        }
    }

    return signals;
}

// Detect error signals
export function detectErrors(steps: StepEvent[]): ErrorSignal[] {
    const signals: ErrorSignal[] = [];

    for (const step of steps) {
        if (step.status === 'error' && step.error_type) {
            // Determine severity (simple heuristic)
            const severity: 'fatal' | 'recoverable' =
                step.error_type.toLowerCase().includes('fatal') ||
                    step.error_type.toLowerCase().includes('critical')
                    ? 'fatal'
                    : 'recoverable';

            signals.push({
                stepId: step.step_id,
                errorType: step.error_type,
                severity,
                timestamp: new Date(step.timestamp),
            });
        }
    }

    return signals;
}

// Detect latency spikes
export function detectLatencySpikes(steps: StepEvent[]): LatencySignal[] {
    const signals: LatencySignal[] = [];

    // Get all latency values
    const latencies = steps
        .map((s) => s.latency_ms)
        .filter((l): l is number => l !== undefined && l > 0);

    if (latencies.length === 0) return signals;

    // Calculate median
    const sorted = [...latencies].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
        sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];

    const threshold = Math.max(LATENCY_SPIKE_MS, median * 3);

    // Find spikes
    for (const step of steps) {
        if (step.latency_ms && step.latency_ms > threshold) {
            signals.push({
                stepId: step.step_id,
                latencyMs: step.latency_ms,
                medianLatency: median,
                threshold,
            });
        }
    }

    return signals;
}

// Detect tool failures
export function detectToolFailures(steps: StepEvent[]): ToolFailureSignal[] {
    const failures: Map<string, string[]> = new Map();

    for (const step of steps) {
        if (
            step.step_type === 'tool_call' &&
            step.status === 'error' &&
            step.tool_name
        ) {
            const stepIds = failures.get(step.tool_name) || [];
            stepIds.push(step.step_id);
            failures.set(step.tool_name, stepIds);
        }
    }

    const signals: ToolFailureSignal[] = [];
    for (const [tool, stepIds] of failures) {
        signals.push({
            tool,
            failureCount: stepIds.length,
            stepIds,
        });
    }

    return signals;
}

// Main signal extraction function
export function extractSignals(steps: StepEvent[]): FailureSignals {
    const retries = detectRetries(steps);
    const loops = detectLoops(steps);
    const errors = detectErrors(steps);
    const latencySpikes = detectLatencySpikes(steps);
    const toolFailures = detectToolFailures(steps);

    const hasAnomalies =
        retries.length > 0 ||
        loops.length > 0 ||
        errors.length > 0 ||
        latencySpikes.length > 0 ||
        toolFailures.length > 0;

    return {
        retries,
        loops,
        errors,
        latencySpikes,
        toolFailures,
        hasAnomalies,
    };
}
