"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] p-6 text-center">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full flex flex-col items-center">
        <Image src="/logo.png" alt="SchoolyardSMS" width={56} height={56} className="mb-4" />

        <div className="flex items-center gap-2 mb-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isOnline ? "bg-green-500 animate-pulse" : "bg-amber-500"
            }`}
          />
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {isOnline ? "Connection Restored" : "Offline Mode"}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {isOnline ? "Ready to Reconnect" : "You Are Currently Offline"}
        </h1>

        <p className="text-sm text-gray-500 mb-6">
          {isOnline
            ? "Your internet connection is back. Click below to return to your school workspace."
            : "SchoolyardSMS requires an active internet connection to ensure academic data integrity and strict tenant isolation. Attendance and marks cannot be modified offline."}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={handleRetry}
            className="flex-1 py-2.5 px-4 bg-lamaPurple text-white font-medium rounded-md hover:opacity-90 transition text-sm text-center shadow-sm"
          >
            Retry Connection
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
