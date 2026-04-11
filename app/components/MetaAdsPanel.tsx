'use client'

import { useEffect, useState } from 'react'

type Status = {
  configurado: boolean
  aviso?: string
  precisa?: string[]
  conta?: string
  periodo?: { since: string; until: string }
  resumo_conta?: {
    investimento: number
    impressoes: number
    cliques: number
    ctr: number
    cpc: number
    alcance: number
    frequencia: number
    leads: number
  }
  campanhas?: Array<{ id: string; nome: string; status: string; objective?: string }>
  erro?: string
}

type SyncResult = {
  ok: boolean
  aviso?: string
  erro?: string
  campanhas?: { novas: number; atualizadas: number; total: number }
  totais?: { investimento: number; leads: number; cpl_medio: number }
}

const fmtR = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function MetaAdsPanel({ onSync }: { onSync?: () => void }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [msg, setMsg] = useState('')
  const [expand, setExpand] = useState(false)

  const carregar = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/trafego/meta-sync').then(r => r.json())
      setStatus(r)
    } catch (e) {
      setStatus({ configurado: false, erro: e instanceof Error ? e.message : String(e) })
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const sincronizar = async () => {
    setSincronizando(true)
    setMsg('')
    try {
      const r = await fetch('/api/trafego/meta-sync', { method: 'POST' }).then(r => r.json()) as SyncResult
      if (r.ok) {
        const c = r.campanhas
        const t = r.totais
        setMsg(`✅ ${c?.total || 0} campanhas sincronizadas (${c?.novas || 0} novas) · ${t?.leads || 0} leads · ${fmtR(t?.investimento || 0)} · CPL ${fmtR(t?.cpl_medio || 0)}`)
        await carregar()
        if (onSync) onSync()
      } else {
        setMsg('⚠️ ' + (r.aviso || r.erro || 'erro'))
      }
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setSincronizando(false)
    setTimeout(() => setMsg(''), 10000)
  }

  if (loading) return <div className="h-16 bg-gray-900 border border-gray-800 rounded-xl animate-pulse mb-4" />

  const naoConfig = status && !status.configurado
  const temErro = !!status?.erro

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 mb-4 ${naoConfig ? 'border-amber-800/40' : temErro ? 'border-red-800/40' : 'border-blue-800/40'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">📘</span>
          <span className={`text-sm font-bold uppercase tracking-wider ${naoConfig ? 'text-amber-400' : temErro ? 'text-red-400' : 'text-blue-400'}`}>
            Meta Ads — Gerenciador de Anúncios
          </span>
          {status?.configurado && !temErro && (
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true" />
          )}
        </div>
        <div className="flex gap-2">
          {!naoConfig && (
            <button
              onClick={sincronizar}
              disabled={sincronizando}
              className="text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded px-3 py-1.5 font-semibold disabled:opacity-50 min-h-[36px]"
              aria-label="Sincronizar Meta Ads"
            >
              {sincronizando ? '⏳ Puxando...' : '🔄 Sincronizar agora'}
            </button>
          )}
          <button
            onClick={() => setExpand(!expand)}
            className="text-xs text-gray-500 hover:text-white min-h-[36px] px-2"
            aria-label="Expandir detalhes"
          >
            {expand ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {naoConfig && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 mt-2">
          ⚠️ <strong>Integração Meta Ads não configurada.</strong> Para ativar, precisa:
          <ul className="mt-2 ml-4 list-disc space-y-1">
            <li><code className="bg-black/30 px-1 rounded">META_ADS_ACCESS_TOKEN</code> — long-lived token da conta Excalibur</li>
            <li><code className="bg-black/30 px-1 rounded">META_AD_ACCOUNT_ID</code> — ID da conta (formato <code>act_123456789</code>)</li>
          </ul>
          <div className="mt-2 text-gray-400">
            Sem isso, o Guilherme continua lançando os dados manualmente no formulário abaixo.
          </div>
        </div>
      )}

      {temErro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 mt-2">
          ❌ {status.erro}
        </div>
      )}

      {status?.configurado && !temErro && status.resumo_conta && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs mt-2">
            <Bloco label="Investimento" valor={fmtR(status.resumo_conta.investimento)} cor="text-amber-400" />
            <Bloco label="Leads" valor={String(status.resumo_conta.leads)} cor="text-green-400" />
            <Bloco label="CPL" valor={status.resumo_conta.leads > 0 ? fmtR(status.resumo_conta.investimento / status.resumo_conta.leads) : '—'} cor="text-blue-400" />
            <Bloco label="CTR" valor={status.resumo_conta.ctr.toFixed(2) + '%'} cor="text-purple-400" />
            <Bloco label="Cliques" valor={String(status.resumo_conta.cliques)} cor="text-white" />
          </div>
          <div className="text-[10px] text-gray-600 mt-2">
            Conta: <code>{status.conta}</code> · Período: {status.periodo?.since} → {status.periodo?.until}
          </div>
        </>
      )}

      {msg && <div className="mt-3 p-2 rounded bg-gray-800 text-xs text-gray-300">{msg}</div>}

      {expand && status?.campanhas && status.campanhas.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="text-[10px] uppercase text-gray-500 font-bold mb-2">Campanhas ({status.campanhas.length})</div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {status.campanhas.map(c => (
              <div key={c.id} className="flex items-center justify-between text-xs p-2 rounded bg-gray-800/40">
                <span className="text-gray-300 truncate">{c.nome}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${c.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Bloco({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <div className="bg-gray-800/40 rounded p-2">
      <div className="text-[9px] uppercase text-gray-500 font-semibold">{label}</div>
      <div className={`text-sm font-bold ${cor}`}>{valor}</div>
    </div>
  )
}
