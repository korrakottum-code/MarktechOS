export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-navy-800 rounded"></div>
          <div className="h-8 w-64 bg-navy-800 rounded"></div>
        </div>
        <div className="h-10 w-40 bg-navy-800 rounded-xl"></div>
      </div>

      {/* Filter Bar Skeleton */}
      <div className="bg-navy-900/50 border border-border/50 rounded-3xl p-4 h-16"></div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-navy-900 border border-border rounded-2xl p-4 h-32"></div>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="bg-navy-900 border border-border rounded-2xl p-6 space-y-4">
        <div className="h-6 w-48 bg-navy-800 rounded"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-navy-800 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TableLoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 bg-navy-800 rounded-xl"></div>
      ))}
    </div>
  );
}
