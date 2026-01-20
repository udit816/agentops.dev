import type { ReconstructedRun } from '../types/reconstructed.js';
import { classifyFailure, type FailureClassification } from './failureClassifier.js';
import {
    generateTemplateExplanation,
    formatTemplate,
} from './explanationTemplates.js';
import { polishExplanation } from './llmClient.js';

export interface PostMortem {
    classification: FailureClassification;
    explanation: string; // Plain-English post-mortem
    generatedAt: string;
}

const USE_LLM_POLISHING =
    process.env.USE_LLM_POLISHING?.toLowerCase() === 'true';

// Generate explanation for a reconstructed run
export async function generateExplanation(
    run: ReconstructedRun
): Promise<PostMortem> {
    // 1. Classify failure
    const classification = classifyFailure(run.signals, run.cost);

    // 2. Generate template explanation
    const template = generateTemplateExplanation(
        classification.primaryType,
        run
    );

    // 3. Polish with LLM (optional, can be disabled)
    let explanation: string;

    if (USE_LLM_POLISHING) {
        try {
            explanation = await polishExplanation(template, {
                agentName: run.metadata.agent_name,
                framework: run.metadata.framework,
            });
        } catch (error) {
            console.error('LLM polishing failed, using template:', error);
            // Fallback to template-only
            explanation = formatTemplate(template);
        }
    } else {
        // Template-only mode
        explanation = formatTemplate(template);
    }

    return {
        classification,
        explanation,
        generatedAt: new Date().toISOString(),
    };
}
