'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Problema {
  texto: string
  nivel: 'critico' | 'alto' | 'medio' | 'ok'
}

interface ClienteCS {
  id: string
  nome: string
  cs_responsavel: string
  fase: 'onboarding' | 'adocao' | 'escala'
  score_total: number
  score_adocao: number
  score_operacao: number
  score_resultado: number
  status_execucao: string
  ultimo_contato: string
  dias_na_etapa: number
  dias_sem_venda: number
  crm_ativo: boolean
  campanha_ativa: boolean
  leads_semana: number
  proxima_acao: string | null
  mrr: number
  ticket_medio: number
  roi: number
  total_vendas_semana: number
  adocao_crm: boolean
  adocao_responde_leads: boolean
  adocao_assiste_aulas: boolean
  adocao_planilha: boolean
  adocao_script: boolean
  adocao_reunioes: boolean
  problema: Problema
  acao_sugerida: string
}

interface KPIs {
  total_clientes: number
  criticos: number
  mrr_total: number
  score_medio: number
  leads_semana: number
  vendas_semana: number
  roi_medio: number
}

interface AdocaoItem {
  label: string
  total: number
  aderentes: number
  percentual: number
}

interface Alerta {
  cliente: string
  problema: string
  nivel: string
  acao: string
}

interface DashboardData {
  kpis: KPIs
  lista_acionavel: ClienteCS[]
  pipeline: {
    onboarding: ClienteCS[]
    adocao: ClienteCS[]
    escala: ClienteCS[]
  }
  adocao: AdocaoItem[]
  alertas: Alerta[]
}

