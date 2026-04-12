'use client'

import { useEffect, useState } from 'react'

type Proposta = {
  id: string
  autor_nome: string
  autor_role: string
  categoria: string
  campo: string
  campo_label: string
  valor_atual: string
  valor_proposto: string
  justificativa: string
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'debater'
  decidido_por: string | null
  decidido_em: string | null
  motivo_decisao: string | null
  aplicado: boolean
  created_at: string
}

const STATUS_COR: Record<string, { bg: string; text: string; label: string }> = {
  pendente: { bg: '#fbbf2420', text: '#fbbf24', label: 'Pendente' },
  aprovado: { bg: '#22c55e20', text: '#22c55e', label: 'Aprovado' },
  rejeitado: { bg: '#ef444420', text: '#ef4444', label: 'Rejeitado' },
  debater: { bg: '#60a5fa20', text: '#60a5fa', label: 'Debater na sessão' },
}

function tempoRelativo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h / 24)}d atrás`
}

export default function PropostasPendentes() {
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<Record<string, string>>({})

  const carregar = async () => {
    try {
      const r = await fetch('/api/propostas-ajuste?pendentes=true', { cache: 'no-store' })
      const j = await r.json()
      setPropostas(j.propostas || [])
    } catch {
      /* */
    }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    const i = setInterval(carregar, 60_000)
    return () => clearInterval(i)
  }, [])

  const decidir = async (id: string, status: 'aprovado' | 'rejeitado' | 'debater', motivo?: string) => {
    setActionMsg(prev => ({ ...prev, [id]: '⏳ ...' }))
    try {
      const r = await fetch('/api/propostas-ajuste', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status,
          decidido_por: 'ceo',
          motivo_decisao: motivo || null,
        }),
      })
      const j = await r.json()
      if (j.success) {
        const labels: Record<string, string> = {
          aprovado: '✅ Aprovado e aplicado',
          rejeitado: '❌ Rejeitado',
          debater: '💬 Marcado para debate',
        }
        setActionMsg(prev => ({ ...prev, [id]: labels[status] }))
        setTimeout(() => carregar(), 1500)
      } else {
        setActionMsg(prev => ({ ...prev, [id]: '❌ ' + (j.error || 'erro') }))
      }
    } catch {
      setActionMsg(prev => ({ ...prev, [id]: '❌ Erro de rede' }))
    }
  }

  if (loading) return null
  if (propostas.length === 0) return null

  return (
    <div
      style={{
        background: '#111827',
        border: '2px solid #f59e0b60',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        position: 'relative',
      }}
    >
      {/* Badge pulsante */}
      <div
        style={{
          position: 'absolute',
          top: -8,
          right: -8,
          background: '#f59e0b',
          color: '#030712',
          fontSize: 11,
          fontWeight: 800,
          borderRadius: '50%',
          width: 24,
          height: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 2s infinite',
        }}
      >
        {propostas.length}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>📝</span>
        <div>
          <div style={{ color: '#f59e0b', fontSize: 13, fontWeight: 700 }}>
            Propostas de ajuste pendentes
          </div>
          <div style={{ color: '#6b7280', fontSize: 10 }}>
            Sua equipe quer alterar métricas — aprove, rejeite ou marque pra debater na próxima sessão
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {propostas.map(p => {
          const s = STATUS_COR[p.status]
          return (
            <div
              key={p.id}
              style={{
                background: '#0a0f1a',
                border: '1px solid #1f2937',
                borderRadius: 12,
                padding: 14,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div>
                  <span
                    style={{
                      fontSize: 9,
                      background: s.bg,
                      color: s.text,
                      padding: '2px 6px',
                      borderRadius: 6,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    {s.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 8 }}>
                    {p.autor_nome} ({p.autor_role}) · {tempoRelativo(p.created_at)}
                  </span>
                </div>
              </div>

              {/* Conteúdo */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, marginBottom: 4 }}>
                  {p.campo_label}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontFamily: 'monospace' }}>
                  <span style={{ color: '#6b7280' }}>{p.valor_atual}</span>
                  <span style={{ color: '#f59e0b', fontSize: 16 }}>→</span>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>{p.valor_proposto}</span>
                </div>
              </div>

              {/* Justificativa */}
              <div
                style={{
                  background: '#111827',
                  borderRadius: 8,
                  padding: '8px 10px',
                  fontSize: 11,
                  color: '#9ca3af',
                  fontStyle: 'italic',
                  marginBottom: 10,
                  borderLeft: '3px solid #f59e0b40',
                }}
              >
                &ldquo;{p.justificativa}&rdquo;
              </div>

              {/* Ações */}
              {p.status === 'pendente' && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    onClick={() => decidir(p.id, 'aprovado')}
                    style={{
                      minHeight: 36,
                      background: '#22c55e',
                      color: '#030712',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    ✅ Aprovar e aplicar
                  </button>
                  <button
                    onClick={() => decidir(p.id, 'rejeitado')}
                    style={{
                      minHeight: 36,
                      background: '#1f2937',
                      color: '#ef4444',
                      border: '1px solid #ef444440',
                      borderRadius: 8,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ❌ Rejeitar
                  </button>
                  <button
                    onClick={() => decidir(p.id, 'debater')}
                    style={{
                      minHeight: 36,
                      background: '#1f2937',
                      color: '#60a5fa',
                      border: '1px solid #60a5fa40',
                      borderRadius: 8,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    💬 Debater na sessão
                  </button>
                </div>
              )}

              {p.status === 'debater' && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => decidir(p.id, 'aprovado')}
                    style={{
                      minHeight: 36,
                      background: '#22c55e20',
                      color: '#22c55e',
                      border: '1px solid #22c55e40',
                      borderRadius: 8,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ✅ Aprovar agora
                  </button>
                  <button
                    onClick={() => decidir(p.id, 'rejeitado')}
                    style={{
                      minHeight: 36,
                      background: '#1f2937',
                      color: '#ef4444',
                      border: '1px solid #ef444440',
                      borderRadius: 8,
                      padding: '6px 14px',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    ❌ Rejeitar
                  </button>
                </div>
              )}

              {actionMsg[p.id] && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, fontWeight: 600 }}>
                  {actionMsg[p.id]}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
