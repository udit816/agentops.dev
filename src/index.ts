import dotenv from 'dotenv';
import app from './server.js';
import { initDb, closeDb } from './db/client.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');

async function start() {
    try {
        // Initialize database connection
        await initDb();

        // Start HTTP server
        const server = app.listen(PORT, () => {
            console.error(`🚀 Server running on http://localhost:${PORT}`);
            console.error(`📊 Health check: http://localhost:${PORT}/health`);
            console.error(`📥 Ingestion API: http://localhost:${PORT}/api/v1/ingest`);
        });

        // Graceful shutdown
        const shutdown = async (signal: string) => {
            console.error(`\n${signal} received. Shutting down gracefully...`);

            server.close(async () => {
                console.error('HTTP server closed');
                await closeDb();
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                console.error('Forcing shutdown');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

start();
