"use client";

import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export default function LogoutPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
          🚪
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Sign Out of SchoolyardSMS</h1>
          <p className="text-sm text-slate-500 mt-2">
            Are you sure you want to end your current session? You will be returned to the institutional login portal.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <SignOutButton redirectUrl="/sign-in">
            <button
              onClick={() => {
                document.cookie = "user_role=; path=/; max-age=0";
              }}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
            >
              Confirm Sign Out
            </button>
          </SignOutButton>
          <Link
            href="/"
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition"
          >
            Cancel
          </Link>
        </div>
      </div>
    </div>
  );
}
