'use client'

import { useEffect, useState } from 'react'

type EtapaDef = {
  id: string
  label: string
  emoji: string
  ordem: number
  metrica: string
  cor: string
  descricao: string
  meta_principal?: boolean
}

type Amostra = { nome: string; telefone: string; updated_at: string }

type Resp = {
  etapas: EtapaDef[]
  distribuicao: Record<string, number>
  amostra: Record<string, Amostra[]>
  total: number
}

function tempoRel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function EtapasDistribuicao() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const carregar = async () => {
      try {
        const r = await fetch('/api/sdr/etapas-distribuicao', { cache: 'no-store' })
        const j = await r.json()
        if (!cancelled) setData(j)
      } catch {
        /* */
      }
      setLoading(false)
    }
    carregar()
    const i = setInterval(carregar, 30_000)
    return () => {
      cancelled = true
      clearInterval(i)
    }
  }, [])

  if (loading || !data) {
    return (
      <div
        style={{
          background: '#111827',
          border: '1px solid #1f2937',
          borderRadius: 14,
          padding: 16,
          marginBottom: 16,
          fontSize: 11,
          color: '#6b7280',
        }}
      >
        Carregando distribuição por etapa...
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#111827',
        border: '1px solid #1f2937',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            🎯 Distribuição por etapa (CRM Waseller)
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
            {data.total} leads no CRM · atualiza a cada 30s · fluxos 100% no Waseller
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 8,
        }}
      >
        {data.etapas.map(etapa => {
          const count = data.distribuicao[etapa.id] || 0
          const amostra = data.amostra[etapa.id] || []
          const isExpanded = expanded === etapa.id
          return (
            <button
              key={etapa.id}
              data-touch-exempt
              onClick={() => setExpanded(isExpanded ? null : etapa.id)}
              style={{
                minHeight: 44,
                textAlign: 'left',
                background: '#0a0f1a',
                borderLeft: `3px solid ${etapa.cor}`,
                border: '1px solid #1f2937',
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 18 }}>{etapa.emoji}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>
                      {etapa.ordem}. {etapa.label}
                      {etapa.meta_principal && (
                        <span
                          style={{
                            marginLeft: 4,
                            fontSize: 8,
                            background: '#f59e0b',
                            color: '#030712',
                            padding: '1px 4px',
                            borderRadius: 4,
                            fontWeight: 800,
                          }}
                        >
                          META
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 9, color: '#6b7280', marginTop: 1 }}>{etapa.descricao}</div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: count > 0 ? etapa.cor : '#374151',
                    fontFamily: 'monospace',
                    lineHeight: 1,
                    minWidth: 28,
                    textAlign: 'right',
                  }}
                >
                  {count}
                </div>
              </div>

              {isExpanded && amostra.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px solid #1f2937',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  {amostra.map((a, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 10,
                        color: '#9ca3af',
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 4,
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {a.nome}
                      </span>
                      <span style={{ color: '#4b5563' }}>{tempoRel(a.updated_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
