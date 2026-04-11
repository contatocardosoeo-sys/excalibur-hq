'use client'

import { useEffect, useState } from 'react'

type Saldo = {
  configurado: boolean
  fonte: string
  aviso?: string
  erro?: string
  saldo_disponivel: number
  saldo_a_receber: number
  total_pendente: number
  total_atrasado?: number
  total_recebido_mes: number
  atualizado_em?: string
}

const fmtR = (v: number) => 'R$ ' + (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function AsaasPanel() {
  const [saldo, setSaldo] = useState<Saldo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = async () => {
    try {
      const r = await fetch('/api/asaas/balance').then(r => r.json())
      setSaldo(r)
    } catch (e) {
      setSaldo({
        configurado: false,
        fonte: 'error',
        erro: e instanceof Error ? e.message : String(e),
        saldo_disponivel: 0, saldo_a_receber: 0, total_pendente: 0, total_recebido_mes: 0,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
    const iv = setInterval(carregar, 60000) // atualiza a cada 1 min
    return () => clearInterval(iv)
  }, [])

  const sincronizar = async () => {
    setSincronizando(true)
    setMsg('')
    try {
      const r = await fetch('/api/asaas/sync', { method: 'POST' }).then(r => r.json())
      if (r.ok) {
        setMsg(`✅ ${r.sincronizados} cobranças sincronizadas (${r.novos} novas, ${r.atualizados} atualizadas)`)
      } else {
        setMsg('⚠️ ' + (r.warning || 'erro'))
      }
      await carregar()
    } catch (e) {
      setMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setSincronizando(false)
    setTimeout(() => setMsg(''), 6000)
  }

  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-6 animate-pulse h-24" />
    )
  }

  const naoConfigurado = !!(saldo && !saldo.configurado)
  const temErro = saldo?.fonte === 'error'

  return (
    <div className={`bg-gray-900 border rounded-xl p-4 md:p-5 mb-6 ${naoConfigurado ? 'border-amber-800/40' : temErro ? 'border-red-800/40' : 'border-emerald-800/40'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏦</span>
          <span className={`text-sm font-bold uppercase tracking-wider ${naoConfigurado ? 'text-amber-400' : temErro ? 'text-red-400' : 'text-emerald-400'}`}>
            Asaas — Saldo ao vivo
          </span>
          {saldo?.configurado && !temErro && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          )}
        </div>
        <button
          onClick={sincronizar}
          disabled={sincronizando || naoConfigurado}
          className="text-xs text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[36px] px-2"
          aria-label="Sincronizar com Asaas"
        >
          {sincronizando ? '⏳ Sincronizando...' : '🔄 Sincronizar'}
        </button>
      </div>

      {naoConfigurado && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300 mb-3">
          ⚠️ <strong>ASAAS_API_KEY não configurada.</strong> Os valores abaixo são calculados localmente do banco. Adicione a API key em <code className="bg-black/30 px-1 py-0.5 rounded">.env.local</code> e no Vercel pra ver saldo em tempo real.
        </div>
      )}

      {temErro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300 mb-3">
          ❌ Erro ao buscar saldo: {saldo.erro}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Bloco label="Saldo disponível" valor={fmtR(saldo?.saldo_disponivel || 0)} cor="emerald" />
        <Bloco label="A receber confirmado" valor={fmtR(saldo?.saldo_a_receber || 0)} cor="white" />
        <Bloco label="Pendente de pagto" valor={fmtR(saldo?.total_pendente || 0)} cor="amber" />
        <Bloco label="Recebido no mês" valor={fmtR(saldo?.total_recebido_mes || 0)} cor="blue" />
      </div>

      {msg && (
        <div className="mt-3 text-xs text-gray-400">{msg}</div>
      )}

      {saldo?.atualizado_em && (
        <div className="mt-3 text-[10px] text-gray-600">
          Última atualização: {new Date(saldo.atualizado_em).toLocaleString('pt-BR')} · Fonte: {saldo.fonte}
        </div>
      )}
    </div>
  )
}

function Bloco({ label, valor, cor }: { label: string; valor: string; cor: 'emerald' | 'white' | 'amber' | 'blue' }) {
  const corMap = {
    emerald: 'text-emerald-400',
    white: 'text-white',
    amber: 'text-amber-400',
    blue: 'text-blue-400',
  }
  return (
    <div className="bg-gray-800/40 rounded-lg p-3">
      <div className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">{label}</div>
      <div className={`text-base md:text-lg font-bold mt-1 ${corMap[cor]}`}>{valor}</div>
    </div>
  )
}
