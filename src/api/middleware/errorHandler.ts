import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

// Global error handler middleware
export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    console.error('Error:', err);

    // Zod validation errors
    if (err instanceof ZodError) {
        res.status(400).json({
            error: 'Bad Request',
            message: 'Schema validation failed',
            details: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // Foreign key constraint errors (run_id not found)
    if (err instanceof Error && err.message.includes('foreign key constraint')) {
        res.status(400).json({
            error: 'Bad Request',
            message: 'run_id not found. Ensure the run exists before adding steps.',
        });
        return;
    }

    // Default error
    res.status(500).json({
        error: 'Internal Server Error',
        message: 'An unexpected error occurred',
    });
}
