import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F7F8FA] p-6 text-center">
      <div className="bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100 max-w-md w-full flex flex-col items-center">
        <Image src="/logo.png" alt="SchoolyardSMS" width={48} height={48} className="mb-4" />
        <span className="text-4xl font-extrabold text-gray-800 mb-2">404</span>
        <h1 className="text-xl font-semibold text-gray-700 mb-2">Page Not Found</h1>
        <p className="text-sm text-gray-500 mb-6">
          The page or educational record you are looking for does not exist or you do not have permission to view it.
        </p>
        <Link
          href="/"
          className="w-full py-2.5 px-4 bg-lamaSky text-gray-800 font-medium rounded-md hover:opacity-90 transition text-sm text-center"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
