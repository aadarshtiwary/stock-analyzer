export function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl shimmer" />
          <div className="flex-1">
            <div className="h-6 w-48 rounded-lg shimmer mb-2" />
            <div className="h-4 w-24 rounded-lg shimmer" />
          </div>
          <div className="h-10 w-32 rounded-lg shimmer" />
        </div>
      </div>

      {/* Verdict banner */}
      <div className="h-20 rounded-2xl shimmer" />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center justify-center h-48">
          <div className="w-36 h-36 rounded-full shimmer" />
        </div>
        <div className="lg:col-span-2 grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="glass-card p-4 h-20 shimmer" />
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card h-96 shimmer" />

      {/* Table */}
      <div className="glass-card p-5 space-y-3">
        <div className="h-6 w-40 rounded shimmer" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 rounded shimmer" />
        ))}
      </div>
    </div>
  );
}
