import type { StepEvent, CostSummary } from '../types/reconstructed.js';

// Calculate total cost from steps
export function calculateTotalCost(steps: StepEvent[]): number {
    return steps.reduce((sum, step) => sum + (step.cost_usd || 0), 0);
}

// Aggregate token counts
export function aggregateTokens(steps: StepEvent[]): {
    total: number;
    prompt: number;
    completion: number;
} {
    const prompt = steps.reduce(
        (sum, step) => sum + (step.tokens_prompt || 0),
        0
    );
    const completion = steps.reduce(
        (sum, step) => sum + (step.tokens_completion || 0),
        0
    );

    return {
        total: prompt + completion,
        prompt,
        completion,
    };
}

// Break down cost by step type
export function costByStepType(
    steps: StepEvent[]
): Record<string, number> {
    const breakdown: Record<string, number> = {};

    for (const step of steps) {
        const type = step.step_type;
        const cost = step.cost_usd || 0;
        breakdown[type] = (breakdown[type] || 0) + cost;
    }

    return breakdown;
}

// Find the most expensive step
export function findMostExpensiveStep(steps: StepEvent[]): {
    stepId: string;
    cost: number;
} | null {
    if (steps.length === 0) return null;

    let maxStep = steps[0];
    let maxCost = maxStep.cost_usd || 0;

    for (const step of steps) {
        const cost = step.cost_usd || 0;
        if (cost > maxCost) {
            maxCost = cost;
            maxStep = step;
        }
    }

    return maxCost > 0 ? { stepId: maxStep.step_id, cost: maxCost } : null;
}

// Main aggregation function
export function aggregateCost(steps: StepEvent[]): CostSummary {
    const tokens = aggregateTokens(steps);

    return {
        totalTokens: tokens.total,
        promptTokens: tokens.prompt,
        completionTokens: tokens.completion,
        totalCostUsd: calculateTotalCost(steps),
        costByStepType: costByStepType(steps),
        mostExpensiveStep: findMostExpensiveStep(steps),
    };
}