const faseColors: Record<string, string> = {
  onboarding: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  adocao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  escala: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const statusColors: Record<string, string> = {
  ativo: 'bg-green-500/20 text-green-400 border-green-500/30',
  travado: 'bg-red-500/20 text-red-400 border-red-500/30',
  aguardando_cliente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  aguardando_interno: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const nivelColors: Record<string, string> = {
  critico: 'text-red-400',
  alto: 'text-orange-400',
  medio: 'text-yellow-400',
  ok: 'text-green-400',
}

const nivelBgColors: Record<string, string> = {
  critico: 'bg-red-500/10 border-red-500/30',
  alto: 'bg-orange-500/10 border-orange-500/30',
  medio: 'bg-yellow-500/10 border-yellow-500/30',
  ok: 'bg-green-500/10 border-green-500/30',
}

const nivelDotColors: Record<string, string> = {
  critico: 'bg-red-500',
  alto: 'bg-orange-500',
  medio: 'bg-yellow-500',
  ok: 'bg-green-500',
}

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-amber-400'
  if (score >= 40) return 'text-orange-400'
  return 'text-red-400'
}

function scoreProgressColor(score: number) {
  if (score >= 80) return '[&>div]:bg-green-500'
  if (score >= 60) return '[&>div]:bg-amber-500'
  if (score >= 40) return '[&>div]:bg-orange-500'
  return '[&>div]:bg-red-500'
}

function getInitials(nome: string) {
  return nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export default function CSDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filtroCS, setFiltroCS] = useState('todos')
  const [filtroFase, setFiltroFase] = useState('todos')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/cs/dashboard')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Erro ao carregar dashboard CS:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('clientes_hq_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes_hq' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-amber-400 text-lg animate-pulse">Carregando Dashboard CS...</div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { kpis, lista_acionavel, pipeline, adocao, alertas } = data

  // Filtros
  const csOptions = [...new Set(lista_acionavel.map(c => c.cs_responsavel))]
  const listaFiltrada = lista_acionavel.filter(c => {
    if (filtroCS !== 'todos' && c.cs_responsavel !== filtroCS) return false
    if (filtroFase !== 'todos' && c.fase !== filtroFase) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-6 overflow-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold flex items-center gap-2">
              Customer Success
              {kpis.criticos > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse text-xs">
                  {kpis.criticos} critico{kpis.criticos > 1 ? 's' : ''}
                </Badge>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Gestor de receita recorrente — visao acionavel</p>
          </div>
          <div className="flex gap-2">
            <select
              value={filtroCS}
              onChange={e => setFiltroCS(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="todos">Todos CS</option>
              {csOptions.map(cs => (
                <option key={cs} value={cs}>{cs}</option>
              ))}
            </select>
            <select
              value={filtroFase}
              onChange={e => setFiltroFase(e.target.value)}
              className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="todos">Todas Fases</option>
              <option value="onboarding">Onboarding</option>
              <option value="adocao">Adocao</option>
              <option value="escala">Escala</option>
            </select>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Clientes</p>
              <p className="text-2xl font-bold text-white mt-1">{kpis.total_clientes}</p>
              <Progress value={100} className="h-1 mt-2 bg-gray-800 [&>div]:bg-amber-500" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Criticos</p>
              <p className={`text-2xl font-bold mt-1 ${kpis.criticos > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {kpis.criticos}
              </p>
              <Progress value={kpis.total_clientes > 0 ? (kpis.criticos / kpis.total_clientes) * 100 : 0} className="h-1 mt-2 bg-gray-800 [&>div]:bg-red-500" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">MRR Total</p>
              <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(kpis.mrr_total)}</p>
              <Progress value={75} className="h-1 mt-2 bg-gray-800 [&>div]:bg-green-500" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Score Medio</p>
              <p className={`text-2xl font-bold mt-1 ${scoreColor(kpis.score_medio)}`}>{kpis.score_medio}</p>
              <Progress value={kpis.score_medio} className={`h-1 mt-2 bg-gray-800 ${scoreProgressColor(kpis.score_medio)}`} />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Leads/Semana</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">{kpis.leads_semana}</p>
              <Progress value={Math.min((kpis.leads_semana / 100) * 100, 100)} className="h-1 mt-2 bg-gray-800 [&>div]:bg-amber-500" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">ROI Medio</p>
              <p className={`text-2xl font-bold mt-1 ${kpis.roi_medio >= 2 ? 'text-green-400' : kpis.roi_medio >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                {kpis.roi_medio}x
              </p>
              <Progress value={Math.min(kpis.roi_medio * 10, 100)} className="h-1 mt-2 bg-gray-800 [&>div]:bg-green-500" />
            </CardContent>
          </Card>
        </div>

        {/* LISTA ACIONAVEL */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
              Lista Acionavel
              <Badge variant="outline" className="text-gray-400 border-gray-700 text-xs font-normal">
                {listaFiltrada.length} clientes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-500 text-xs">Cliente</TableHead>
                  <TableHead className="text-gray-500 text-xs">CS</TableHead>
                  <TableHead className="text-gray-500 text-xs">Fase</TableHead>
                  <TableHead className="text-gray-500 text-xs">Score</TableHead>
                  <TableHead className="text-gray-500 text-xs">Status</TableHead>
                  <TableHead className="text-gray-500 text-xs">Problema</TableHead>
                  <TableHead className="text-gray-500 text-xs">Acao</TableHead>
                  <TableHead className="text-gray-500 text-xs w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listaFiltrada.map(cliente => (
                  <React.Fragment key={cliente.id}>
                    <TableRow className="border-gray-800/50 hover:bg-gray-800/30">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="bg-gray-800 text-amber-400 text-[10px] font-bold">
                              {getInitials(cliente.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-white text-sm font-medium">{cliente.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs">{cliente.cs_responsavel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${faseColors[cliente.fase]}`}>
                          {cliente.fase}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${scoreColor(cliente.score_total)}`}>
                            {cliente.score_total}
                          </span>
                          <Progress
                            value={cliente.score_total}
                            className={`h-1.5 w-16 bg-gray-800 ${scoreProgressColor(cliente.score_total)}`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${statusColors[cliente.status_execucao] || ''}`}>
                          {cliente.status_execucao.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${nivelColors[cliente.problema.nivel]}`}>
                          {cliente.problema.texto}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-gray-300">{cliente.acao_sugerida}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold"
                          >
                            Agir
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] border-gray-700 text-gray-400 hover:bg-gray-800"
                            onClick={() => setExpandedId(expandedId === cliente.id ? null : cliente.id)}
                          >
                            {expandedId === cliente.id ? 'Fechar' : 'Expandir'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === cliente.id && (
                      <TableRow className="border-gray-800/50 bg-gray-800/20">
                        <TableCell colSpan={8}>
                          <div className="grid grid-cols-4 gap-4 py-2">
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase">Score Adocao</p>
                              <p className="text-sm text-white font-bold">{cliente.score_adocao}/40</p>
                              <Progress value={(cliente.score_adocao / 40) * 100} className="h-1 mt-1 bg-gray-700 [&>div]:bg-blue-500" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase">Score Operacao</p>
                              <p className="text-sm text-white font-bold">{cliente.score_operacao}/30</p>
                              <Progress value={(cliente.score_operacao / 30) * 100} className="h-1 mt-1 bg-gray-700 [&>div]:bg-purple-500" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase">Score Resultado</p>
                              <p className="text-sm text-white font-bold">{cliente.score_resultado}/30</p>
                              <Progress value={(cliente.score_resultado / 30) * 100} className="h-1 mt-1 bg-gray-700 [&>div]:bg-green-500" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500 uppercase">Detalhes</p>
                              <div className="text-xs text-gray-400 space-y-0.5 mt-1">
                                <p>MRR: {formatCurrency(cliente.mrr)}</p>
                                <p>Ticket: {formatCurrency(cliente.ticket_medio)}</p>
                                <p>ROI: {cliente.roi}x</p>
                                <p>Dias na etapa: {cliente.dias_na_etapa}</p>
                                <p>Leads/sem: {cliente.leads_semana}</p>
                                <p>Vendas/sem: {cliente.total_vendas_semana}</p>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* GRID 2 COLUNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PIPELINE */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Pipeline CS</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(['onboarding', 'adocao', 'escala'] as const).map(fase => {
                  const clientes = pipeline[fase]
                  return (
                    <div key={fase} className="bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline" className={`text-[10px] ${faseColors[fase]}`}>
                          {fase}
                        </Badge>
                        <span className="text-white text-lg font-bold">{clientes.length}</span>
                      </div>
                      <Separator className="bg-gray-700/50 mb-2" />
                      <div className="space-y-1.5">
                        {clientes.map(c => (
                          <div key={c.id} className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              c.problema.nivel === 'critico' ? 'bg-red-500' :
                              c.problema.nivel === 'alto' ? 'bg-orange-500' :
                              c.problema.nivel === 'ok' ? 'bg-green-500' : 'bg-yellow-500'
                            }`} />
                            <span className="text-xs text-gray-300 truncate">{c.nome}</span>
                            <span className={`text-[10px] font-bold ml-auto ${scoreColor(c.score_total)}`}>
                              {c.score_total}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* ALERTAS */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                Alertas Ativos
                {alertas.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">
                    {alertas.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alertas.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Nenhum alerta ativo</p>
                ) : (
                  alertas.map((alerta, i) => (
                    <div key={i} className={`rounded-lg p-3 border ${nivelBgColors[alerta.nivel]}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${nivelDotColors[alerta.nivel]}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-white text-sm font-medium">{alerta.cliente}</p>
                            <Badge variant="outline" className={`text-[10px] ${nivelColors[alerta.nivel]} border-current/30`}>
                              {alerta.nivel}
                            </Badge>
                          </div>
                          <p className={`text-xs mt-0.5 ${nivelColors[alerta.nivel]}`}>{alerta.problema}</p>
                          <p className="text-xs text-gray-400 mt-1">Acao: {alerta.acao}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* RESULTADO AGREGADO */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Resultado Agregado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'MRR Total', value: formatCurrency(kpis.mrr_total), color: 'text-green-400' },
                  { label: 'Vendas/Semana', value: String(kpis.vendas_semana), color: 'text-amber-400' },
                  { label: 'Leads/Semana', value: String(kpis.leads_semana), color: 'text-blue-400' },
                  { label: 'ROI Medio', value: `${kpis.roi_medio}x`, color: kpis.roi_medio >= 2 ? 'text-green-400' : 'text-amber-400' },
                  { label: 'Score Medio', value: String(kpis.score_medio), color: scoreColor(kpis.score_medio) },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ADOCAO */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Adocao por Ferramenta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {adocao.map((item, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">{item.label}</span>
                      <span className={`text-xs font-bold ${
                        item.percentual >= 70 ? 'text-green-400' :
                        item.percentual >= 40 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {item.percentual}%
                      </span>
                    </div>
                    <Progress
                      value={item.percentual}
                      className={`h-2 bg-gray-800 ${
                        item.percentual >= 70 ? '[&>div]:bg-green-500' :
                        item.percentual >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'
                      }`}
                    />
                    <p className="text-[10px] text-gray-600">{item.aderentes}/{item.total} clientes</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
