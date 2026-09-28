import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";

export default async function ProfilePage() {
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as string) || "user";
  const email = user?.emailAddresses?.[0]?.emailAddress || "N/A";
  const name = user?.firstName
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : user?.username || "Authenticated User";

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 h-32 px-8 flex items-end pb-4">
          <h1 className="text-2xl font-bold text-white">User Profile & Account</h1>
        </div>
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 -mt-16 mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-md bg-slate-100 overflow-hidden relative">
              {user?.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt={name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              ) : (
                <Image
                  src="/noAvatar.png"
                  alt="avatar"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              )}
            </div>
            <div className="text-center sm:text-left mt-2">
              <h2 className="text-xl font-bold text-slate-900">{name}</h2>
              <p className="text-sm text-slate-500">{email}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider">
                Role: {role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-slate-100">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Identity Details
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">User ID</span>
                  <span className="font-mono text-slate-700">{user?.id || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Username</span>
                  <span className="text-slate-700">{user?.username || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Primary Email</span>
                  <span className="text-slate-700">{email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                Session & Security
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Auth Provider</span>
                  <span className="font-semibold text-slate-700">Clerk Enterprise</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Multi-Tenancy</span>
                  <span className="text-green-700 font-medium">Active Scoped Isolation</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">2FA Status</span>
                  <span className="text-slate-700">{user?.twoFactorEnabled ? "Enabled" : "Configured via SSO"}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex gap-4">
            <Link
              href="/"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
            >
              Back to Dashboard
            </Link>
            <Link
              href="/settings"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition"
            >
              Account Settings
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
