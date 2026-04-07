'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supabase } from '../../lib/supabase'
import {
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Clock,
  BarChart3,
  RefreshCw,
  Users,
} from 'lucide-react'

interface KPIs {
  vendas_mes: number
  meta_vendas: number
  gap_meta: number
  ticket_medio: number
  ciclo_medio: number
  conversao_geral: number
}

interface FunilItem {
  etapa: string
  count: number
  valor: number
}

interface VendedorPerf {
  vendedor: string
  prospectos: number
  propostas: number
  fechados: number
  conversao: number
  ticket_medio: number
}

interface PipelineDeal {
  id: string
  nome: string
  etapa: string
  valor: number
  vendedor: string
  created_at: string
  procedimento: string
}

interface ComercialData {
  kpis: KPIs
  funil: FunilItem[]
  performance_vendedores: VendedorPerf[]
  pipeline: PipelineDeal[]
}

const etapaLabels: Record<string, string> = {
  prospeccao: 'Prospecção',
  qualificacao: 'Qualificação',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
  perdido: 'Perdido',
}

const etapaColors: Record<string, string> = {
  prospeccao: 'bg-blue-500',
  qualificacao: 'bg-purple-500',
  proposta: 'bg-amber-500',
  negociacao: 'bg-orange-500',
  fechado: 'bg-green-500',
  perdido: 'bg-red-500',
}

