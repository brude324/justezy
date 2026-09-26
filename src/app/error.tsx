"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { errorReporter } from "@/lib/observability/error-reporter";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  const [incidentId, setIncidentId] = useState<string | null>(null);

  useEffect(() => {
    const id = errorReporter.captureException(error, {
      digest: error.digest,
    });
    setIncidentId(id);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] p-6 text-center">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full flex flex-col items-center">
        <Image src="/logo.png" alt="SchoolyardSMS" width={48} height={48} className="mb-4" />
        <span className="text-3xl font-extrabold text-red-500 mb-2">Something went wrong</span>
        <p className="text-sm text-gray-500 mb-4">
          An unexpected error occurred while processing your request. Please try again or return to the dashboard.
        </p>
        {incidentId && (
          <div className="bg-gray-50 border border-gray-200 rounded px-3 py-1.5 mb-6 text-xs text-gray-600 font-mono">
            Incident Reference: <span className="font-semibold text-gray-800">{incidentId}</span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => reset()}
            className="flex-1 py-2.5 px-4 bg-lamaPurple text-white font-medium rounded-md hover:opacity-90 transition text-sm text-center"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition text-sm text-center"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
