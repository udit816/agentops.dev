import type { Request, Response, NextFunction } from 'express';
import { executeQuery } from '../../db/client.js';
import { verifyApiKey } from '../../utils/apiKey.js';

interface ApiKeyRow {
    id: number;
    key_hash: string;
    user_id: string;
    is_active: boolean;
}

// Extend Express Request type to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

// Extract API key from request
function extractApiKey(req: Request): string | null {
    // Check Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Check query parameter (fallback)
    const queryKey = req.query.api_key;
    if (typeof queryKey === 'string') {
        return queryKey;
    }

    return null;
}

// Validate API key middleware
export async function validateApiKey(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const apiKey = extractApiKey(req);

        if (!apiKey) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Missing API key. Provide via Authorization header or api_key query parameter.',
            });
            return;
        }

        // Get all API keys and verify
        const keys = await executeQuery<ApiKeyRow>(
            'SELECT * FROM api_keys WHERE is_active = TRUE'
        );

        let authenticated = false;
        let userId: string | undefined;

        for (const keyRow of keys) {
            const isValid = await verifyApiKey(apiKey, keyRow.key_hash);
            if (isValid) {
                authenticated = true;
                userId = keyRow.user_id;

                // Update last_used_at
                await executeQuery(
                    'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
                    [keyRow.id]
                );
                break;
            }
        }

        if (!authenticated) {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid API key',
            });
            return;
        }

        // Attach userId to request for downstream use
        req.userId = userId;
        next();
    } catch (error) {
        console.error('API key validation error:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: 'API key validation failed',
        });
    }
}
