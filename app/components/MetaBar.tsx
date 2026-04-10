interface MetaBarProps {
  label: string
  atual: number
  meta: number
  formato?: 'numero' | 'real' | 'percentual'
  cor?: string
}

const fmtReal = (v: number) =>
  'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtNum = (v: number) => v.toLocaleString('pt-BR')

function corAuto(p: number) {
  if (p >= 80) return '#22c55e'
  if (p >= 50) return '#fbbf24'
  return '#ef4444'
}

/**
 * MetaBar — barra de progresso com label, atual/meta e percentual colorido
 * Usado em dashboards de SDR, Comercial, CEO, COO
 *
 * @example
 * <MetaBar label="Vendas" atual={3} meta={5} />
 * <MetaBar label="MRR" atual={84800} meta={100000} formato="real" />
 */
export default function MetaBar({ label, atual, meta, formato = 'numero', cor }: MetaBarProps) {
  const p = meta > 0 ? Math.round((atual / meta) * 100) : 0
  const corFinal = cor || corAuto(p)

  const fmt = (v: number) => {
    if (formato === 'real') return fmtReal(v)
    if (formato === 'percentual') return v + '%'
    return fmtNum(v)
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: '#9ca3af' }}>{label}</span>
        <span style={{ color: corFinal, fontWeight: 700, fontFamily: 'monospace' }}>
          {fmt(atual)} / {fmt(meta)} ({p}%)
        </span>
      </div>
      <div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            background: corFinal,
            borderRadius: 3,
            width: `${Math.min(p, 100)}%`,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
