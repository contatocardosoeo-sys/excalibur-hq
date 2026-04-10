export default function KpiSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-4 animate-pulse">
          <div className="h-3 bg-gray-700/60 rounded w-20 mb-3" />
          <div className="h-8 bg-gray-700/80 rounded w-28 mb-2" />
          <div className="h-3 bg-gray-700/50 rounded w-16" />
        </div>
      ))}
    </>
  )
}
