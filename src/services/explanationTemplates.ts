import type { ReconstructedRun } from '../types/reconstructed.js';
import type { FailureType } from './failureClassifier.js';

export interface ExplanationTemplate {
    summary: string;
    whatHappened: string[];
    whyItFailed: string[];
    whereItFailed: string;
    costImpact: string[];
}

// Generate template-based explanation
export function generateTemplateExplanation(
    failureType: FailureType,
    run: ReconstructedRun
): ExplanationTemplate {
    switch (failureType) {
        case 'control_flow_failure':
            return generateControlFlowExplanation(run);
        case 'tool_execution_failure':
            return generateToolFailureExplanation(run);
        case 'cost_explosion':
            return generateCostExplosionExplanation(run);
        case 'context_failure':
            return generateContextFailureExplanation(run);
        case 'hallucination':
            return generateHallucinationExplanation(run);
        case 'instruction_misalignment':
            return generateInstructionMisalignmentExplanation(run);
        default:
            return generateUnclearExplanation(run);
    }
}

// Control Flow Failure (Loop / Stall)
function generateControlFlowExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    const hasLoops = run.signals.loops.length > 0;
    const hasRetries = run.signals.retries.length > 0;

    if (hasLoops) {
        const loop = run.signals.loops[0];

        return {
            summary:
                'The agent entered a retry loop and failed to make progress toward task completion.',

            whatHappened: [
                `The agent attempted to call ${loop.tool}.`,
                `The ${loop.tool} returned ${loop.pattern}.`,
                `The agent retried the same call ${loop.repetitions} times without changing parameters.`,
            ],

            whyItFailed: [
                'Retry logic lacked a termination condition or fallback path.',
                'No state change occurred between retries.',
            ],

            whereItFailed: `Steps ${loop.stepIds[0]}–${loop.stepIds[loop.stepIds.length - 1]} (tool_call: \`${loop.tool}\`).`,

            costImpact: [
                `Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`,
                run.cost.totalCostUsd > 0
                    ? `${Math.round(((run.cost.costByStepType.retry || 0) / run.cost.totalCostUsd) * 100)}% of cost was consumed during repeated retries.`
                    : 'No token costs incurred.',
            ],
        };
    }

    if (hasRetries) {
        const retry = run.signals.retries[0];

        return {
            summary:
                'The agent entered a retry sequence and failed to make progress.',

            whatHappened: [
                `The agent attempted an operation that failed.`,
                `The agent retried ${retry.count} times.`,
                retry.allFailed
                    ? 'All retry attempts failed with the same error.'
                    : 'Some retries succeeded but overall operation failed.',
            ],

            whyItFailed: [
                'Retry logic did not include sufficient error handling.',
                'No fallback strategy was defined.',
            ],

            whereItFailed: `Steps ${retry.startStepId}–${retry.endStepId}${retry.tool ? ` (tool: \`${retry.tool}\`)` : ''}.`,

            costImpact: [
                `Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`,
                `${retry.count} retry attempts were made.`,
            ],
        };
    }

    // Fallback
    return generateUnclearExplanation(run);
}

// Tool Execution Failure
function generateToolFailureExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    const failures = run.signals.toolFailures;
    const primaryFailure = failures[0];
    const totalFailures = failures.reduce((sum, f) => sum + f.failureCount, 0);

    return {
        summary: 'The agent encountered tool execution failures that prevented task completion.',

        whatHappened: [
            `The agent attempted to use ${failures.length === 1 ? 'a tool' : `${failures.length} different tools`}.`,
            `Tool ${primaryFailure.tool} failed ${primaryFailure.failureCount} time(s).`,
            totalFailures > primaryFailure.failureCount
                ? `Additional ${totalFailures - primaryFailure.failureCount} failure(s) occurred in other tools.`
                : '',
        ].filter(Boolean),

        whyItFailed: [
            'Tool calls returned errors or timeouts.',
            run.signals.errors.length > 0
                ? `Error types: ${run.signals.errors.map((e) => e.errorType).join(', ')}`
                : 'No error details captured.',
        ],

        whereItFailed: `Steps ${primaryFailure.stepIds.join(', ')} (tool_call: \`${primaryFailure.tool}\`).`,

        costImpact: [
            `Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`,
            `${totalFailures} failed tool calls.`,
        ],
    };
}

// Cost Explosion
function generateCostExplosionExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    const mostExpensive = run.cost.mostExpensiveStep;
    const llmCost = run.cost.costByStepType.llm_call || 0;
    const llmPercentage = (llmCost / run.cost.totalCostUsd) * 100;

    return {
        summary:
            'The agent completed the task but used significantly more tokens than expected.',

        whatHappened: [
            `The agent successfully ${run.status === 'complete' ? 'completed' : 'attempted'} the task.`,
            run.timeline.stepCount > 5
                ? 'Multiple intermediate reasoning steps were executed.'
                : 'The agent made several LLM calls.',
            mostExpensive
                ? `Step ${mostExpensive.stepId} was the most expensive at $${mostExpensive.cost.toFixed(4)}.`
                : '',
        ].filter(Boolean),

        whyItFailed: [
            llmPercentage > 80
                ? 'The agent was configured with verbose reasoning enabled.'
                : 'Multiple LLM calls with overlapping prompts.',
            'No cost guardrails or early-stop conditions were defined.',
        ],

        whereItFailed: mostExpensive
            ? `Step ${mostExpensive.stepId} and related LLM calls.`
            : `Steps ${run.timeline.steps.slice(0, 3).map((s) => s.stepId).join(', ')}.`,

        costImpact: [
            `Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`,
            run.cost.totalTokens > 0
                ? `Total tokens used: ${run.cost.totalTokens.toLocaleString()} (${run.cost.promptTokens} prompt + ${run.cost.completionTokens} completion)`
                : '',
            llmPercentage > 0
                ? `${llmPercentage.toFixed(0)}% of cost was LLM calls.`
                : '',
        ].filter(Boolean),
    };
}

