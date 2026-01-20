import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { pool } from '../src/db/client.js';
import { reconstructRun } from '../src/services/runReconstructor.js';
import {
    insertRun,
    insertStep,
} from '../src/services/eventStore.js';

dotenv.config();

async function testReconstruction() {
    console.error('🧪 Testing run reconstruction and signal detection...\n');

    try {
        // Load test fixtures
        const fixtures = JSON.parse(
            readFileSync('tests/fixtures/sampleRuns.json', 'utf-8')
        );

        // Ensure test data is in database
        console.error('📥 Ensuring test data exists in database...');
        await insertRun(fixtures.hallucinationScenario.run);
        for (const step of fixtures.hallucinationScenario.steps) {
            await insertStep(step);
        }

        await insertRun(fixtures.loopScenario.run);
        for (const step of fixtures.loopScenario.steps) {
            await insertStep(step);
        }

        await insertRun(fixtures.costExplosionScenario.run);
        for (const step of fixtures.costExplosionScenario.steps) {
            await insertStep(step);
        }
        console.error('✅ Test data loaded\n');

        // Test 1: Reconstruct hallucination scenario
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Test 1: Hallucination Scenario');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const hallucinationRun = await reconstructRun('hallucination-run-001');
        if (!hallucinationRun) {
            throw new Error('Hallucination run not found');
        }

        console.error(`Status: ${hallucinationRun.status}`);
        console.error(`Steps: ${hallucinationRun.timeline.stepCount}`);
        console.error(`Duration: ${hallucinationRun.timeline.durationMs}ms`);
        console.error(`Total Cost: $${hallucinationRun.cost.totalCostUsd.toFixed(4)}`);
        console.error(`Total Tokens: ${hallucinationRun.cost.totalTokens}`);
        console.error(`Has Anomalies: ${hallucinationRun.signals.hasAnomalies}`);
        console.error(`Errors: ${hallucinationRun.signals.errors.length}`);
        console.error(`Retries: ${hallucinationRun.signals.retries.length}`);
        console.error(`Loops: ${hallucinationRun.signals.loops.length}\n`);

        // Test 2: Reconstruct loop scenario
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Test 2: Loop Scenario');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const loopRun = await reconstructRun('loop-run-001');
        if (!loopRun) {
            throw new Error('Loop run not found');
        }

        console.error(`Status: ${loopRun.status}`);
        console.error(`Steps: ${loopRun.timeline.stepCount}`);
        console.error(`Has Anomalies: ${loopRun.signals.hasAnomalies}`);
        console.error(`Errors: ${loopRun.signals.errors.length}`);
        console.error(`Retries: ${loopRun.signals.retries.length}`);
        console.error(`Loops: ${loopRun.signals.loops.length}`);
        console.error(`Tool Failures: ${loopRun.signals.toolFailures.length}`);

        if (loopRun.signals.loops.length > 0) {
            console.error(`\nLoop Details:`);
            for (const loop of loopRun.signals.loops) {
                console.error(`  - Tool: ${loop.tool}`);
                console.error(`  - Repetitions: ${loop.repetitions}`);
                console.error(`  - Pattern: ${loop.pattern}`);
            }
        }

        if (loopRun.signals.toolFailures.length > 0) {
            console.error(`\nTool Failures:`);
            for (const failure of loopRun.signals.toolFailures) {
                console.error(`  - Tool: ${failure.tool}`);
                console.error(`  - Failures: ${failure.failureCount}`);
            }
        }
        console.error('');

        // Test 3: Reconstruct cost explosion scenario
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Test 3: Cost Explosion Scenario');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const costRun = await reconstructRun('cost-explosion-run-001');
        if (!costRun) {
            throw new Error('Cost explosion run not found');
        }

        console.error(`Status: ${costRun.status}`);
        console.error(`Steps: ${costRun.timeline.stepCount}`);
        console.error(`Duration: ${costRun.timeline.durationMs}ms`);
        console.error(`Total Cost: $${costRun.cost.totalCostUsd.toFixed(4)}`);
        console.error(`Total Tokens: ${costRun.cost.totalTokens}`);
        console.error(`Prompt Tokens: ${costRun.cost.promptTokens}`);
        console.error(`Completion Tokens: ${costRun.cost.completionTokens}`);

        if (costRun.cost.mostExpensiveStep) {
            console.error(`\nMost Expensive Step:`);
            console.error(`  - Step ID: ${costRun.cost.mostExpensiveStep.stepId}`);
            console.error(`  - Cost: $${costRun.cost.mostExpensiveStep.cost.toFixed(4)}`);
        }

        console.error(`\nCost by Step Type:`);
        for (const [type, cost] of Object.entries(costRun.cost.costByStepType)) {
            console.error(`  - ${type}: $${cost.toFixed(4)}`);
        }
        console.error('');

        // Validation checks
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.error('Validation Checks');
        console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const checks = [
            {
                name: 'Loop scenario has loop signals',
                pass: loopRun.signals.loops.length > 0,
            },
            {
                name: 'Loop scenario has tool failures',
                pass: loopRun.signals.toolFailures.length > 0,
            },
            {
                name: 'Loop scenario has errors',
                pass: loopRun.signals.errors.length > 0,
            },
            {
                name: 'Cost explosion has high cost',
                pass: costRun.cost.totalCostUsd > 0.30,
            },
            {
                name: 'Cost explosion identified expensive step',
                pass: costRun.cost.mostExpensiveStep !== null,
            },
            {
                name: 'All scenarios have timelines',
                pass: hallucinationRun.timeline.stepCount > 0 &&
                    loopRun.timeline.stepCount > 0 &&
                    costRun.timeline.stepCount > 0,
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

testReconstruction();
