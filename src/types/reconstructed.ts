// Run metadata and step event types (from Week 1)
export interface RunMetadata {
    run_id: string;
    agent_name: string;
    framework: 'langchain' | 'crewai' | 'custom' | 'other';
    started_at: string;
    ended_at?: string;
    environment?: 'local' | 'staging' | 'prod';
    tags?: string[];
}

export interface StepEvent {
    step_id: string;
    run_id: string;
    step_type: 'llm_call' | 'tool_call' | 'memory_read' | 'memory_write' | 'action' | 'retry';
    timestamp: string;
    model?: string;
    tool_name?: string;
    status?: 'success' | 'error';
    error_type?: string;
    latency_ms?: number;
    tokens_prompt?: number;
    tokens_completion?: number;
    cost_usd?: number;
}

// Timeline representation
export interface Timeline {
    startedAt: Date;
    endedAt?: Date;
    durationMs?: number;
    stepCount: number;
    steps: TimelineStep[];
}

export interface TimelineStep {
    stepId: string;
    type: string;
    timestamp: Date;
    status?: string;
    latencyMs?: number;
    cost?: number;
}

// Failure signals
export interface RetrySignal {
    startStepId: string;
    endStepId: string;
    count: number;
    tool?: string;
    allFailed: boolean;
}

export interface LoopSignal {
    tool: string;
    repetitions: number;
    pattern: string;
    stepIds: string[];
}

export interface ErrorSignal {
    stepId: string;
    errorType: string;
    severity: 'fatal' | 'recoverable';
    timestamp: Date;
}

export interface LatencySignal {
    stepId: string;
    latencyMs: number;
    medianLatency: number;
    threshold: number;
}

export interface ToolFailureSignal {
    tool: string;
    failureCount: number;
    stepIds: string[];
}

export interface FailureSignals {
    retries: RetrySignal[];
    loops: LoopSignal[];
    errors: ErrorSignal[];
    latencySpikes: LatencySignal[];
    toolFailures: ToolFailureSignal[];
    hasAnomalies: boolean;
}

// Cost summary
export interface CostSummary {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalCostUsd: number;
    costByStepType: Record<string, number>;
    mostExpensiveStep: {
        stepId: string;
        cost: number;
    } | null;
}

// Reconstructed run
export type RunStatus = 'complete' | 'incomplete' | 'failed';

// Post-mortem explanation
export interface PostMortem {
    classification: {
        primaryType: string;
        confidence: number;
        reason: string;
        secondaryTags?: string[];
    };
    explanation: string;
    generatedAt: string;
}

export interface ReconstructedRun {
    metadata: RunMetadata;
    steps: StepEvent[];
    signals: FailureSignals;
    cost: CostSummary;
    timeline: Timeline;
    status: RunStatus;
    postMortem?: PostMortem;
}

