'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { supabase } from '../../lib/supabase'
import {
  Users,
  Rocket,
  Target,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Clock,
  BarChart3,
  RefreshCw,
  ArrowRight,
  Zap,
  Megaphone,
  Handshake,
  HeadphonesIcon,
  PhoneCall,
  CheckCircle2,
  XCircle,
  Activity,
  Eye
} from 'lucide-react'

interface KPIs {
  total_clientes: number
  em_onboarding: number
  em_adocao: number
  em_escala: number
  sla_estourados: number
  em_risco: number
}

interface PipelineItem {
  fase: string
  count: number
  avg_dias_na_etapa: number
  travados: number
}

interface Gargalo {
  tipo: string
  descricao: string
  severidade: 'critica' | 'alta' | 'media'
  valor: number
  contexto: string
}

interface TimePerformance {
  time: string
  leads_gerados: number
  meta_leads: number
  agendamentos: number
  meta_agendamentos: number
  vendas: number
  meta_vendas: number
  faturamento: number
  meta_faturamento: number
  taxa_conversao: number
  atingimento: number
}

interface Alerta {
  id: string
  tipo: string
  titulo: string
  descricao: string
  prioridade: string
  status: string
  cliente_id: string
  created_at: string
}

interface DashboardData {
  kpis: KPIs
  pipeline: PipelineItem[]
  gargalos: Gargalo[]
  performance_times: TimePerformance[]
  alertas: Alerta[]
  updated_at: string
}

const defaultData: DashboardData = {
  kpis: {
    total_clientes: 0,
    em_onboarding: 0,
    em_adocao: 0,
    em_escala: 0,
    sla_estourados: 0,
    em_risco: 0
  },
  pipeline: [],
  gargalos: [],
  performance_times: [],
  alertas: [],
  updated_at: ''
}

