import express from 'express';
import cors from 'cors';
import ingestRoutes from './api/routes/ingest.js';
import runsRoutes from './api/routes/runs.js';
import { validateApiKey } from './api/middleware/auth.js';
import { ingestRateLimiter } from './api/middleware/rateLimit.js';
import { errorHandler } from './api/middleware/errorHandler.js';

const app = express();

// CORS configuration for frontend
const corsOptions = {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '150kb' })); // Slightly higher than our check to let our middleware handle it

// Health check (no auth required)
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'agentops-ingestion',
    });
});

// Mount ingestion routes with authentication and rate limiting
app.use(
    '/api/v1/ingest',
    validateApiKey,
    ingestRateLimiter,
    ingestRoutes
);

// Mount webhook routes (same middleware)
app.use(
    '/api/v1/webhook',
    validateApiKey,
    ingestRateLimiter,
    ingestRoutes
);

// Mount runs routes (read operations)
app.use('/api/v1/runs', validateApiKey, runsRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
