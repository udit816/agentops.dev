// API client for connecting to backend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

export interface RunMetadata {
    run_id: string;
    agent_name: string;
    framework: string;
    started_at: string;
    ended_at?: string;
    environment?: string;
    tags?: string[];
}

export interface ReconstructedRun {
    metadata: RunMetadata;
    steps: any[];
    signals: {
        retries: any[];
        loops: any[];
        errors: any[];
        latencySpikes: any[];
        toolFailures: any[];
        hasAnomalies: boolean;
    };
    cost: {
        totalTokens: number;
        promptTokens: number;
        completionTokens: number;
        totalCostUsd: number;
        costByStepType: Record<string, number>;
        mostExpensiveStep: { stepId: string; cost: number } | null;
    };
    timeline: {
        startedAt: string;
        endedAt?: string;
        durationMs?: number;
        stepCount: number;
    };
    status: 'complete' | 'incomplete' | 'failed';
    postMortem?: {
        classification: {
            primaryType: string;
            confidence: number;
            reason: string;
        };
        explanation: string;
        generatedAt: string;
    };
}

async function fetchAPI(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
}

export async function getRuns(limit = 50, offset = 0) {
    return fetchAPI(`/runs?limit=${limit}&offset=${offset}`);
}

export async function getRun(runId: string): Promise<{ run: ReconstructedRun }> {
    return fetchAPI(`/runs/${runId}`);
}

export async function getPostMortem(runId: string) {
    return fetchAPI(`/runs/${runId}/postmortem`);
}
