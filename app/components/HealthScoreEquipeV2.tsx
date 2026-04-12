'use client'

import { useEffect, useState } from 'react'

type Membro = {
  nome: string
  email: string
  role: string
  emoji: string
  score_total: number
  execucao: number
  ritmo: number
  aprendizado: number
  qualidade: number
  feedback_score: number
  nivel: string
  cor: string
  tendencia: string
  dias_sem_acesso: number
  alerta_inatividade: boolean
  alerta_tendencia: boolean
}

type Resp = {
  equipe: Membro[]
  media_score: number
  nivel_empresa: string
  alertas: number
}

const DIMENSOES: Array<{ key: keyof Membro; label: string; cor: string }> = [
  { key: 'execucao', label: 'Execução', cor: '#22c55e' },
  { key: 'ritmo', label: 'Ritmo', cor: '#3b82f6' },
  { key: 'aprendizado', label: 'Aprendizado', cor: '#a855f7' },
  { key: 'qualidade', label: 'Qualidade', cor: '#f59e0b' },
  { key: 'feedback_score', label: 'Feedback', cor: '#06b6d4' },
]

export default function HealthScoreEquipeV2() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health-score/equipe', { cache: 'no-store' })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || !data) return null

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0 }}>
            🧠 Health Score da Equipe
          </h3>
          <p style={{ color: '#6b7280', fontSize: 11, margin: '2px 0 0' }}>
            Score médio: <span style={{ color: '#f59e0b', fontWeight: 700 }}>{data.media_score}/100</span>
            {data.alertas > 0 && (
              <span style={{ color: '#ef4444', marginLeft: 8 }}>
                ⚠️ {data.alertas} alerta{data.alertas > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
        {data.equipe.map(m => (
          <button
            key={m.email}
            data-touch-exempt
            onClick={() => setExpandido(expandido === m.email ? null : m.email)}
            style={{
              textAlign: 'left',
              background: '#111827',
              border: `1px solid ${m.alerta_inatividade || m.alerta_tendencia ? '#ef444440' : '#1f2937'}`,
              borderRadius: 12,
              padding: 14,
              cursor: 'pointer',
              width: '100%',
              minHeight: 44,
              transition: 'all 0.15s',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16 }}>{m.emoji}</span>
                <div>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 700 }}>{m.nome}</div>
                  <div style={{ fontSize: 9, color: '#6b7280' }}>{m.role}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: m.cor, fontFamily: 'monospace' }}>
                  {m.score_total}
                </div>
                <div
                  style={{
                    fontSize: 8,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: m.cor,
                    background: `${m.cor}15`,
                    padding: '1px 6px',
                    borderRadius: 4,
                  }}
                >
                  {m.nivel}
                </div>
              </div>
            </div>

            {/* Barra de progresso principal */}
            <div style={{ height: 4, background: '#1f2937', borderRadius: 2, marginBottom: 6 }}>
              <div
                style={{
                  height: 4,
                  width: `${Math.min(100, m.score_total)}%`,
                  background: m.cor,
                  borderRadius: 2,
                  transition: 'width 0.5s',
                }}
              />
            </div>

            {/* Alertas */}
            {(m.alerta_inatividade || m.alerta_tendencia) && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
                {m.alerta_inatividade && (
                  <span style={{ fontSize: 9, background: '#ef444420', color: '#ef4444', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    ⚠️ {m.dias_sem_acesso}d sem acesso
                  </span>
                )}
                {m.alerta_tendencia && (
                  <span style={{ fontSize: 9, background: '#f9731620', color: '#f97316', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    📉 tendência caindo
                  </span>
                )}
              </div>
            )}

            {/* Dimensões expandidas */}
            {expandido === m.email && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #1f2937' }}>
                {DIMENSOES.map(d => {
                  const val = Number(m[d.key] || 0)
                  return (
                    <div key={d.key} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                        <span style={{ color: '#9ca3af' }}>{d.label}</span>
                        <span style={{ color: d.cor, fontWeight: 700 }}>{val}/100</span>
                      </div>
                      <div style={{ height: 3, background: '#1f2937', borderRadius: 2 }}>
                        <div
                          style={{
                            height: 3,
                            width: `${Math.min(100, val)}%`,
                            background: d.cor,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
