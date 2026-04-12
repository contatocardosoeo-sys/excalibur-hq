'use client'

import { useEffect, useState } from 'react'

type Etiqueta = {
  id: string
  name: string
  count: number
  hexColor: string
}

type Funil = Record<string, { count: number; nomes: string[] }>

type Snapshot = {
  id: string
  capturado_em: string
  etiquetas: Etiqueta[]
  funil: Funil
  total_contatos: number
}

type Resp = {
  ok: boolean
  cached?: boolean
  age_seconds?: number
  duracao_ms?: number
  snapshot: Snapshot | null
  error?: string
}

const ETAPAS_ORDEM: Array<{ key: string; label: string; emoji: string; cor: string }> = [
  { key: 'lead', label: 'Leads', emoji: '📥', cor: '#60a5fa' },
  { key: 'contato', label: 'Contato', emoji: '💬', cor: '#a78bfa' },
  { key: 'qualificado', label: 'Qualificado', emoji: '✅', cor: '#fbbf24' },
  { key: 'agendamento', label: 'Agendado', emoji: '📅', cor: '#f59e0b' },
  { key: 'comparecimento', label: 'Compareceu', emoji: '🤝', cor: '#22d3ee' },
  { key: 'venda', label: 'Fechou', emoji: '💰', cor: '#22c55e' },
  { key: 'perdido', label: 'Perdido', emoji: '❌', cor: '#ef4444' },
]

function limpo(s: string): string {
  return (s || '').replace(/[\u200E\u200F]/g, '').trim()
}

export default function WascriptLive() {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const carregar = async (force = false) => {
    const r = await fetch(`/api/sdr/wascript${force ? '?force=true' : ''}`, { cache: 'no-store' })
    const j: Resp = await r.json()
    setData(j)
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    carregar()
    const i = setInterval(() => carregar(), 60_000) // auto-refresh 1min
    return () => clearInterval(i)
  }, [])

  const snap = data?.snapshot
  const funil = snap?.funil || {}
  const total = snap?.total_contatos || 0

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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            📲 WhatsApp — Etiquetas ao vivo
          </div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>
            {data?.ok === false && <span style={{ color: '#ef4444' }}>❌ {data.error}</span>}
            {snap && (
              <>
                último sync: {new Date(snap.capturado_em).toLocaleTimeString('pt-BR')}
                {data?.cached && <span> · cache {data.age_seconds}s</span>}
                {!data?.cached && data?.duracao_ms && <span> · {data.duracao_ms}ms</span>}
              </>
            )}
          </div>
        </div>
        <button
          data-touch-exempt
          onClick={() => { setRefreshing(true); carregar(true) }}
          disabled={refreshing}
          style={{
            minHeight: 36,
            background: '#1f2937',
            color: '#9ca3af',
            border: '1px solid #374151',
            borderRadius: 8,
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {refreshing ? '⏳ sincronizando...' : '🔄 Atualizar agora'}
        </button>
      </div>

      {/* Loading */}
      {loading && <div style={{ fontSize: 11, color: '#6b7280' }}>Carregando etiquetas do WhatsApp...</div>}

      {/* Sem dados */}
      {!loading && !snap && (
        <div style={{ fontSize: 11, color: '#ef4444', background: '#ef444410', padding: 10, borderRadius: 8 }}>
          Não foi possível conectar ao WhatsApp via Wascript. Verifique se o Waseller está aberto no
          navegador do Trindade e se o token está correto.
        </div>
      )}

      {/* Funil agregado */}
      {snap && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, marginBottom: 12 }}>
            {ETAPAS_ORDEM.map(et => {
              const info = funil[et.key] || { count: 0, nomes: [] }
              return (
                <div
                  key={et.key}
                  style={{
                    background: '#0a0f1a',
                    border: `1px solid ${et.cor}30`,
                    borderRadius: 10,
                    padding: '10px 8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 18 }}>{et.emoji}</div>
                  <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, marginTop: 2 }}>
                    {et.label}
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: et.cor,
                      fontFamily: 'monospace',
                      marginTop: 2,
                    }}
                  >
                    {info.count}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumo */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 14px',
              background: '#0a0f1a',
              border: '1px solid #1f2937',
              borderRadius: 8,
              fontSize: 11,
              color: '#9ca3af',
            }}
          >
            <span>
              📊 Total contatos etiquetados: <strong style={{ color: '#fff' }}>{total}</strong> ·{' '}
              {snap.etiquetas.length} etiquetas
            </span>
            <button
              data-touch-exempt
              onClick={() => setExpanded(!expanded)}
              style={{
                minHeight: 32,
                background: 'transparent',
                color: '#f59e0b',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {expanded ? '▲ ocultar' : '▼ ver etiquetas raw'}
            </button>
          </div>

          {/* Lista crua de etiquetas */}
          {expanded && (
            <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {snap.etiquetas.map(e => (
                <span
                  key={e.id}
                  style={{
                    background: `${e.hexColor}20`,
                    border: `1px solid ${e.hexColor}60`,
                    color: e.hexColor,
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: 10,
                    fontWeight: 600,
                  }}
                >
                  {limpo(e.name)} · {e.count}
                </span>
              ))}
            </div>
          )}

          {/* Dica de setup se total = 0 */}
          {total === 0 && (
            <div
              style={{
                marginTop: 10,
                padding: '10px 14px',
                background: '#fbbf2410',
                border: '1px solid #fbbf2440',
                borderRadius: 8,
                fontSize: 11,
                color: '#fbbf24',
              }}
            >
              ⚠️ <strong>Nenhum contato etiquetado ainda.</strong> Abra o WhatsApp Web + Waseller
              e comece a marcar etiquetas nos contatos. As etiquetas padrão do WhatsApp Business já
              são reconhecidas automaticamente (Lead, Novo cliente, Pago, etc). Pro funil SDR funcionar,
              crie também etiquetas: <strong>&quot;Agendado&quot;, &quot;Compareceu&quot;, &quot;Perdido&quot;</strong>.
            </div>
          )}
        </>
      )}
    </div>
  )
}
