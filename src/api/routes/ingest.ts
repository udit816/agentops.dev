import { Router, Request, Response } from 'express';
import {
    validateRunMetadata,
    validateStepEvent,
    validateBatch,
} from '../../validation/schemas.js';
import {
    insertRun,
    insertStep,
    insertBatch,
} from '../../services/eventStore.js';

const router = Router();

const MAX_PAYLOAD_SIZE_BYTES =
    parseInt(process.env.MAX_PAYLOAD_SIZE_KB || '100') * 1024;

// Middleware to check payload size
function checkPayloadSize(req: Request, res: Response, next: Function) {
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE_BYTES) {
        res.status(413).json({
            error: 'Payload Too Large',
            message: `Maximum payload size is ${MAX_PAYLOAD_SIZE_BYTES / 1024}KB`,
        });
        return;
    }
    next();
}

// POST /api/v1/ingest/run - Ingest run metadata
router.post('/run', checkPayloadSize, async (req: Request, res: Response) => {
    try {
        const runData = validateRunMetadata(req.body);
        const result = await insertRun(runData);

        res.status(202).json({
            message: 'Run accepted',
            run_id: result.run_id,
            event_id: result.id,
        });
    } catch (error) {
        throw error; // Let error handler middleware handle it
    }
});

// POST /api/v1/ingest/step - Ingest step event
router.post('/step', checkPayloadSize, async (req: Request, res: Response) => {
    try {
        const stepData = validateStepEvent(req.body);
        const result = await insertStep(stepData);

        res.status(202).json({
            message: 'Step accepted',
            step_id: result.step_id,
            event_id: result.id,
        });
    } catch (error) {
        throw error;
    }
});

// POST /api/v1/webhook/batch - Batch webhook ingestion
router.post(
    '/batch',
    checkPayloadSize,
    async (req: Request, res: Response) => {
        try {
            const batchData = validateBatch(req.body);
            const runs = batchData.runs || [];
            const steps = batchData.steps || [];

            const result = await insertBatch(runs, steps);

            res.status(202).json({
                message: 'Batch accepted',
                runsInserted: result.runsInserted,
                stepsInserted: result.stepsInserted,
            });
        } catch (error) {
            throw error;
        }
    }
);

export default router;
