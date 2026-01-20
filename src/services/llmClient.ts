import OpenAI from 'openai';
import type { ExplanationTemplate } from './explanationTemplates.js';

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo';
const MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS || '500');
const TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE || '0.3');

// Build prompt for polishing explanation
function buildPolishingPrompt(
    template: ExplanationTemplate,
    context: { agentName: string; framework: string }
): string {
    return `You are a technical writer helping engineers understand AI agent failures.

Given this structured explanation, rewrite it in clear, concise plain English.
Maintain the EXACT same structure (Summary, What happened, Why it failed, Where it failed, Cost impact).
Keep technical terms but make it readable in under 60 seconds.
Do NOT add new information or assumptions. Only improve clarity and tone.

Agent: ${context.agentName}
Framework: ${context.framework}

Structured Explanation:
Summary: ${template.summary}

What happened:
${template.whatHappened.map((line, i) => `${i + 1}. ${line}`).join('\n')}

Why it failed:
${template.whyItFailed.map((line, i) => `${i + 1}. ${line}`).join('\n')}

Where it failed:
${template.whereItFailed}

Cost impact:
${template.costImpact.map((line, i) => `${i + 1}. ${line}`).join('\n')}

Rewrite this maintaining the structure but improving clarity and tone. Use markdown formatting (** for bold, - for bullets):`;
}

// Polish explanation using LLM
export async function polishExplanation(
    template: ExplanationTemplate,
    context: { agentName: string; framework: string }
): Promise<string> {
    try {
        const prompt = buildPolishingPrompt(template, context);

        const response = await openai.chat.completions.create({
            model: MODEL,
            messages: [
                {
                    role: 'system',
                    content:
                        'You are a technical writer specializing in AI agent debugging. Write clear, concise explanations.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            max_tokens: MAX_TOKENS,
            temperature: TEMPERATURE,
        });

        const polished = response.choices[0]?.message?.content;
        if (!polished) {
            throw new Error('LLM returned empty response');
        }

        return polished.trim();
    } catch (error) {
        console.error('LLM polishing failed:', error);
        // Fallback to template if LLM fails
        throw error;
    }
}
