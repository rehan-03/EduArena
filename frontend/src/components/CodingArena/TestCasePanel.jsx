import { useState } from 'react';

export default function TestCasePanel({ testCases = [], results = [], showResults = false }) {
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (index) => {
    setExpanded((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  return (
    <div className="mt-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-2">Test Cases</h3>
      <div className="space-y-2">
        {testCases.map((tc, index) => {
          const result = results[index];
          const isExpanded = expanded[index];
          const status = showResults && result ? result.status : null;

          let statusClass = 'border-gray-700';
          let statusIcon = null;

          if (status === 'passed') {
            statusClass = 'border-green-600';
            statusIcon = '✓';
          } else if (status === 'failed') {
            statusClass = 'border-red-600';
            statusIcon = '✗';
          }

          return (
            <div
              key={index}
              className={`border ${statusClass} rounded-lg overflow-hidden`}
            >
              <button
                onClick={() => toggleExpand(index)}
                className="w-full px-4 py-2 bg-gray-800 flex items-center justify-between text-left"
              >
                <span className="text-sm text-gray-300">
                  Test Case {index + 1}
                </span>
                <div className="flex items-center gap-2">
                  {statusIcon && (
                    <span
                      className={`text-sm font-bold ${
                        status === 'passed' ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {statusIcon}
                    </span>
                  )}
                  <span className="text-gray-500 text-xs">
                    {isExpanded ? '▼' : '▶'}
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-gray-900 space-y-2 text-xs">
                  <div>
                    <span className="text-gray-500">Input:</span>
                    <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-gray-500">Expected:</span>
                    <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto">
                      {tc.expectedOutput}
                    </pre>
                  </div>
                  {showResults && result && (
                    <div>
                      <span className="text-gray-500">Output:</span>
                      <pre className="mt-1 p-2 bg-gray-800 rounded text-gray-300 overflow-x-auto">
                        {result.output}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}