interface KPICardProps {
  icon?: string
  label: string
  valor: string | number
  sub?: string
  cor?: string
  border?: string
  onClick?: () => void
  size?: 'sm' | 'md' | 'lg'
}

/**
 * KPICard — componente unificado para exibir métricas chave
 * Usado em todos os dashboards do Excalibur HQ
 *
 * @example
 * <KPICard icon="💰" label="MRR" valor={84800} sub="48 clientes" cor="#4ade80" />
 */
export default function KPICard({
  icon, label, valor, sub, cor = '#fff', border, onClick, size = 'md',
}: KPICardProps) {
  const sizes = {
    sm: { padding: '10px 12px', valor: 18, label: 9, sub: 9 },
    md: { padding: '14px 16px', valor: 22, label: 10, sub: 10 },
    lg: { padding: '18px 20px', valor: 28, label: 11, sub: 11 },
  }
  const s = sizes[size]

  return (
    <div
      onClick={onClick}
      style={{
        background: '#111827',
        border: `1px solid ${border || '#1f2937'}`,
        borderRadius: 12,
        padding: s.padding,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s, transform 0.1s',
      }}
      onMouseEnter={e => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = cor + '60'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
        }
      }}
      onMouseLeave={e => {
        if (onClick) {
          (e.currentTarget as HTMLDivElement).style.borderColor = border || '#1f2937'
          ;(e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        {icon && <span style={{ fontSize: s.label + 3 }}>{icon}</span>}
        <span style={{ fontSize: s.label, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: s.valor, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>
        {valor}
      </div>
      {sub && (
        <div style={{ fontSize: s.sub, color: '#4b5563', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  )
}
