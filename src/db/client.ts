import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'agentops',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Initialize database connection
export async function initDb(): Promise<void> {
    try {
        const client = await pool.connect();
        console.error('✅ Database connection established');
        client.release();
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        throw error;
    }
}

// Close database connection pool
export async function closeDb(): Promise<void> {
    await pool.end();
    console.error('Database connection pool closed');
}

// Execute a query with parameters
export async function executeQuery<T>(
    query: string,
    params: unknown[] = []
): Promise<T[]> {
    const client = await pool.connect();
    try {
        const result = await client.query(query, params);
        return result.rows as T[];
    } finally {
        client.release();
    }
}

// Execute a query and return a single row
export async function executeQueryOne<T>(
    query: string,
    params: unknown[] = []
): Promise<T | null> {
    const rows = await executeQuery<T>(query, params);
    return rows.length > 0 ? rows[0] : null;
}

export { pool };
