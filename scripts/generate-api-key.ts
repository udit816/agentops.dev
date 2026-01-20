import dotenv from 'dotenv';
import { pool } from '../src/db/client.js';
import { generateApiKey, hashApiKey } from '../src/utils/apiKey.js';
import { executeQuery } from '../src/db/client.js';

dotenv.config();

async function generateNewApiKey() {
    const args = process.argv.slice(2);
    const userArg = args.find((arg) => arg.startsWith('--user='));
    const userId = userArg ? userArg.split('=')[1] : 'user-' + Date.now();

    console.error(`🔑 Generating API key for user: ${userId}\n`);

    try {
        const apiKey = generateApiKey();
        const keyHash = await hashApiKey(apiKey);

        await executeQuery(
            'INSERT INTO api_keys (key_hash, user_id) VALUES ($1, $2)',
            [keyHash, userId]
        );

        console.error('✅ API key generated successfully\n');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('🔐 SAVE THIS API KEY (it will not be shown again):');
        console.error(`\n   ${apiKey}\n`);
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.error(`User ID: ${userId}`);
    } catch (error) {
        console.error('❌ Failed to generate API key:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

generateNewApiKey();
