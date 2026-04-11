'use client'

interface Props {
  data: number[]
  width?: number
  height?: number
  color?: string
}

export default function Sparkline({ data, width = 60, height = 18, color = '#f59e0b' }: Props) {
  if (!data || data.length < 2) return <span className="text-gray-700 text-[10px]">—</span>

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  // Tendência: cor baseada em primeira vs última (CPL menor é melhor)
  const tendencia = data[data.length - 1] - data[0]
  const corFinal = tendencia > 0 ? '#ef4444' : tendencia < 0 ? '#22c55e' : color

  return (
    <svg width={width} height={height} style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <polyline fill="none" stroke={corFinal} strokeWidth="1.5" points={points} />
    </svg>
  )
}
