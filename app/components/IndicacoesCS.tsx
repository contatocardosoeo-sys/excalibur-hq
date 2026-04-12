'use client'

import { useEffect, useState } from 'react'

type Indicacao = {
  id: string
  cliente_nome: string
  indicado_nome: string | null
  status: string
  comissao_total: number
  created_at: string
}

type ClienteIdeal = {
  id: string
  nome: string
  score_total: number
  dias_uteis: number
  motivo: string
}

type Resumo = {
  solicitadas: number
  recebidas: number
  convertidas: number
  comissao_total: number
  meta_solicitacoes: number
  meta_conversoes: number
  bateu_meta: boolean
  bonus_meta: number
}

type Resp = {
  indicacoes: Indicacao[]
  resumo: Resumo
  momento_ideal: ClienteIdeal[]
  total_clientes_ideal: number
}

const STATUS_EMOJI: Record<string, string> = {
  solicitada: '📤', recebida: '📥', contatada: '📞', agendada: '📅',
  fechou: '💰', reteve_3m: '🏆', perdida: '❌',
}

const fmtBRL = (v: number) => `R$${v.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

export default function IndicacoesCS({ csEmail, csNome }: { csEmail: string; csNome: string }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteIdeal | null>(null)
  const [indicadoNome, setIndicadoNome] = useState('')
  const [indicadoTel, setIndicadoTel] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch(`/api/indicacoes?email=${encodeURIComponent(csEmail)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [csEmail])

  const pedirIndicacao = async () => {
    if (!clienteSelecionado) return
    setEnviando(true)
    setMsg('')
    const r = await fetch('/api/indicacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cs_email: csEmail,
        cs_nome: csNome,
        cliente_id: clienteSelecionado.id,
        cliente_nome: clienteSelecionado.nome,
        indicado_nome: indicadoNome || null,
        indicado_telefone: indicadoTel || null,
      }),
    })
    const j = await r.json()
    setEnviando(false)
    if (j.success) {
      setMsg(`✅ Indicação registrada! +R$50 comissão`)
      setIndicadoNome('')
      setIndicadoTel('')
      setTimeout(() => { setModalAberto(false); setMsg('') }, 2000)
      // Refresh
      fetch(`/api/indicacoes?email=${encodeURIComponent(csEmail)}`, { cache: 'no-store' }).then(r => r.json()).then(setData)
    } else {
      setMsg('❌ ' + (j.error || 'Erro'))
    }
  }

  if (loading) return null

  const r = data?.resumo
  const ideais = data?.momento_ideal || []

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Header com KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 }}>
        <div style={{ background: '#111827', border: '1px solid #22c55e30', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: '#22c55e', textTransform: 'uppercase', fontWeight: 700 }}>💰 Comissão indicações</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e', fontFamily: 'monospace', marginTop: 4 }}>{fmtBRL(r?.comissao_total || 0)}</div>
          {r?.bateu_meta && <div style={{ fontSize: 9, color: '#f59e0b', marginTop: 2 }}>🏆 +{fmtBRL(r.bonus_meta)} bônus meta!</div>}
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Solicitadas</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'monospace', marginTop: 4 }}>
            {r?.solicitadas || 0}<span style={{ fontSize: 11, color: '#6b7280' }}>/{r?.meta_solicitacoes || 5}</span>
          </div>
          <div style={{ height: 3, background: '#1f2937', borderRadius: 2, marginTop: 4 }}>
            <div style={{ height: 3, width: `${Math.min(100, ((r?.solicitadas || 0) / (r?.meta_solicitacoes || 5)) * 100)}%`, background: '#f59e0b', borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700 }}>Convertidas</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'monospace', marginTop: 4 }}>
            {r?.convertidas || 0}<span style={{ fontSize: 11, color: '#6b7280' }}>/{r?.meta_conversoes || 2}</span>
          </div>
        </div>
      </div>

      {/* Clientes em momento ideal */}
      {ideais.length > 0 && (
        <div style={{ background: '#f59e0b08', border: '1px solid #f59e0b40', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>
            🤝 {ideais.length} cliente{ideais.length > 1 ? 's' : ''} no momento ideal pra pedir indicação
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ideais.slice(0, 5).map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{c.nome}</div>
                  <div style={{ fontSize: 9, color: '#6b7280' }}>{c.motivo}</div>
                </div>
                <button
                  onClick={() => { setClienteSelecionado(c); setModalAberto(true) }}
                  style={{
                    minHeight: 36, background: '#f59e0b', color: '#030712', border: 'none',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
                  }}
                >
                  Pedir indicação
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico de indicações */}
      {(data?.indicacoes?.length || 0) > 0 && (
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>Indicações do mês</span>
            <span style={{ fontSize: 10, color: '#6b7280' }}>{data?.indicacoes?.length} registros</span>
          </div>
          {data?.indicacoes?.slice(0, 8).map(i => (
            <div key={i.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #1f293740', fontSize: 11 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{STATUS_EMOJI[i.status] || '📋'}</span>
                <span style={{ color: '#d1d5db' }}>{i.cliente_nome}</span>
                {i.indicado_nome && <span style={{ color: '#6b7280' }}>→ {i.indicado_nome}</span>}
              </div>
              <span style={{ color: '#22c55e', fontWeight: 700, fontFamily: 'monospace' }}>{fmtBRL(Number(i.comissao_total))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Modal pedir indicação */}
      {modalAberto && clienteSelecionado && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={e => e.target === e.currentTarget && setModalAberto(false)}
        >
          <div style={{ background: '#111827', border: '1px solid #f59e0b40', borderRadius: 16, padding: 24, maxWidth: 440, width: '90vw' }}>
            <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🤝 Pedir indicação</h2>
            <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>
              Cliente: <strong style={{ color: '#f59e0b' }}>{clienteSelecionado.nome}</strong> · Score {clienteSelecionado.score_total} · D{clienteSelecionado.dias_uteis}
            </p>

            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
              💡 <strong>Script sugerido:</strong> &ldquo;[Nome], fico feliz que o sistema está trazendo resultado pra vocês! Você conhece algum colega dentista que também quer crescer? Se quiser indicar, a gente cuida de tudo.&rdquo;
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Nome do indicado (opcional agora)"
                value={indicadoNome}
                onChange={e => setIndicadoNome(e.target.value)}
                style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, minHeight: 44 }}
              />
              <input
                type="tel"
                placeholder="Telefone do indicado (opcional)"
                value={indicadoTel}
                onChange={e => setIndicadoTel(e.target.value)}
                style={{ width: '100%', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, minHeight: 44, fontFamily: 'monospace' }}
              />
            </div>

            <button
              onClick={pedirIndicacao}
              disabled={enviando}
              style={{ width: '100%', minHeight: 48, background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', opacity: enviando ? 0.5 : 1 }}
            >
              {enviando ? '⏳ Registrando...' : '📤 Registrar indicação (+R$50)'}
            </button>

            {msg && <div style={{ marginTop: 8, fontSize: 12, color: msg.startsWith('✅') ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{msg}</div>}
          </div>
        </div>
      )}
    </div>
  )
}
