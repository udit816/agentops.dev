import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { pool } from '../src/db/client.js';
import { generateApiKey, hashApiKey } from '../src/utils/apiKey.js';
import { executeQuery } from '../src/db/client.js';

dotenv.config();

async function setupDatabase() {
    console.error('🔧 Setting up database...\n');

    try {
        // Read and execute schema
        console.error('📄 Running schema migrations...');
        const schema = readFileSync('src/db/schema.sql', 'utf-8');
        await pool.query(schema);
        console.error('✅ Schema created successfully\n');

        // Generate initial API key
        console.error('🔑 Generating initial API key...');
        const apiKey = generateApiKey();
        const keyHash = await hashApiKey(apiKey);

        await executeQuery(
            'INSERT INTO api_keys (key_hash, user_id) VALUES ($1, $2)',
            [keyHash, 'admin']
        );

        console.error('✅ API key created successfully\n');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('🔐 SAVE THIS API KEY (it will not be shown again):');
        console.error(`\n   ${apiKey}\n`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.error('✅ Database setup complete!');
    } catch (error) {
        console.error('❌ Database setup failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

setupDatabase();