const etapaBadgeVariants: Record<string, string> = {
  prospeccao: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  qualificacao: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  proposta: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  negociacao: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  fechado: 'bg-green-500/20 text-green-400 border-green-500/30',
  perdido: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const funilBarColors = [
  'from-blue-500 to-blue-400',
  'from-purple-500 to-purple-400',
  'from-amber-500 to-amber-400',
  'from-orange-500 to-orange-400',
  'from-green-500 to-green-400',
  'from-red-500 to-red-400',
]

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function ComercialPage() {
  const [data, setData] = useState<ComercialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hq/comercial')
      const json = await res.json()
      setData(json)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Erro ao buscar dados comerciais:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('comercial-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comercial_excalibur' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const maxFunilCount = data
    ? Math.max(...data.funil.map((f) => f.count), 1)
    : 1

  // Group pipeline by etapa
  const pipelineGrouped: Record<string, PipelineDeal[]> = {}
  if (data) {
    data.pipeline.forEach((deal) => {
      if (!pipelineGrouped[deal.etapa]) pipelineGrouped[deal.etapa] = []
      pipelineGrouped[deal.etapa].push(deal)
    })
  }

  const pipelineEtapas = ['prospeccao', 'qualificacao', 'proposta', 'negociacao']

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-amber-500" />
              Comercial
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Atualizado em {lastUpdate.toLocaleTimeString('pt-BR')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-amber-400"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {loading && !data ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-amber-500 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* BLOCO 1: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Vendas do Mes */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Vendas do Mês</span>
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {data.kpis.vendas_mes}
                    <span className="text-gray-500 text-lg font-normal">
                      /{data.kpis.meta_vendas}
                    </span>
                  </div>
                  <Progress
                    value={Math.min((data.kpis.vendas_mes / data.kpis.meta_vendas) * 100, 100)}
                    className="mt-2 h-2 bg-gray-800"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {Math.round((data.kpis.vendas_mes / data.kpis.meta_vendas) * 100)}% da meta
                  </p>
                </CardContent>
              </Card>

              {/* Gap Meta */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Gap p/ Meta</span>
                    <Target className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className={`text-3xl font-bold ${data.kpis.gap_meta <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {data.kpis.gap_meta <= 0 ? 'Batida!' : data.kpis.gap_meta}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.kpis.gap_meta > 0
                      ? `Faltam ${data.kpis.gap_meta} vendas`
                      : 'Meta atingida'}
                  </p>
                </CardContent>
              </Card>

              {/* Ticket Medio */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Ticket Médio</span>
                    <DollarSign className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {formatCurrency(data.kpis.ticket_medio)}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Por venda fechada</p>
                </CardContent>
              </Card>

              {/* Ciclo Medio */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Ciclo Médio</span>
                    <Clock className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {data.kpis.ciclo_medio}
                    <span className="text-gray-500 text-lg font-normal"> dias</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Lead até fechamento</p>
                </CardContent>
              </Card>

              {/* Conversao Geral */}
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-sm">Conversão Geral</span>
                    {data.kpis.conversao_geral >= 20 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {data.kpis.conversao_geral}%
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Deals ativos para fechados</p>
                </CardContent>
              </Card>
            </div>

            {/* BLOCO 2: Funil Visual */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Funil de Vendas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-4 h-64">
                  {data.funil.map((item, idx) => {
                    const heightPct = Math.max((item.count / maxFunilCount) * 100, 8)
                    const nextItem = data.funil[idx + 1]
                    const convRate =
                      item.count > 0 && nextItem
                        ? Math.round((nextItem.count / item.count) * 100)
                        : null

                    return (
                      <div key={item.etapa} className="flex-1 flex flex-col items-center gap-2">
                        {/* Count label */}
                        <span className="text-white font-bold text-lg">{item.count}</span>
                        <span className="text-gray-500 text-xs">
                          {formatCurrency(item.valor)}
                        </span>

                        {/* Bar */}
                        <div className="w-full flex justify-center" style={{ height: '160px' }}>
                          <div
                            className={`w-12 rounded-t-lg bg-gradient-to-t ${funilBarColors[idx]} transition-all duration-500`}
                            style={{ height: `${heightPct}%`, marginTop: 'auto' }}
                          />
                        </div>

                        {/* Label */}
                        <span className="text-gray-400 text-xs text-center font-medium">
                          {etapaLabels[item.etapa] || item.etapa}
                        </span>

                        {/* Conversion rate */}
                        {convRate !== null && idx < data.funil.length - 1 && (
                          <span className="text-amber-400 text-xs font-semibold">
                            {convRate}%
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* BLOCO 3: Performance por Vendedor */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-500" />
                  Performance por Vendedor
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.performance_vendedores.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-gray-800 hover:bg-transparent">
                        <TableHead className="text-gray-400">Vendedor</TableHead>
                        <TableHead className="text-gray-400 text-center">Prospectos</TableHead>
                        <TableHead className="text-gray-400 text-center">Propostas</TableHead>
                        <TableHead className="text-gray-400 text-center">Fechados</TableHead>
                        <TableHead className="text-gray-400 text-center">Conversão</TableHead>
                        <TableHead className="text-gray-400 text-right">Ticket Médio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.performance_vendedores.map((v) => (
                        <TableRow key={v.vendedor} className="border-gray-800 hover:bg-gray-800/50">
                          <TableCell className="text-white font-medium">{v.vendedor}</TableCell>
                          <TableCell className="text-gray-300 text-center">{v.prospectos}</TableCell>
                          <TableCell className="text-gray-300 text-center">{v.propostas}</TableCell>
                          <TableCell className="text-center">
                            <span className="text-green-400 font-bold">{v.fechados}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              className={`${
                                v.conversao >= 30
                                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                  : v.conversao >= 15
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30'
                              }`}
                            >
                              {v.conversao}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300 text-right">
                            {formatCurrency(v.ticket_medio)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    Nenhum vendedor encontrado no período
                  </p>
                )}
              </CardContent>
            </Card>

            <Separator className="bg-gray-800" />

            {/* BLOCO 4: Pipeline Ativo (Kanban simplificado) */}
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white text-lg">Pipeline Ativo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {pipelineEtapas.map((etapa) => {
                    const deals = pipelineGrouped[etapa] || []
                    return (
                      <div key={etapa} className="space-y-3">
                        {/* Column header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${etapaColors[etapa]}`} />
                            <span className="text-white font-medium text-sm">
                              {etapaLabels[etapa]}
                            </span>
                          </div>
                          <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs">
                            {deals.length}
                          </Badge>
                        </div>

                        {/* Deal cards */}
                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                          {deals.length > 0 ? (
                            deals.map((deal) => (
                              <div
                                key={deal.id}
                                className="bg-gray-800 border border-gray-700 rounded-xl p-3 hover:border-amber-500/50 transition-colors cursor-pointer"
                              >
                                <p className="text-white text-sm font-medium truncate">
                                  {deal.nome}
                                </p>
                                {deal.procedimento && (
                                  <p className="text-gray-500 text-xs mt-1 truncate">
                                    {deal.procedimento}
                                  </p>
                                )}
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-amber-400 text-sm font-semibold">
                                    {formatCurrency(deal.valor)}
                                  </span>
                                  <span className="text-gray-500 text-xs">{deal.vendedor}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-600 text-xs text-center py-6 border border-dashed border-gray-800 rounded-xl">
                              Nenhum deal
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-12">
            Erro ao carregar dados comerciais
          </div>
        )}
      </main>
    </div>
  )
}
