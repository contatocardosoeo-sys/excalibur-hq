'use client'

import { useState } from 'react'

type MetricaEditavel = {
  label: string
  categoria: string
}

type Props = {
  autorEmail: string
  autorNome: string
  autorRole: string
  categoriaFiltro?: string
}

const METRICAS: Record<string, MetricaEditavel> = {
  ticket_medio: { label: 'Ticket médio (R$)', categoria: 'funil' },
  cpl_medio: { label: 'CPL médio (R$)', categoria: 'trafego' },
  taxa_fechamento: { label: 'Taxa de fechamento (%)', categoria: 'comercial' },
  taxa_agendamento: { label: 'Taxa de agendamento (%)', categoria: 'sdr' },
  taxa_comparecimento: { label: 'Taxa de comparecimento (%)', categoria: 'comercial' },
  taxa_qualificacao: { label: 'Taxa de qualificação (%)', categoria: 'sdr' },
  sdr_agendamentos_dia: { label: 'Meta agendamentos/dia (SDR)', categoria: 'sdr' },
  receita_alvo: { label: 'Receita alvo (R$)', categoria: 'funil' },
  receita_super: { label: 'Supermeta receita (R$)', categoria: 'funil' },
  nivel_meta: { label: 'Nível de meta ativo', categoria: 'funil' },
  cpl_max: { label: 'CPL máximo (R$)', categoria: 'trafego' },
  closer_pct_venda: { label: 'Comissão closer (%)', categoria: 'comercial' },
  sdr_valor_agendamento: { label: 'Comissão SDR por agendamento (R$)', categoria: 'sdr' },
}

export default function ProporAjuste({ autorEmail, autorNome, autorRole, categoriaFiltro }: Props) {
  const [open, setOpen] = useState(false)
  const [campo, setCampo] = useState('')
  const [valorProposto, setValorProposto] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const metricasFiltradas = Object.entries(METRICAS).filter(([, v]) =>
    categoriaFiltro ? v.categoria === categoriaFiltro || v.categoria === 'funil' : true,
  )

  const enviar = async () => {
    if (!campo || !valorProposto.trim() || !justificativa.trim()) {
      setMsg({ ok: false, texto: 'Preencha todos os campos' })
      return
    }
    setEnviando(true)
    setMsg(null)
    try {
      const r = await fetch('/api/propostas-ajuste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campo,
          valor_proposto: valorProposto,
          justificativa,
          autor_email: autorEmail,
          autor_nome: autorNome,
          autor_role: autorRole,
        }),
      })
      const j = await r.json()
      if (j.success) {
        setMsg({ ok: true, texto: 'Proposta enviada para o CEO' })
        setCampo('')
        setValorProposto('')
        setJustificativa('')
        setTimeout(() => setOpen(false), 2000)
      } else {
        setMsg({ ok: false, texto: j.error || 'Erro ao enviar' })
      }
    } catch (e) {
      setMsg({ ok: false, texto: e instanceof Error ? e.message : 'Erro' })
    }
    setEnviando(false)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl px-4 py-2 text-sm font-bold min-h-[44px] transition whitespace-nowrap"
      >
        📝 Propor ajuste de meta
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
          }}
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid #f59e0b40',
              borderRadius: 16,
              padding: 24,
              maxWidth: 480,
              width: '90vw',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>📝 Propor ajuste de meta</h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 18 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>
              Sua proposta será enviada ao CEO para aprovação. Nada é alterado no sistema até que ele aprove.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
                  Qual métrica quer ajustar?
                </span>
                <select
                  value={campo}
                  onChange={e => setCampo(e.target.value)}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    background: '#0a0f1a',
                    border: '1px solid #1f2937',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: 13,
                    minHeight: 44,
                  }}
                >
                  <option value="">Selecione...</option>
                  {metricasFiltradas.map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
                  Valor proposto
                </span>
                <input
                  type="text"
                  value={valorProposto}
                  onChange={e => setValorProposto(e.target.value)}
                  placeholder="Ex: 15, 0.30, 95000"
                  style={{
                    width: '100%',
                    marginTop: 4,
                    background: '#0a0f1a',
                    border: '1px solid #1f2937',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: 14,
                    fontFamily: 'monospace',
                    minHeight: 44,
                  }}
                />
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
                  Justificativa (por que mudar?)
                </span>
                <textarea
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  placeholder="Ex: CPL caiu nos últimos 15 dias, precisamos atualizar..."
                  rows={3}
                  style={{
                    width: '100%',
                    marginTop: 4,
                    background: '#0a0f1a',
                    border: '1px solid #1f2937',
                    borderRadius: 8,
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: 13,
                    resize: 'vertical',
                    minHeight: 70,
                    fontFamily: 'inherit',
                  }}
                />
              </label>

              <button
                onClick={enviar}
                disabled={enviando}
                style={{
                  minHeight: 44,
                  background: '#f59e0b',
                  color: '#030712',
                  border: 'none',
                  borderRadius: 10,
                  padding: '10px 14px',
                  cursor: enviando ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 700,
                  opacity: enviando ? 0.5 : 1,
                }}
              >
                {enviando ? '⏳ Enviando...' : '📤 Enviar proposta ao CEO'}
              </button>

              {msg && (
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: 12,
                    background: msg.ok ? '#22c55e15' : '#ef444415',
                    border: `1px solid ${msg.ok ? '#22c55e40' : '#ef444440'}`,
                    color: msg.ok ? '#22c55e' : '#ef4444',
                    fontWeight: 600,
                  }}
                >
                  {msg.texto}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