export default function COODashboard() {
  const [data, setData] = useState<DashboardData>(defaultData)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string>('')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/hq/coo')
      if (!res.ok) throw new Error('Falha ao carregar dados')
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date().toLocaleTimeString('pt-BR'))
    } catch (err) {
      console.error('[COO Dashboard] Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Realtime subscription - clientes_hq
    const clientesChannel = supabase
      .channel('coo-clientes-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clientes_hq' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    // Realtime subscription - alertas_sistema
    const alertasChannel = supabase
      .channel('coo-alertas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alertas_sistema' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000)

    return () => {
      supabase.removeChannel(clientesChannel)
      supabase.removeChannel(alertasChannel)
      clearInterval(interval)
    }
  }, [fetchData])

  const { kpis, pipeline, gargalos, performance_times, alertas } = data

  const kpiCards = [
    {
      label: 'Clientes Ativos',
      value: kpis.total_clientes,
      icon: Users,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30'
    },
    {
      label: 'Onboarding',
      value: kpis.em_onboarding,
      icon: Rocket,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30'
    },
    {
      label: 'Adocao',
      value: kpis.em_adocao,
      icon: Target,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30'
    },
    {
      label: 'Escala',
      value: kpis.em_escala,
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30'
    },
    {
      label: 'SLA Estourados',
      value: kpis.sla_estourados,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    },
    {
      label: 'Em Risco',
      value: kpis.em_risco,
      icon: ShieldAlert,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30'
    }
  ]

  const faseConfig: Record<string, { color: string; bgColor: string; borderColor: string; icon: React.ElementType; label: string; sla: number }> = {
    onboarding: {
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      icon: Rocket,
      label: 'Onboarding',
      sla: 14
    },
    adocao: {
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      icon: Target,
      label: 'Adocao',
      sla: 30
    },
    escala: {
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/30',
      icon: TrendingUp,
      label: 'Escala',
      sla: 60
    }
  }

  const timeConfig: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
    trafego: { icon: Megaphone, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    comercial: { icon: Handshake, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    cs: { icon: HeadphonesIcon, color: 'text-green-400', bgColor: 'bg-green-500/10' },
    sdr: { icon: PhoneCall, color: 'text-purple-400', bgColor: 'bg-purple-500/10' }
  }

  const severidadeColors: Record<string, string> = {
    critica: 'bg-red-500/20 text-red-400 border-red-500/40',
    alta: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    media: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40'
  }

  const prioridadeColors: Record<string, string> = {
    critica: 'bg-red-500/20 text-red-400 border-red-500/40',
    alta: 'bg-orange-500/20 text-orange-400 border-orange-500/40'
  }

  return (
    <React.Fragment>
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800 px-8 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <Eye className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">
                      Painel COO
                    </h1>
                    <p className="text-sm text-gray-400">
                      Visao operacional completa - Jornada do cliente, gargalos e performance
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {lastRefresh && (
                  <span className="text-xs text-gray-500">
                    Atualizado as {lastRefresh}
                  </span>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchData}
                  disabled={loading}
                  className="border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-green-400">Realtime</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-8 py-6 space-y-8">
            {/* BLOCO 1: KPI Cards */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Indicadores Gerais</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {kpiCards.map((kpi) => {
                  const Icon = kpi.icon
                  return (
                    <Card
                      key={kpi.label}
                      className={`bg-gray-900 border ${kpi.borderColor} hover:border-opacity-60 transition-all duration-200`}
                    >
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                            <Icon className={`h-4 w-4 ${kpi.color}`} />
                          </div>
                          {(kpi.label === 'SLA Estourados' || kpi.label === 'Em Risco') && kpi.value > 0 && (
                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </div>
                        <p className="text-3xl font-bold text-white">{kpi.value}</p>
                        <p className="text-xs text-gray-400 mt-1">{kpi.label}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>

            <Separator className="bg-gray-800" />

            {/* BLOCO 2: Pipeline por Fase */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <ArrowRight className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Pipeline por Fase</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {pipeline.map((p) => {
                  const config = faseConfig[p.fase] || faseConfig.onboarding
                  const Icon = config.icon
                  const slaProgress = config.sla > 0 ? Math.min((p.avg_dias_na_etapa / config.sla) * 100, 100) : 0
                  const slaStatus = slaProgress >= 80 ? 'text-red-400' : slaProgress >= 50 ? 'text-yellow-400' : 'text-green-400'

                  return (
                    <Card
                      key={p.fase}
                      className={`bg-gray-900 border ${config.borderColor} hover:shadow-lg hover:shadow-${config.color}/5 transition-all duration-300`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2.5 rounded-xl ${config.bgColor}`}>
                              <Icon className={`h-5 w-5 ${config.color}`} />
                            </div>
                            <div>
                              <CardTitle className={`text-lg ${config.color}`}>
                                {config.label}
                              </CardTitle>
                              <CardDescription className="text-gray-500">
                                SLA: {config.sla} dias
                              </CardDescription>
                            </div>
                          </div>
                          <span className="text-3xl font-bold text-white">{p.count}</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">Media dias na etapa</span>
                            <span className={`font-semibold ${slaStatus}`}>
                              {p.avg_dias_na_etapa}d
                            </span>
                          </div>
                          <Progress
                            value={slaProgress}
                            className="h-2 bg-gray-800"
                          />
                        </div>

                        <Separator className="bg-gray-800" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-500" />
                            <span className="text-sm text-gray-400">Travados</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={p.travados > 0 ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30'}
                          >
                            {p.travados}
                          </Badge>
                        </div>

                        {p.travados > 0 && (
                          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                            <p className="text-xs text-red-400">
                              {p.travados} cliente{p.travados > 1 ? 's' : ''} com SLA estourado nesta fase
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>

            <Separator className="bg-gray-800" />

            {/* BLOCO 3: Gargalos Operacionais */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-semibold text-white">Gargalos Operacionais</h2>
                {gargalos.length > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 ml-2">
                    {gargalos.length} detectado{gargalos.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {gargalos.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold">Nenhum gargalo detectado</p>
                    <p className="text-gray-500 text-sm mt-1">Operacao fluindo normalmente</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {gargalos.map((g, idx) => (
                    <Card
                      key={idx}
                      className={`bg-gray-900 border ${
                        g.severidade === 'critica' ? 'border-red-500/30' : g.severidade === 'alta' ? 'border-orange-500/30' : 'border-yellow-500/30'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            g.severidade === 'critica' ? 'bg-red-500/10' : g.severidade === 'alta' ? 'bg-orange-500/10' : 'bg-yellow-500/10'
                          }`}>
                            <AlertTriangle className={`h-5 w-5 ${
                              g.severidade === 'critica' ? 'text-red-400' : g.severidade === 'alta' ? 'text-orange-400' : 'text-yellow-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge
                                variant="outline"
                                className={severidadeColors[g.severidade] || severidadeColors.media}
                              >
                                {g.severidade.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700">
                                {g.tipo.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="text-white font-medium">{g.descricao}</p>
                            <p className="text-sm text-gray-500 mt-1">{g.contexto}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-2xl font-bold text-white">{g.valor}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            <Separator className="bg-gray-800" />

            {/* BLOCO 4: Performance por Time */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-5 w-5 text-amber-400" />
                <h2 className="text-lg font-semibold text-white">Performance por Time</h2>
              </div>

              {performance_times.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <BarChart3 className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400 font-semibold">Sem dados de performance</p>
                    <p className="text-gray-500 text-sm mt-1">Os dados aparecerao conforme forem registrados</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {performance_times.map((t) => {
                    const config = timeConfig[t.time.toLowerCase()] || {
                      icon: BarChart3,
                      color: 'text-gray-400',
                      bgColor: 'bg-gray-500/10'
                    }
                    const Icon = config.icon
                    const atingimentoColor = t.atingimento >= 100
                      ? 'text-green-400'
                      : t.atingimento >= 70
                        ? 'text-amber-400'
                        : 'text-red-400'

                    return (
                      <Card key={t.time} className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${config.bgColor}`}>
                              <Icon className={`h-4 w-4 ${config.color}`} />
                            </div>
                            <CardTitle className="text-base text-white capitalize">
                              {t.time}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Atingimento */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-500">Atingimento</span>
                              <span className={`text-sm font-bold ${atingimentoColor}`}>
                                {t.atingimento}%
                              </span>
                            </div>
                            <Progress
                              value={Math.min(t.atingimento, 100)}
                              className="h-2 bg-gray-800"
                            />
                          </div>

                          <Separator className="bg-gray-800" />

                          {/* Metricas */}
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-gray-500 text-xs">Leads</p>
                              <p className="text-white font-semibold">
                                {t.leads_gerados}
                                <span className="text-gray-600 font-normal">/{t.meta_leads}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Agendamentos</p>
                              <p className="text-white font-semibold">
                                {t.agendamentos}
                                <span className="text-gray-600 font-normal">/{t.meta_agendamentos}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Vendas</p>
                              <p className="text-white font-semibold">
                                {t.vendas}
                                <span className="text-gray-600 font-normal">/{t.meta_vendas}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Conversao</p>
                              <p className="text-amber-400 font-semibold">{t.taxa_conversao}%</p>
                            </div>
                          </div>

                          <Separator className="bg-gray-800" />

                          {/* Faturamento */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">Faturamento</span>
                            <span className="text-sm font-bold text-green-400">
                              R$ {t.faturamento.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            <Separator className="bg-gray-800" />

            {/* BLOCO 5: Alertas Operacionais */}
            <section className="pb-8">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h2 className="text-lg font-semibold text-white">Alertas Operacionais do Dia</h2>
                {alertas.length > 0 && (
                  <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 ml-2">
                    {alertas.length} aberto{alertas.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {alertas.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
                    <p className="text-green-400 font-semibold">Nenhum alerta aberto</p>
                    <p className="text-gray-500 text-sm mt-1">Tudo operando dentro do esperado</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {alertas.map((alerta) => (
                    <Card
                      key={alerta.id}
                      className={`bg-gray-900 border ${
                        alerta.prioridade === 'critica' ? 'border-red-500/30' : 'border-orange-500/30'
                      } hover:bg-gray-900/80 transition-colors`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-lg shrink-0 ${
                            alerta.prioridade === 'critica' ? 'bg-red-500/10' : 'bg-orange-500/10'
                          }`}>
                            {alerta.prioridade === 'critica' ? (
                              <XCircle className="h-5 w-5 text-red-400" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-orange-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Badge
                                variant="outline"
                                className={prioridadeColors[alerta.prioridade] || 'bg-gray-800 text-gray-400 border-gray-700'}
                              >
                                {alerta.prioridade.toUpperCase()}
                              </Badge>
                              <Badge variant="outline" className="bg-gray-800 text-gray-400 border-gray-700">
                                {alerta.tipo}
                              </Badge>
                            </div>
                            <p className="text-white font-medium truncate">{alerta.titulo}</p>
                            <p className="text-sm text-gray-500 truncate">{alerta.descricao}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-gray-500">
                              {new Date(alerta.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </React.Fragment>
  )
}
