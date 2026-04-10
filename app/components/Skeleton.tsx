interface SkeletonProps {
  variant?: 'card' | 'line' | 'circle' | 'rect'
  width?: string | number
  height?: string | number
  count?: number
}

/**
 * Skeleton — placeholder animado para loading state
 * Padronizado para todo o sistema
 *
 * @example
 * <Skeleton variant="card" />
 * <Skeleton variant="line" width="60%" />
 * <Skeleton variant="card" count={4} />
 */
export default function Skeleton({
  variant = 'rect',
  width = '100%',
  height,
  count = 1,
}: SkeletonProps) {
  const heights: Record<string, string | number> = {
    card: 80,
    line: 16,
    circle: 40,
    rect: 60,
  }
  const h = height ?? heights[variant]
  const radius = variant === 'circle' ? '50%' : 8

  const styleBase: React.CSSProperties = {
    background: '#111827',
    borderRadius: radius,
    width,
    height: h,
    animation: 'pulse 1.5s infinite',
  }

  return (
    <>
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} style={{ ...styleBase, marginBottom: i < count - 1 ? 8 : 0 }} />
      ))}
    </>
  )
}

/**
 * SkeletonGrid — grid de skeletons (para dashboards)
 *
 * @example
 * <SkeletonGrid columns={4} rows={2} />
 */
export function SkeletonGrid({ columns = 4, rows = 1 }: { columns?: number; rows?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 10 }}>
      {Array.from({ length: columns * rows }).map((_, i) => (
        <Skeleton key={i} variant="card" />
      ))}
    </div>
  )
}

/**
 * SkeletonPage — skeleton padrão para página inteira
 * (header + KPIs + 3 cards grandes)
 */
export function SkeletonPage() {
  return (
    <div style={{ padding: 32 }}>
      <Skeleton variant="line" width={200} height={28} />
      <div style={{ marginTop: 24 }}>
        <SkeletonGrid columns={4} />
      </div>
      <div style={{ marginTop: 16 }}>
        <Skeleton variant="rect" height={200} count={3} />
      </div>
    </div>
  )
}
