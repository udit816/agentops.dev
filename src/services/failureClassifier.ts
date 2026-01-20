import type {
    FailureSignals,
    CostSummary,
} from '../types/reconstructed.js';

// Failure types from v1 taxonomy
export type FailureType =
    | 'hallucination'
    | 'tool_execution_failure'
    | 'context_failure'
    | 'control_flow_failure'
    | 'instruction_misalignment'
    | 'cost_explosion'
    | 'unclear';

export interface FailureClassification {
    primaryType: FailureType;
    confidence: number; // 0-1
    reason: string;
    secondaryTags?: string[];
}

// Configuration
const HIGH_COST_THRESHOLD = parseFloat(
    process.env.HIGH_COST_THRESHOLD_USD || '0.50'
);

// Classify failure based on signals and cost
export function classifyFailure(
    signals: FailureSignals,
    cost: CostSummary
): FailureClassification {
    // Priority order (most specific first)

    // 1. Control Flow Failure (Loop / Stall)
    // Highest priority - clear failure pattern
    if (signals.loops.length > 0 || signals.retries.length > 0) {
        const hasLoops = signals.loops.length > 0;
        const hasRetries = signals.retries.length > 0;

        return {
            primaryType: 'control_flow_failure',
            confidence: 0.9,
            reason: hasLoops
                ? `Detected ${signals.loops.length} loop pattern(s) with repeated operations`
                : `Detected ${signals.retries.length} retry sequence(s) without progress`,
            secondaryTags: hasLoops && hasRetries ? ['loops', 'retries'] : undefined,
        };
    }

    // 2. Tool Execution Failure
    // Tool-specific errors are highly indicative
    if (signals.toolFailures.length > 0) {
        const totalFailures = signals.toolFailures.reduce(
            (sum, tf) => sum + tf.failureCount,
            0
        );

        return {
            primaryType: 'tool_execution_failure',
            confidence: 0.85,
            reason: `${totalFailures} tool failure(s) detected across ${signals.toolFailures.length} tool(s)`,
            secondaryTags: signals.toolFailures.map((tf) => tf.tool),
        };
    }

    // Check for error signals that might be tool-related
    if (signals.errors.length > 0) {
        const hasToolErrors = signals.errors.some(
            (e) =>
                e.errorType.toLowerCase().includes('timeout') ||
                e.errorType.toLowerCase().includes('api') ||
                e.errorType.toLowerCase().includes('connection')
        );

        if (hasToolErrors) {
            return {
                primaryType: 'tool_execution_failure',
                confidence: 0.75,
                reason: `Error signals suggest tool/API failures`,
                secondaryTags: signals.errors.map((e) => e.errorType),
            };
        }
    }

    // 3. Cost Explosion (Non-Functional Failure)
    // Check cost threshold
    if (cost.totalCostUsd > HIGH_COST_THRESHOLD) {
        const percentAboveThreshold =
            ((cost.totalCostUsd - HIGH_COST_THRESHOLD) / HIGH_COST_THRESHOLD) * 100;

        return {
            primaryType: 'cost_explosion',
            confidence: 0.8,
            reason: `High cost: $${cost.totalCostUsd.toFixed(2)} exceeds threshold by ${percentAboveThreshold.toFixed(0)}%`,
        };
    }

    // 4. Context Failure
    // Harder to detect from signals alone - would need semantic analysis
    // Placeholder for v1
    if (
        signals.errors.some(
            (e) =>
                e.errorType.toLowerCase().includes('context') ||
                e.errorType.toLowerCase().includes('memory')
        )
    ) {
        return {
            primaryType: 'context_failure',
            confidence: 0.6,
            reason: 'Error signals suggest context/memory issues',
        };
    }

    // 5. Hallucination / Invalid Output
    // Requires output validation - placeholder for v1
    // Would need ground truth or verification signals

    // 6. Instruction Misalignment
    // Requires task/output comparison - placeholder for v1

    // Default: No clear failure detected or run succeeded
    if (signals.errors.length > 0) {
        return {
            primaryType: 'unclear',
            confidence: 0.4,
            reason: `${signals.errors.length} error(s) detected but no clear failure pattern`,
        };
    }

    return {
        primaryType: 'unclear',
        confidence: 0.0,
        reason: 'No clear failure pattern detected - run may have succeeded',
    };
}
