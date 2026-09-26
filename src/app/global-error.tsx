"use client";

import { useEffect, useState } from "react";
import { errorReporter } from "@/lib/observability/error-reporter";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    const id = errorReporter.captureException(error, {
      digest: error.digest,
      source: "global-error-boundary",
    });
    setIncidentId(id);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 font-sans text-center">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full border border-gray-200">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Critical System Error</h2>
          <p className="text-sm text-gray-600 mb-4">
            The application encountered a critical system error. Please refresh the page or try again.
          </p>
          {incidentId && (
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 mb-6 text-xs text-gray-600 font-mono">
              Incident Reference: <span className="font-semibold text-gray-800">{incidentId}</span>
            </div>
          )}
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition text-sm"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
