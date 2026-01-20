import { Router, Request, Response } from 'express';
import { reconstructRun } from '../../services/runReconstructor.js';
import { executeQuery } from '../../db/client.js';

const router = Router();

// GET /api/v1/runs/:runId - Get reconstructed run
router.get('/:runId', async (req: Request, res: Response) => {
    try {
        const { runId } = req.params;

        const run = await reconstructRun(runId);

        if (!run) {
            res.status(404).json({
                error: 'Not Found',
                message: `Run with id ${runId} not found`,
            });
            return;
        }

        res.json({ run });
    } catch (error) {
        throw error; // Let error handler middleware handle it
    }
});

// GET /api/v1/runs/:runId/signals - Get only signals
router.get('/:runId/signals', async (req: Request, res: Response) => {
    try {
        const { runId } = req.params;

        const run = await reconstructRun(runId);

        if (!run) {
            res.status(404).json({
                error: 'Not Found',
                message: `Run with id ${runId} not found`,
            });
            return;
        }

        res.json({ signals: run.signals });
    } catch (error) {
        throw error;
    }
});

// GET /api/v1/runs/:runId/postmortem - Get only post-mortem
router.get('/:runId/postmortem', async (req: Request, res: Response) => {
    try {
        const { runId } = req.params;

        const run = await reconstructRun(runId);

        if (!run) {
            res.status(404).json({
                error: 'Not Found',
                message: `Run with id ${runId} not found`,
            });
            return;
        }

        if (!run.postMortem) {
            res.status(500).json({
                error: 'Internal Server Error',
                message: 'Post-mortem generation failed',
            });
            return;
        }

        res.json({ postMortem: run.postMortem });
    } catch (error) {
        throw error;
    }
});

// GET /api/v1/runs - List runs
router.get('/', async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) || '20');
        const offset = parseInt((req.query.offset as string) || '0');
        const statusFilter = req.query.status as string | undefined;

        // Build query
        let query = `
      SELECT run_id, agent_name, framework, started_at, ended_at, environment, tags
      FROM agent_runs
    `;
        const params: unknown[] = [];

        // Add status filter logic (simplified for v1)
        // In a real implementation, you'd need to compute status for each run
        if (statusFilter === 'failed') {
            // Runs with ended_at null and old start time
            query += ` WHERE ended_at IS NULL AND started_at < NOW() - INTERVAL '1 hour'`;
        }

        query += ` ORDER BY started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        interface RunRow {
            run_id: string;
            agent_name: string;
            framework: string;
            started_at: Date;
            ended_at?: Date;
            environment?: string;
            tags?: string[];
        }

        const runs = await executeQuery<RunRow>(query, params);

        res.json({
            runs: runs.map((r) => ({
                run_id: r.run_id,
                agent_name: r.agent_name,
                framework: r.framework,
                started_at: r.started_at.toISOString(),
                ended_at: r.ended_at?.toISOString(),
                environment: r.environment,
                tags: r.tags,
            })),
            pagination: {
                limit,
                offset,
                total: runs.length,
            },
        });
    } catch (error) {
        throw error;
    }
});

export default router;
