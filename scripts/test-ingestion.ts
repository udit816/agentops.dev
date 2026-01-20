import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import {
    insertRun,
    insertStep,
    getRunById,
    getStepsByRunId,
} from '../src/services/eventStore.js';
import { pool } from '../src/db/client.js';

dotenv.config();

async function testIngestion() {
    console.error('🧪 Testing ingestion flow...\n');

    try {
        // Load test fixtures
        const fixtures = JSON.parse(
            readFileSync('tests/fixtures/sampleRuns.json', 'utf-8')
        );

        // Test 1: Insert a valid run
        console.error('Test 1: Inserting valid run...');
        const run = await insertRun(fixtures.validRun);
        console.error(`✅ Run inserted: ${run.run_id}\n`);

        // Test 2: Insert steps for the run
        console.error('Test 2: Inserting steps...');
        for (const step of fixtures.validSteps) {
            const result = await insertStep(step);
            console.error(`✅ Step inserted: ${result.step_id}`);
        }
        console.error('');

        // Test 3: Retrieve the run
        console.error('Test 3: Retrieving run...');
        const retrievedRun = await getRunById(fixtures.validRun.run_id);
        console.error(`✅ Retrieved run: ${retrievedRun?.run_id}\n`);

        // Test 4: Retrieve steps
        console.error('Test 4: Retrieving steps...');
        const retrievedSteps = await getStepsByRunId(fixtures.validRun.run_id);
        console.error(`✅ Retrieved ${retrievedSteps.length} steps\n`);

        // Test 5: Idempotency test (insert same run again)
        console.error('Test 5: Testing idempotency...');
        const duplicateRun = await insertRun(fixtures.validRun);
        console.error(
            `✅ Duplicate run handled: ${duplicateRun.run_id} (should be same ID)\n`
        );

        // Test 6: Insert hallucination scenario
        console.error('Test 6: Inserting hallucination scenario...');
        await insertRun(fixtures.hallucinationScenario.run);
        for (const step of fixtures.hallucinationScenario.steps) {
            await insertStep(step);
        }
        console.error('✅ Hallucination scenario inserted\n');

        // Test 7: Insert loop scenario
        console.error('Test 7: Inserting loop scenario...');
        await insertRun(fixtures.loopScenario.run);
        for (const step of fixtures.loopScenario.steps) {
            await insertStep(step);
        }
        console.error('✅ Loop scenario inserted\n');

        // Test 8: Insert cost explosion scenario
        console.error('Test 8: Inserting cost explosion scenario...');
        await insertRun(fixtures.costExplosionScenario.run);
        for (const step of fixtures.costExplosionScenario.steps) {
            await insertStep(step);
        }
        console.error('✅ Cost explosion scenario inserted\n');

        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('✅ All tests passed!');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

testIngestion();