// Context Failure (placeholder)
function generateContextFailureExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    return {
        summary:
            'The agent failed due to missing, outdated, or incorrect context.',

        whatHappened: [
            'The agent attempted to use context or memory.',
            'The context was incomplete or incorrect.',
        ],

        whyItFailed: [
            'RAG retrieval may have failed or returned irrelevant results.',
            'Memory state was not properly maintained.',
        ],

        whereItFailed: run.signals.errors.length > 0
            ? `Step ${run.signals.errors[0].stepId}.`
            : 'Context issues detected.',

        costImpact: [`Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`],
    };
}

// Hallucination (placeholder)
function generateHallucinationExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    return {
        summary:
            'The agent produced an answer that appeared confident but was not supported by verified data.',

        whatHappened: [
            'The agent generated a response.',
            'The response contained unverified or fabricated information.',
        ],

        whyItFailed: [
            'The agent did not verify the answer against available sources.',
            'Retrieved context did not contain the required information.',
        ],

        whereItFailed: 'LLM generation steps (requires verification).',

        costImpact: [`Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`],
    };
}

// Instruction Misalignment (placeholder)
function generateInstructionMisalignmentExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    return {
        summary:
            'The agent followed instructions literally but produced incorrect results.',

        whatHappened: [
            'The agent executed the task according to provided instructions.',
            'The output did not match expected behavior.',
        ],

        whyItFailed: [
            'Conflicting instructions from system and user prompts.',
            'Ambiguous task definition.',
        ],

        whereItFailed: 'Instruction interpretation layer.',

        costImpact: [`Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`],
    };
}

// Unclear failure
function generateUnclearExplanation(
    run: ReconstructedRun
): ExplanationTemplate {
    const hasErrors = run.signals.errors.length > 0;

    return {
        summary: hasErrors
            ? 'The agent encountered errors but the failure pattern is unclear.'
            : 'No clear failure detected - the run may have completed successfully.',

        whatHappened: hasErrors
            ? [
                `The agent executed ${run.timeline.stepCount} steps.`,
                `${run.signals.errors.length} error(s) occurred.`,
            ]
            : [
                `The agent executed ${run.timeline.stepCount} steps.`,
                'The run completed without obvious failures.',
            ],

        whyItFailed: hasErrors
            ? ['Error signals were detected but do not match known failure patterns.']
            : ['No failure signals detected.'],

        whereItFailed: hasErrors
            ? `Error in step(s): ${run.signals.errors.map((e) => e.stepId).join(', ')}`
            : 'N/A',

        costImpact: [`Total run cost: $${run.cost.totalCostUsd.toFixed(2)}`],
    };
}

// Format template as plain text
export function formatTemplate(template: ExplanationTemplate): string {
    const sections: string[] = [];

    sections.push(`**Summary:** ${template.summary}`);
    sections.push('');

    sections.push('**What happened:**');
    template.whatHappened.forEach((line) => sections.push(`- ${line}`));
    sections.push('');

    sections.push('**Why it failed:**');
    template.whyItFailed.forEach((line) => sections.push(`- ${line}`));
    sections.push('');

    sections.push(`**Where it failed:**`);
    sections.push(`- ${template.whereItFailed}`);
    sections.push('');

    sections.push('**Cost impact:**');
    template.costImpact.forEach((line) => sections.push(`- ${line}`));

    return sections.join('\n');
}
