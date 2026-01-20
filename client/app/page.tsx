import Link from 'next/link';
import { getRuns, RunMetadata } from '@/lib/api';

function getStatusBadge(run: RunMetadata) {
  const hasEnded = run.ended_at;
  const status = hasEnded ? 'complete' : 'incomplete';

  const colors = {
    complete: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    incomplete: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status]}`}>
      {status}
    </span>
  );
}

export default async function HomePage() {
  let runs: RunMetadata[] = [];
  let error = null;

  try {
    const data = await getRuns(50, 0);
    runs = data.runs || [];
  } catch (e: any) {
    error = e.message;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h2 className="text-red-800 dark:text-red-300 font-semibold">Error loading runs</h2>
            <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
            <p className="text-red-600 dark:text-red-400 text-sm mt-2">
              Make sure the backend server is running and API_KEY is set in .env.local
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Agent Runs
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            View and analyze AI agent execution failures
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {runs.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">No runs found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Start sending agent run data to see them here
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Run ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Agent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Framework
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {runs.map((run) => (
                  <tr key={run.run_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {run.run_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {run.agent_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {run.framework}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(run)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(run.started_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/runs/${run.run_id}`}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
