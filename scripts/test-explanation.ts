import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { pool } from '../src/db/client.js';
import { reconstructRun } from '../src/services/runReconstructor.js';
import {
    insertRun,
    insertStep,
} from '../src/services/eventStore.js';

dotenv.config();

async function testExplanation() {
    console.error('🧪 Testing classification and explanation...\n');

    try {
        // Load test fixtures
        const fixtures = JSON.parse(
            readFileSync('tests/fixtures/sampleRuns.json', 'utf-8')
        );

        // Ensure test data is in database
        console.error('📥 Ensuring test data exists in database...');
        await insertRun(fixtures.loopScenario.run);
        for (const step of fixtures.loopScenario.steps) {
            await insertStep(step);
        }

        await insertRun(fixtures.costExplosionScenario.run);
        for (const step of fixtures.costExplosionScenario.steps) {
            await insertStep(step);
        }
        console.error('✅ Test data loaded\n');

        // Test 1: Loop Scenario - Control Flow Failure
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Test 1: Loop Scenario - Control Flow Failure');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const loopRun = await reconstructRun('loop-run-001');
        if (!loopRun || !loopRun.postMortem) {
            throw new Error('Loop run or post-mortem not found');
        }

        console.error(`Classification:`);
        console.error(`  Type: ${loopRun.postMortem.classification.primaryType}`);
        console.error(`  Confidence: ${loopRun.postMortem.classification.confidence}`);
        console.error(`  Reason: ${loopRun.postMortem.classification.reason}\n`);

        console.error(`Post-Mortem Explanation:`);
        console.error(loopRun.postMortem.explanation);
        console.error('\n');

        // Test 2: Cost Explosion Scenario
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Test 2: Cost Explosion Scenario');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const costRun = await reconstructRun('cost-explosion-run-001');
        if (!costRun || !costRun.postMortem) {
            throw new Error('Cost explosion run or post-mortem not found');
        }

        console.error(`Classification:`);
        console.error(`  Type: ${costRun.postMortem.classification.primaryType}`);
        console.error(`  Confidence: ${costRun.postMortem.classification.confidence}`);
        console.error(`  Reason: ${costRun.postMortem.classification.reason}\n`);

        console.error(`Post-Mortem Explanation:`);
        console.error(costRun.postMortem.explanation);
        console.error('\n');

        // Validation checks
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Validation Checks');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const checks = [
            {
                name: 'Loop scenario classified as control_flow_failure',
                pass: loopRun.postMortem.classification.primaryType === 'control_flow_failure',
            },
            {
                name: 'Cost explosion classified as cost_explosion',
                pass: costRun.postMortem.classification.primaryType === 'cost_explosion',
            },
            {
                name: 'Loop explanation includes summary',
                pass: loopRun.postMortem.explanation.includes('Summary:'),
            },
            {
                name: 'Explanations include "What happened"',
                pass: loopRun.postMortem.explanation.includes('What happened') &&
                    costRun.postMortem.explanation.includes('What happened'),
            },
            {
                name: 'Explanations include "Why it failed"',
                pass: loopRun.postMortem.explanation.includes('Why it failed') &&
                    costRun.postMortem.explanation.includes('Why it failed'),
            },
            {
                name: 'Explanations include cost impact',
                pass: loopRun.postMortem.explanation.includes('Cost impact') &&
                    costRun.postMortem.explanation.includes('Cost impact'),
            },
            {
                name: 'Loop explanation mentions retry/loop behavior',
                pass: loopRun.postMortem.explanation.toLowerCase().includes('retry') ||
                    loopRun.postMortem.explanation.toLowerCase().includes('loop'),
            },
            {
                name: 'Cost explanation mentions high cost',
                pass: costRun.postMortem.explanation.toLowerCase().includes('cost') ||
                    costRun.postMortem.explanation.toLowerCase().includes('token'),
            },
        ];

        let passed = 0;
        for (const check of checks) {
            const icon = check.pass ? '✅' : '❌';
            console.error(`${icon} ${check.name}`);
            if (check.pass) passed++;
        }

        console.error(`\n${passed}/${checks.length} checks passed\n`);

        if (passed === checks.length) {
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.error('✅ All tests passed!');
            console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        } else {
            console.error('❌ Some tests failed\n');
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

testExplanation();
