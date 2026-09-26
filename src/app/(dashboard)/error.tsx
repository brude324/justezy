"use client";

import { useEffect } from "react";

interface DashboardErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error("[Dashboard Route Error]", {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-lg w-full">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
          !
        </div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Unable to Load Section</h2>
        <p className="text-sm text-gray-500 mb-6">
          An error occurred while loading this section of the dashboard. Your other modules and navigation remain operational.
        </p>
        <button
          onClick={() => reset()}
          className="py-2 px-5 bg-lamaSky text-gray-800 font-medium rounded-md hover:opacity-90 transition text-sm"
        >
          Retry Section
        </button>
      </div>
    </div>
  );
}
