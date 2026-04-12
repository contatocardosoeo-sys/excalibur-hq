'use client'

import { useEffect, useMemo, useState } from 'react'
import { NumberTicker } from '@/components/ui/number-ticker'

type Stats = { total: number; pendente: number; aprovado: number; pago: number; qtd: number }
type Breakdown = {
  agendamento: { qtd: number; valor: number }
  comparecimento: { qtd: number; valor: number }
  venda: { qtd: number; valor: number }
}
type Resp = {
  closer: Stats
  sdr: Stats
  total: number
  breakdown: Breakdown
  bonus_equipe: Array<{ patamar: number; total_bonus: number; distribuicao: { closer: number; sdr: number } }>
}

type Periodo = 'hoje' | 'semana' | 'mes' | 'tudo'

type Props = {
  role: 'sdr' | 'closer'
  email?: string
  nome: string
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

function rangeDoPeriodo(p: Periodo): { inicio?: string; fim?: string } {
  const hoje = new Date()
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  if (p === 'tudo') return {}
  if (p === 'hoje') return { inicio: iso(hoje), fim: iso(hoje) }
  if (p === 'semana') {
    const d = new Date(hoje)
    const dow = d.getDay() || 7 // 1=seg ... 7=dom
    d.setDate(d.getDate() - (dow - 1))
    return { inicio: iso(d), fim: iso(hoje) }
  }
  // mes
  const prim = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  return { inicio: iso(prim), fim: iso(hoje) }
}

export default function ComissoesHero({ role, email, nome }: Props) {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const carregar = async () => {
    const { inicio, fim } = rangeDoPeriodo(periodo)
    const qs = new URLSearchParams()
    qs.set('role', role)
    if (email) qs.set('email', email)
    if (inicio) qs.set('inicio', inicio)
    if (fim) qs.set('fim', fim)
    try {
      const r = await fetch('/api/comissoes?' + qs.toString(), { cache: 'no-store' })
      const j = await r.json()
      setData(j)
      setUpdatedAt(new Date())
    } catch {
      /* */
    }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    const i = setInterval(carregar, 15_000)
    return () => clearInterval(i)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, role, email])

  const stats = useMemo(() => {
    if (!data) return null
    return role === 'closer' ? data.closer : data.sdr
  }, [data, role])

  const aReceber = (stats?.pendente || 0) + (stats?.aprovado || 0)
  const pago = stats?.pago || 0
  const total = stats?.total || 0
  const breakdown = data?.breakdown

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #0a0f1a 0%, #111827 50%, #1a1410 100%)',
        border: '2px solid #f59e0b',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Brilho ambar */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          background: 'radial-gradient(circle, #f59e0b30 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Header: título + filtro */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          position: 'relative',
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}>
            💰 Comissão {nome} · {role === 'closer' ? 'Closer' : 'SDR'}
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
            tempo real · atualiza a cada 15s
            {updatedAt && <span> · último: {updatedAt.toLocaleTimeString('pt-BR')}</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['hoje', 'semana', 'mes', 'tudo'] as Periodo[]).map(p => (
            <button
              key={p}
              data-touch-exempt
              onClick={() => setPeriodo(p)}
              style={{
                minHeight: 36,
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                cursor: 'pointer',
                background: periodo === p ? '#f59e0b' : '#1f2937',
                color: periodo === p ? '#030712' : '#9ca3af',
                border: periodo === p ? '1px solid #f59e0b' : '1px solid #374151',
                transition: 'all 0.15s',
              }}
            >
              {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Tudo'}
            </button>
          ))}
        </div>
      </div>

      {/* NÚMERO GIGANTE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
          gap: 8,
          margin: '20px 0 16px',
          position: 'relative',
        }}
      >
        <span style={{ fontSize: 36, fontWeight: 700, color: '#fbbf24', lineHeight: 1 }}>R$</span>
        <span
          style={{
            fontSize: 'clamp(60px, 14vw, 140px)',
            fontWeight: 900,
            color: '#fff',
            fontFamily: 'monospace',
            lineHeight: 1,
            letterSpacing: -2,
            textShadow: '0 0 40px #f59e0b40',
          }}
        >
          {loading ? '...' : <NumberTicker value={total} />}
        </span>
      </div>

      {/* A receber vs pago — destaque */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 10,
          marginBottom: 14,
          position: 'relative',
        }}
      >
        <div
          style={{
            background: '#0a0f1a',
            border: '1px solid #fbbf2440',
            borderRadius: 12,
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>
            ⏳ A receber
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fbbf24', fontFamily: 'monospace', marginTop: 4 }}>
            R$ {fmtBRL(aReceber)}
          </div>
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>
            pendente R${fmtBRL(stats?.pendente || 0)} · aprovado R${fmtBRL(stats?.aprovado || 0)}
          </div>
        </div>

        <div
          style={{
            background: '#0a0f1a',
            border: '1px solid #22c55e40',
            borderRadius: 12,
            padding: '12px 16px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 10, color: '#22c55e', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>
            ✅ Já no bolso
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#22c55e', fontFamily: 'monospace', marginTop: 4 }}>
            R$ {fmtBRL(pago)}
          </div>
          <div style={{ fontSize: 9, color: '#6b7280', marginTop: 2 }}>comissões já pagas</div>
        </div>
      </div>

      {/* Breakdown por tipo — só SDR (closer é só venda) */}
      {breakdown && role === 'sdr' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            position: 'relative',
          }}
        >
          {[
            { label: '📅 Agendamentos', valor: breakdown.agendamento.valor, qtd: breakdown.agendamento.qtd, cor: '#60a5fa' },
            { label: '🤝 Reuniões', valor: breakdown.comparecimento.valor, qtd: breakdown.comparecimento.qtd, cor: '#a78bfa' },
            { label: '💰 Vendas', valor: breakdown.venda.valor, qtd: breakdown.venda.qtd, cor: '#22c55e' },
          ].map((b, i) => (
            <div
              key={i}
              style={{
                background: '#0a0f1a',
                border: `1px solid ${b.cor}30`,
                borderRadius: 10,
                padding: '10px 12px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>{b.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: b.cor, fontFamily: 'monospace', marginTop: 2 }}>
                R$ {fmtBRL(b.valor)}
              </div>
              <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{b.qtd}×</div>
            </div>
          ))}
        </div>
      )}

      {/* Closer — breakdown simples mostrando nº de vendas */}
      {breakdown && role === 'closer' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
            position: 'relative',
          }}
        >
          <div
            style={{
              background: '#0a0f1a',
              border: '1px solid #22c55e30',
              borderRadius: 10,
              padding: '12px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
              💰 Vendas fechadas
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#22c55e', fontFamily: 'monospace', marginTop: 2 }}>
              {breakdown.venda.qtd}
            </div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>no período selecionado</div>
          </div>
          <div
            style={{
              background: '#0a0f1a',
              border: '1px solid #f59e0b30',
              borderRadius: 10,
              padding: '12px 14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
              📊 Comissão média/venda
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace', marginTop: 2 }}>
              R$ {breakdown.venda.qtd > 0 ? fmtBRL(breakdown.venda.valor / breakdown.venda.qtd) : '0'}
            </div>
            <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>ticket médio × 5%</div>
          </div>
        </div>
      )}

      {/* Bônus de equipe */}
      {data && data.bonus_equipe.length > 0 && (
        <div
          style={{
            marginTop: 12,
            background: '#f59e0b10',
            border: '1px solid #f59e0b40',
            borderRadius: 10,
            padding: '10px 14px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>🏆 Bônus de equipe desbloqueado!</span>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
            +R$ {fmtBRL(data.bonus_equipe.reduce((s, b) => s + (role === 'closer' ? b.distribuicao.closer : b.distribuicao.sdr), 0))}
          </span>
        </div>
      )}
    </div>
  )
}
