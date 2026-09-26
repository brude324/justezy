export default function DashboardLoading() {
  return (
    <div className="flex-1 p-6 flex flex-col gap-6 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="h-12 bg-gray-200 rounded-lg w-1/3"></div>

      {/* Grid Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-32 bg-gray-200 rounded-2xl"></div>
        <div className="h-32 bg-gray-200 rounded-2xl"></div>
        <div className="h-32 bg-gray-200 rounded-2xl"></div>
        <div className="h-32 bg-gray-200 rounded-2xl"></div>
      </div>

      {/* Content Chart / Table Skeleton */}
      <div className="h-96 bg-gray-200 rounded-2xl w-full"></div>
    </div>
  );
}
