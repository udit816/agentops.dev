import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { getRun, ReconstructedRun } from '@/lib/api';

function PostMortemCard({ run }: { run: ReconstructedRun }) {
    if (!run.postMortem) {
        return (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-yellow-800 dark:text-yellow-300">Post-mortem not available</p>
            </div>
        );
    }

    const { classification, explanation } = run.postMortem;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Post-Mortem Analysis
                </h2>
                <div className="mt-2 flex items-center gap-4">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Classification: <span className="font-medium text-gray-900 dark:text-white">{classification.primaryType}</span>
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Confidence: <span className="font-medium text-gray-900 dark:text-white">{(classification.confidence * 100).toFixed(0)}%</span>
                    </span>
                </div>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:block prose-strong:mt-4 prose-strong:mb-2 prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-li:text-gray-700 dark:prose-li:text-gray-300">
                <ReactMarkdown>{explanation}</ReactMarkdown>
            </div>
        </div>
    );
}

function SignalsBadge({ run }: { run: ReconstructedRun }) {
    const { signals } = run;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Failure Signals
            </h3>
            <div className="space-y-2">
                {signals.retries.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded text-sm font-medium">
                            {signals.retries.length} Retry Pattern(s)
                        </span>
                    </div>
                )}
                {signals.loops.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300 px-2 py-1 rounded text-sm font-medium">
                            {signals.loops.length} Loop(s)
                        </span>
                    </div>
                )}
                {signals.errors.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 px-2 py-1 rounded text-sm font-medium">
                            {signals.errors.length} Error(s)
                        </span>
                    </div>
                )}
                {signals.toolFailures.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 px-2 py-1 rounded text-sm font-medium">
                            {signals.toolFailures.length} Tool Failure(s)
                        </span>
                    </div>
                )}
                {signals.latencySpikes.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 px-2 py-1 rounded text-sm font-medium">
                            {signals.latencySpikes.length} Latency Spike(s)
                        </span>
                    </div>
                )}
                {!signals.hasAnomalies && (
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No anomalies detected</p>
                )}
            </div>
        </div>
    );
}

function CostSummaryCard({ run }: { run: ReconstructedRun }) {
    const { cost } = run;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Cost Summary
            </h3>
            <div className="space-y-3">
                <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Cost:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        ${cost.totalCostUsd.toFixed(4)}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Total Tokens:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                        {cost.totalTokens.toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-500">Prompt:</span>
                    <span className="text-gray-700 dark:text-gray-300">
                        {cost.promptTokens.toLocaleString()}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-500">Completion:</span>
                    <span className="text-gray-700 dark:text-gray-300">
                        {cost.completionTokens.toLocaleString()}
                    </span>
                </div>
                {cost.mostExpensiveStep && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Most Expensive Step:</p>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-700 dark:text-gray-300">{cost.mostExpensiveStep.stepId}</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                ${cost.mostExpensiveStep.cost.toFixed(4)}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
    const { runId } = await params;
    let run: ReconstructedRun | null = null;
    let error = null;

    try {
        const data = await getRun(runId);
        run = data.run;
    } catch (e: any) {
        error = e.message;
    }

    if (error || !run) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <h2 className="text-red-800 dark:text-red-300 font-semibold">Error loading run</h2>
                        <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error || 'Run not found'}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <Link
                        href="/"
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium mb-2 inline-block"
                    >
                        ← Back to Runs
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {run.metadata.run_id}
                    </h1>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <span>Agent: <span className="font-medium">{run.metadata.agent_name}</span></span>
                        <span>Framework: <span className="font-medium">{run.metadata.framework}</span></span>
                        <span>Status: <span className="font-medium">{run.status}</span></span>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <PostMortemCard run={run} />

                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Timeline
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Started:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {new Date(run.timeline.startedAt).toLocaleString()}
                                    </span>
                                </div>
                                {run.timeline.endedAt && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Ended:</span>
                                        <span className="text-gray-900 dark:text-white">
                                            {new Date(run.timeline.endedAt).toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {run.timeline.durationMs && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                                        <span className="text-gray-900 dark:text-white">
                                            {(run.timeline.durationMs / 1000).toFixed(2)}s
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">Steps:</span>
                                    <span className="text-gray-900 dark:text-white">
                                        {run.timeline.stepCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <SignalsBadge run={run} />
                        <CostSummaryCard run={run} />
                    </div>
                </div>
            </main>
        </div>
    );
}
