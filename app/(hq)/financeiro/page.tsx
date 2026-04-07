'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@supabase/supabase-js'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Target,
  ShieldAlert,
  Percent,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface FinanceiroData {
  kpis: {
    mrr: number
    mrr_variacao: number
    receita_mes: number
    churn_rate: number
    mrr_risco: number
    inadimplencia: number
    margem: number
    previsao_30d: number
    total_clientes: number
  }
  historico_mrr: Array<{
    mes: string
    mrr: number
    receita: number
    clientes: number
  }>
  breakdown: Array<{
    plano: string
    clientes: number
    mrr: number
    percentual: number
    cor: string
  }>
  churn_analysis: {
    total_churned: number
    mrr_perdido: number
    risco_proximo_30d: number
    mrr_risco: number
    clientes_churned: Array<{
      nome: string
      plano: string
      mrr_perdido: number
      data_churn: string
    }>
  }
  projecao: {
    conservador: {
      mes_1: number
      mes_2: number
      mes_3: number
      crescimento_mensal: number
    }
    otimista: {
      mes_1: number
      mes_2: number
      mes_3: number
      crescimento_mensal: number
    }
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export default function FinanceiroPage() {
  const [data, setData] = useState<FinanceiroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hq/financeiro')
      if (!res.ok) throw new Error('Erro ao carregar dados')
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Realtime subscription on financeiro_mensal
    const channel = supabase
      .channel('financeiro_mensal_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'financeiro_mensal' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
            <p className="text-gray-400">Carregando dados financeiros...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-gray-400">{error || 'Erro ao carregar dados'}</p>
            <Button onClick={fetchData} variant="outline" className="border-amber-500/50 text-amber-500 hover:bg-amber-500/10">
              Tentar novamente
            </Button>
          </div>
        </main>
      </div>
    )
  }

  const { kpis, historico_mrr, breakdown, churn_analysis, projecao } = data

  const kpiCards = [
    {
      title: 'MRR',
      value: formatCurrency(kpis.mrr),
      change: kpis.mrr_variacao,
      icon: DollarSign,
      subtitle: `${kpis.total_clientes} clientes ativos`,
    },
    {
      title: 'Receita do Mês',
      value: formatCurrency(kpis.receita_mes),
      change: null,
      icon: TrendingUp,
      subtitle: 'Receita total mensal',
    },
    {
      title: 'Churn Rate',
      value: `${kpis.churn_rate}%`,
      change: null,
      icon: Users,
      subtitle: 'Taxa de cancelamento',
      alert: kpis.churn_rate > 5,
    },
    {
      title: 'Inadimplência',
      value: `${kpis.inadimplencia}%`,
      change: null,
      icon: ShieldAlert,
      subtitle: 'Pagamentos atrasados',
      alert: kpis.inadimplencia > 10,
    },
    {
      title: 'Margem',
      value: `${kpis.margem}%`,
      change: null,
      icon: Percent,
      subtitle: 'Margem operacional',
    },
    {
      title: 'Previsão 30d',
      value: formatCurrency(kpis.previsao_30d),
      change: null,
      icon: Target,
      subtitle: 'MRR projetado',
    },
  ]

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <DollarSign className="h-7 w-7 text-amber-500" />
              Financeiro HQ
            </h1>
            <p className="text-gray-400 mt-1">Visão financeira consolidada de todas as clínicas</p>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            size="sm"
            className="border-gray-700 text-gray-400 hover:text-white hover:border-amber-500/50"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* BLOCO 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {kpiCards.map((kpi) => (
            <Card key={kpi.title} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 uppercase tracking-wider">{kpi.title}</span>
                  <kpi.icon className={`h-4 w-4 ${kpi.alert ? 'text-red-500' : 'text-amber-500'}`} />
                </div>
                <div className="flex items-end gap-2">
                  <span className={`text-xl font-bold ${kpi.alert ? 'text-red-400' : 'text-white'}`}>
                    {kpi.value}
                  </span>
                  {kpi.change !== null && kpi.change !== undefined && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        kpi.change >= 0
                          ? 'border-green-500/30 text-green-400 bg-green-500/10'
                          : 'border-red-500/30 text-red-400 bg-red-500/10'
                      }`}
                    >
                      {kpi.change >= 0 ? (
                        <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 mr-0.5" />
                      )}
                      {Math.abs(kpi.change)}%
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{kpi.subtitle}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* BLOCO 2: MRR Chart + BLOCO 3: Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* MRR Chart */}
          <Card className="bg-gray-900 border-gray-800 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                Evolução MRR — Últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historico_mrr} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis
                      dataKey="mes"
                      stroke="#6b7280"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                    />
                    <YAxis
                      stroke="#6b7280"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value) => [formatCurrency(Number(value)), 'MRR']}
                      labelStyle={{ color: '#9ca3af' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mrr"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fill="url(#mrrGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Breakdown por plano */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg">Receita por Plano</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {breakdown.map((plan) => (
                <div key={plan.plano} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: plan.cor }}
                      />
                      <span className="text-sm text-white font-medium">{plan.plano}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-white font-semibold">
                        {formatCurrency(plan.mrr)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({plan.clientes} clínicas)
                      </span>
                    </div>
                  </div>
                  <Progress
                    value={plan.percentual}
                    className="h-2 bg-gray-800"
                  />
                  <p className="text-xs text-gray-500">{plan.percentual}% do MRR total</p>
                </div>
              ))}

              <Separator className="bg-gray-800" />

              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-gray-400 font-medium">Total MRR</span>
                <span className="text-sm text-amber-500 font-bold">
                  {formatCurrency(breakdown.reduce((s, p) => s + p.mrr, 0))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* BLOCO 4: Churn Analysis + BLOCO 5: Projecao */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Churn Analysis */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Análise de Churn
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Churn summary */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{churn_analysis.total_churned}</p>
                  <p className="text-xs text-gray-500">Clientes perdidos</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {formatCurrency(churn_analysis.mrr_perdido)}
                  </p>
                  <p className="text-xs text-gray-500">MRR perdido</p>
                </div>
              </div>

              {/* Risk alert */}
              {churn_analysis.risco_proximo_30d > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                    <span className="text-sm text-amber-400 font-medium">
                      {churn_analysis.risco_proximo_30d} clientes em risco ({formatCurrency(churn_analysis.mrr_risco)} MRR)
                    </span>
                  </div>
                </div>
              )}

              <Separator className="bg-gray-800 mb-4" />

              {/* Churned clients list */}
              <div className="space-y-3">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Últimos cancelamentos</p>
                {churn_analysis.clientes_churned.map((client, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <p className="text-sm text-white">{client.nome}</p>
                      <p className="text-xs text-gray-500">
                        {client.plano} &middot; {client.data_churn ? new Date(client.data_churn).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-xs">
                      -{formatCurrency(client.mrr_perdido)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Projecao Financeira */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-amber-500" />
                Projeção Financeira
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* Conservador */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-sm text-gray-300 font-medium">Conservador</span>
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-xs">
                      +{projecao.conservador.crescimento_mensal}%/mês
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Mês 1', value: projecao.conservador.mes_1 },
                      { label: 'Mês 2', value: projecao.conservador.mes_2 },
                      { label: 'Mês 3', value: projecao.conservador.mes_3 },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Otimista */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm text-gray-300 font-medium">Otimista</span>
                    <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 text-xs">
                      +{projecao.otimista.crescimento_mensal}%/mês
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {[
                      { label: 'Mês 1', value: projecao.otimista.mes_1 },
                      { label: 'Mês 2', value: projecao.otimista.mes_2 },
                      { label: 'Mês 3', value: projecao.otimista.mes_3 },
                    ].map((item) => (
                      <div key={item.label} className="bg-gray-800/50 rounded-lg p-3">
                        <p className="text-xs text-gray-500">{item.label}</p>
                        <p className="text-lg font-bold text-green-400">{formatCurrency(item.value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-800 my-4" />

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-amber-400 font-medium">Meta de crescimento</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Para atingir o cenário otimista, foque em upsell de Starter para Pro e redução do churn
                      abaixo de 3%.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
