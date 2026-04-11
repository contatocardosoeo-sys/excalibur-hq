'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import AdocaoEquipe from '../../components/AdocaoEquipe'
import { NumberTicker } from '@/components/ui/number-ticker'

type DashboardData = {
  receita?: { mes: number; meta_mes: number; pct_mes: number }
  crescimento?: { mrr: number; cac: number; novos_clientes: number }
  funil?: { leads: number; agendamentos: number; fechamentos: number }
  financeiro_ceo?: { caixa: number }
  alertas?: Array<{ tipo: string; titulo?: string }>
}

export default function CooPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/ceo/dashboard').then(r => r.json())
        setData(r)
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  const mrr = data?.crescimento?.mrr || 0
  const caixa = data?.financeiro_ceo?.caixa || 0
  const fechamentos = data?.funil?.fechamentos || 0
  const leads = data?.funil?.leads || 0
  const clientes = data?.crescimento?.novos_clientes || 0
  const alertasCount = data?.alertas?.length || 0

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        {/* Painel adoção equipe (mesmo do CEO) */}
        <AdocaoEquipe />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 mx-4 md:mx-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold">🧠 COO Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">Visão operacional — monitoramento de equipe e métricas</p>
          </div>
          <button
            onClick={() => router.push('/escritorio')}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-xl px-4 py-2 text-sm font-bold min-h-[44px] transition whitespace-nowrap"
          >
            🏢 Ver equipe ao vivo →
          </button>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6 mx-4 md:mx-6">
          {loading ? (
            [1, 2, 3, 4, 5].map(i => <div key={i} className="h-24 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)
          ) : (
            <>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">MRR Atual</p>
                <p className="text-green-400 text-xl md:text-2xl font-bold mt-1">
                  <NumberTicker value={mrr} prefix="R$ " className="text-green-400" />
                </p>
                <p className="text-[10px] text-gray-600 mt-1">Receita recorrente</p>
              </div>
              <div className={`bg-gray-900 border rounded-xl p-4 ${caixa < 10000 ? 'border-red-800/60' : 'border-gray-800'}`}>
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Caixa do mês</p>
                <p className={`text-xl md:text-2xl font-bold mt-1 ${caixa < 10000 ? 'text-red-400' : 'text-amber-400'}`}>
                  <NumberTicker value={caixa} prefix="R$ " className={caixa < 10000 ? 'text-red-400' : 'text-amber-400'} />
                </p>
                <p className="text-[10px] text-gray-600 mt-1">{caixa < 10000 ? '⚠ Crítico' : 'Saudável'}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Clínicas ativas</p>
                <p className="text-blue-400 text-xl md:text-2xl font-bold mt-1">
                  <NumberTicker value={clientes} className="text-blue-400" />
                </p>
                <p className="text-[10px] text-gray-600 mt-1">Carteira total</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Fechamentos</p>
                <p className="text-amber-400 text-xl md:text-2xl font-bold mt-1">
                  <NumberTicker value={fechamentos} className="text-amber-400" />
                </p>
                <p className="text-[10px] text-gray-600 mt-1">Este mês</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Leads gerados</p>
                <p className="text-purple-400 text-xl md:text-2xl font-bold mt-1">
                  <NumberTicker value={leads} className="text-purple-400" />
                </p>
                <p className="text-[10px] text-gray-600 mt-1">Funil do mês</p>
              </div>
            </>
          )}
        </div>

        {/* Alertas */}
        <div className="mx-4 md:mx-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wider">🚨 Alertas ativos</h2>
            <button
              onClick={() => router.push('/alertas')}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Ver todos →
            </button>
          </div>
          {alertasCount === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center text-gray-500 text-sm">
              Nenhum alerta ativo
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-300">
              {alertasCount} alerta{alertasCount > 1 ? 's' : ''} ativo{alertasCount > 1 ? 's' : ''} — clique em &quot;Ver todos&quot; pra detalhes
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="mx-4 md:mx-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => router.push('/cs')} className="bg-gray-900 border border-gray-800 hover:border-indigo-500/40 rounded-xl p-4 text-left transition group">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm font-bold text-white group-hover:text-indigo-400">Cockpit CS</div>
            <div className="text-xs text-gray-500 mt-1">Ver clínicas e jornada</div>
          </button>
          <button onClick={() => router.push('/comercial')} className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 text-left transition group">
            <div className="text-2xl mb-2">💼</div>
            <div className="text-sm font-bold text-white group-hover:text-amber-400">Pipeline Comercial</div>
            <div className="text-xs text-gray-500 mt-1">Fechamentos e propostas</div>
          </button>
          <button onClick={() => router.push('/operacao/financeiro')} className="bg-gray-900 border border-gray-800 hover:border-green-500/40 rounded-xl p-4 text-left transition group">
            <div className="text-2xl mb-2">💰</div>
            <div className="text-sm font-bold text-white group-hover:text-green-400">Financeiro</div>
            <div className="text-xs text-gray-500 mt-1">A receber e a pagar</div>
          </button>
        </div>
      </div>
    </div>
  )
}
