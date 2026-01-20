import { z } from 'zod';

// Enums matching SDK contract
export const FrameworkEnum = z.enum(['langchain', 'crewai', 'custom', 'other']);
export const StepTypeEnum = z.enum([
    'llm_call',
    'tool_call',
    'memory_read',
    'memory_write',
    'action',
    'retry',
]);
export const EnvironmentEnum = z.enum(['local', 'staging', 'prod']);
export const StatusEnum = z.enum(['success', 'error']);

// Run Metadata Schema (per PROJECT_CONTEXT.md SDK contract)
export const RunMetadataSchema = z.object({
    // Required fields
    run_id: z.string().min(1, 'run_id is required'),
    agent_name: z.string().min(1, 'agent_name is required'),
    framework: FrameworkEnum,
    started_at: z.string().datetime({ message: 'started_at must be ISO-8601' }),

    // Optional fields
    ended_at: z.string().datetime().optional(),
    environment: EnvironmentEnum.optional(),
    tags: z.array(z.string()).optional(),
});

// Step Event Schema (per PROJECT_CONTEXT.md SDK contract)
export const StepEventSchema = z.object({
    // Required fields
    step_id: z.string().min(1, 'step_id is required'),
    run_id: z.string().min(1, 'run_id is required'),
    step_type: StepTypeEnum,
    timestamp: z.string().datetime({ message: 'timestamp must be ISO-8601' }),

    // Optional fields
    model: z.string().optional(),
    tool_name: z.string().optional(),
    status: StatusEnum.optional(),
    error_type: z.string().optional(),
    latency_ms: z.number().int().nonnegative().optional(),
    tokens_prompt: z.number().int().nonnegative().optional(),
    tokens_completion: z.number().int().nonnegative().optional(),
    cost_usd: z.number().nonnegative().optional(),
});

// Batch webhook payload schema
export const BatchPayloadSchema = z.object({
    runs: z.array(RunMetadataSchema).optional(),
    steps: z.array(StepEventSchema).optional(),
});

// Type exports
export type RunMetadata = z.infer<typeof RunMetadataSchema>;
export type StepEvent = z.infer<typeof StepEventSchema>;
export type BatchPayload = z.infer<typeof BatchPayloadSchema>;

// Validation functions
export function validateRunMetadata(data: unknown): RunMetadata {
    return RunMetadataSchema.parse(data);
}

export function validateStepEvent(data: unknown): StepEvent {
    return StepEventSchema.parse(data);
}

export function validateBatch(data: unknown): BatchPayload {
    return BatchPayloadSchema.parse(data);
}
