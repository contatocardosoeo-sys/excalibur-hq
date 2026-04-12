'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { NumberTicker } from '@/components/ui/number-ticker'
import AdocaoEquipe from '../../components/AdocaoEquipe'
import ResumoDia from '../../components/ResumoDia'
import FunilUnificado from '../../components/FunilUnificado'

interface Receita {
  dia: number
  meta_dia: number
  gap_dia: number
  pct_dia: number
  mes: number
  meta_mes: number
  gap_mes: number
  pct_mes: number
  media_dia: number
  projecao: number
  dias_restantes: number
  precisa_dia: number
}

interface Crescimento {
  mrr: number
  ltv: number
  cac: number
  payback: number
  novos_clientes: number
  churn: number
  crescimento_pct: number
  margem: number
}

interface Funil {
  leads: number
  agendamentos: number
  comparecimentos: number
  fechamentos: number
  taxa_agendamento: number
  taxa_comparecimento: number
  taxa_fechamento: number
  taxa_geral: number
  cpl: number
  cac_real: number
  ticket_medio: number
  receita_gerada: number
  investimento_ads: number
}

interface Gargalo {
  id: string
  titulo: string
  descricao: string
  impacto_financeiro: number
  nivel: 'critico' | 'alto' | 'medio' | 'baixo'
  area: string
}

interface TimeInfo {
  status: string
  [key: string]: unknown
}

interface Alerta {
  id: string
  titulo: string
  descricao: string
  nivel: 'critico' | 'warn' | 'ok'
  area: string
}

interface DashboardCEO {
  receita: Receita
  crescimento: Crescimento
  funil: Funil
  gargalos: Gargalo[]
  times: { trafego: TimeInfo; comercial: TimeInfo; cs: TimeInfo }
  alertas: Alerta[]
}

function fmt(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function fmtFull(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

const nivelBadge: Record<string, string> = {
  critico: 'bg-red-500/20 text-red-400 border-red-500/30',
  alto: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  medio: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  baixo: 'bg-green-500/20 text-green-400 border-green-500/30',
  warn: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  ok: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const nivelBorder: Record<string, string> = {
  critico: 'border-l-red-500',
  alto: 'border-l-orange-500',
  medio: 'border-l-yellow-500',
  baixo: 'border-l-green-500',
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  ok: { label: 'OK', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  atencao: { label: 'Atencao', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  critico: { label: 'Critico', cls: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export default function CEODashboard() {
  const [data, setData] = useState<DashboardCEO | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('mes')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/ceo/dashboard')
      const json = await res.json()
      setData(json)
    } catch (err) {
      console.error('Erro ao carregar dashboard CEO:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(); const iv = setInterval(fetchData, 120000); return () => clearInterval(iv) }, [fetchData])

  useEffect(() => {
    const ch1 = supabase.channel('ceo_metricas').on('postgres_changes', { event: '*', schema: 'public', table: 'metricas_ceo' }, () => fetchData()).subscribe()
    const ch2 = supabase.channel('ceo_alertas').on('postgres_changes', { event: '*', schema: 'public', table: 'alertas_estrategicos' }, () => fetchData()).subscribe()
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2) }
  }, [fetchData])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-amber-400 text-lg animate-pulse">Carregando Dashboard CEO...</div>
        </div>
      </div>
    )
  }

  if (!data) return null
  const { receita, crescimento, funil, gargalos, times, alertas } = data
  const finCeo = (data as unknown as Record<string, unknown>).financeiro_ceo as { caixa: number; recebido: number; total_receber: number; pago: number; total_pagar: number; tx_pagamento: number; mes_anterior: { recebido: number; pago: number; caixa: number } } | undefined
  const metas = (data as unknown as Record<string, unknown>).metas as { sdr: { leads: { atual: number; meta: number }; reunioes: { atual: number; meta: number } }; closer: { reunioes: { atual: number; meta: number }; fechamentos: { atual: number; meta: number }; mrr: { atual: number; meta: number } } } | undefined
  const criticosCount = alertas.filter(a => a.nivel === 'critico').length

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">

        {/* ━━━ RESUMO DO DIA (uma linha — pagamentos, leads, alertas) ━━━ */}
        <ResumoDia />

        {/* ━━━ FUNIL UNIFICADO — real vs meta (alvo R$90k) ━━━ */}
        <FunilUnificado />

        {/* ━━━ ADOÇÃO DA EQUIPE (primeiro elemento — monitoramento de execução) ━━━ */}
        <AdocaoEquipe />

        {/* ━━━ HEADER ━━━ */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold flex items-center gap-2">
              Dashboard CEO
              {criticosCount > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 animate-pulse text-xs">
                  {criticosCount} alerta{criticosCount > 1 ? 's' : ''} critico{criticosCount > 1 ? 's' : ''}
                </Badge>
              )}
            </h1>
            <p className="text-gray-500 text-sm mt-1">Visao completa do negocio — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-0.5">
            {['hoje', 'semana', 'mes', 'ano'].map(p => (
              <Button
                key={p}
                size="sm"
                variant={periodo === p ? 'default' : 'ghost'}
                className={`min-h-[44px] md:min-h-[28px] px-3 md:px-2 text-xs ${periodo === p ? 'bg-amber-500 text-gray-950 hover:bg-amber-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                onClick={() => setPeriodo(p)}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* ━━━ BLOCO 1: RECEITA & META ━━━ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <Card className={`bg-gray-900 border-gray-800 ${receita.gap_dia >= 0 ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500'}`}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Receita Hoje</p>
              <p className={`text-xl font-bold mt-1 ${receita.gap_dia >= 0 ? 'text-green-400' : 'text-amber-400'}`}>
                <NumberTicker value={receita.dia} prefix="R$ " className={receita.gap_dia >= 0 ? 'text-green-400' : 'text-amber-400'} />
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Meta: {fmt(receita.meta_dia)}</p>
              <Progress value={Math.min(receita.pct_dia, 100)} className={`h-1 mt-2 bg-gray-800 ${receita.gap_dia >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`} />
            </CardContent>
          </Card>

          <Card className={`bg-gray-900 border-gray-800 ${receita.gap_dia >= 0 ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500'}`}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Gap Hoje</p>
              <p className={`text-xl font-bold mt-1 ${receita.gap_dia >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {receita.gap_dia >= 0 ? '+' : ''}<NumberTicker value={receita.gap_dia} prefix="R$ " className={receita.gap_dia >= 0 ? 'text-green-400' : 'text-red-400'} />
              </p>
              <p className="text-[10px] text-gray-500 mt-1">{receita.pct_dia}% da meta</p>
              <Progress value={Math.min(receita.pct_dia, 100)} className={`h-1 mt-2 bg-gray-800 ${receita.gap_dia >= 0 ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`} />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800 border-l-2 border-l-amber-500">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Receita Mes</p>
              <p className="text-xl font-bold text-amber-400 mt-1">
                <NumberTicker value={receita.mes} prefix="R$ " className="text-amber-400" />
              </p>
              <p className="text-[10px] text-gray-500 mt-1">{receita.pct_mes}% da meta</p>
              <Progress value={Math.min(receita.pct_mes, 100)} className="h-1 mt-2 bg-gray-800 [&>div]:bg-amber-500" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Meta Mes</p>
              <p className="text-xl font-bold text-white mt-1">
                <NumberTicker value={receita.meta_mes} prefix="R$ " className="text-white" />
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Falta: {fmt(receita.gap_mes)}</p>
              <Progress value={Math.min(receita.pct_mes, 100)} className="h-1 mt-2 bg-gray-800 [&>div]:bg-gray-600" />
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Media/Dia</p>
              <p className="text-xl font-bold text-white mt-1">
                <NumberTicker value={receita.media_dia} prefix="R$ " className="text-white" />
              </p>
              <p className="text-[10px] text-gray-500 mt-1">Precisa: {fmt(receita.precisa_dia)}/dia</p>
              <Progress value={receita.precisa_dia > 0 ? Math.min((receita.media_dia / receita.precisa_dia) * 100, 100) : 100} className="h-1 mt-2 bg-gray-800 [&>div]:bg-blue-500" />
            </CardContent>
          </Card>

          <Card className={`bg-gray-900 border-gray-800 ${receita.projecao >= receita.meta_mes ? 'border-l-2 border-l-green-500' : 'border-l-2 border-l-red-500'}`}>
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">Projecao Mes</p>
              <p className={`text-xl font-bold mt-1 ${receita.projecao >= receita.meta_mes ? 'text-green-400' : 'text-red-400'}`}>
                <NumberTicker value={receita.projecao} prefix="R$ " className={receita.projecao >= receita.meta_mes ? 'text-green-400' : 'text-red-400'} />
              </p>
              <p className="text-[10px] text-gray-500 mt-1">{receita.dias_restantes} dias restantes</p>
              <Progress value={Math.min((receita.projecao / receita.meta_mes) * 100, 100)} className={`h-1 mt-2 bg-gray-800 ${receita.projecao >= receita.meta_mes ? '[&>div]:bg-green-500' : '[&>div]:bg-red-500'}`} />
            </CardContent>
          </Card>
        </div>

        {/* BARRA DE PROGRESSO DA META */}
        <Card className={`bg-gray-900 border-gray-800 mb-6 ${receita.projecao < receita.meta_mes ? 'border-red-500/30' : 'border-green-500/30'}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white font-semibold">Progresso da Meta Mensal</span>
              <span className="text-xs text-gray-400">{receita.pct_mes}% realizado</span>
            </div>
            <div className="relative h-6 bg-gray-800 rounded-full overflow-hidden mb-2">
              <div className="absolute h-full bg-amber-500/80 rounded-full transition-all" style={{ width: `${Math.min(receita.pct_mes, 100)}%` }} />
              <div className="absolute h-full border-r-2 border-dashed border-gray-400" style={{ left: `${Math.min((receita.projecao / receita.meta_mes) * 100, 100)}%` }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-white font-bold">{fmt(receita.mes)} / {fmt(receita.meta_mes)}</span>
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500">
              <span>Ritmo: {fmt(receita.media_dia)}/dia</span>
              <span>Precisa: {fmt(receita.precisa_dia)}/dia</span>
              <span>Projecao: {fmt(receita.projecao)}</span>
              <span>{receita.dias_restantes} dias restantes</span>
            </div>
            {receita.projecao < receita.meta_mes && (
              <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                Projecao abaixo da meta em {fmt(receita.meta_mes - receita.projecao)}. Precisa de {fmt(receita.precisa_dia)}/dia nos proximos {receita.dias_restantes} dias.
              </div>
            )}
          </CardContent>
        </Card>

        {/* ━━━ BLOCO 2: CRESCIMENTO ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">MRR Atual</p>
                <p className="text-xl font-bold text-green-400 mt-1">
                  <NumberTicker value={crescimento.mrr} prefix="R$ " className="text-green-400" />
                </p>
                <p className="text-[10px] text-green-400 mt-1">+{crescimento.crescimento_pct}% este mes</p>
                <Progress value={75} className="h-1 mt-2 bg-gray-800 [&>div]:bg-green-500" />
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">LTV Medio</p>
                <p className="text-xl font-bold text-blue-400 mt-1">
                  <NumberTicker value={crescimento.ltv} prefix="R$ " className="text-blue-400" />
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Lifetime value</p>
                <Progress value={70} className="h-1 mt-2 bg-gray-800 [&>div]:bg-blue-500" />
              </CardContent>
            </Card>
            <Card className={`bg-gray-900 border-gray-800 ${crescimento.cac > 3000 ? 'border-l-2 border-l-red-500' : ''}`}>
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">CAC Medio</p>
                <p className={`text-xl font-bold mt-1 ${crescimento.cac > 3000 ? 'text-red-400' : 'text-amber-400'}`}>
                  <NumberTicker value={crescimento.cac} prefix="R$ " className={crescimento.cac > 3000 ? 'text-red-400' : 'text-amber-400'} />
                </p>
                <p className="text-[10px] text-red-400 mt-1">+12% vs mes anterior</p>
                <Progress value={60} className="h-1 mt-2 bg-gray-800 [&>div]:bg-red-500" />
              </CardContent>
            </Card>
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-4">
                <p className="text-[10px] uppercase tracking-wider text-gray-500">Payback</p>
                <p className="text-xl font-bold text-purple-400 mt-1">{crescimento.payback} meses</p>
                <p className="text-[10px] text-gray-500 mt-1">Retorno do investimento</p>
                <Progress value={crescimento.payback < 3 ? 80 : 40} className="h-1 mt-2 bg-gray-800 [&>div]:bg-purple-500" />
              </CardContent>
            </Card>
          </div>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Variacao Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Novos Clientes', value: `+${crescimento.novos_clientes}`, color: 'text-green-400', sub: 'este mes' },
                  { label: 'Churn', value: String(crescimento.churn), color: 'text-red-400', sub: `${((crescimento.churn / (crescimento.novos_clientes + 48)) * 100).toFixed(1)}% taxa` },
                  { label: 'Crescimento Receita', value: `+${crescimento.crescimento_pct}%`, color: crescimento.crescimento_pct > 0 ? 'text-green-400' : 'text-red-400', sub: 'vs mes anterior' },
                  { label: 'Margem Liquida', value: `${crescimento.margem}%`, color: crescimento.margem > 50 ? 'text-green-400' : 'text-amber-400', sub: 'receita - ads' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">{item.label}</span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                        <p className="text-[10px] text-gray-600">{item.sub}</p>
                      </div>
                    </div>
                    {i < 3 && <Separator className="bg-gray-800 mt-3" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ━━━ BLOCO 3: FUNIL ━━━ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Funil de Vendas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-2 h-48">
                {[
                  { label: 'Leads', value: funil.leads, pct: 100, color: 'bg-blue-500' },
                  { label: 'Agendados', value: funil.agendamentos, pct: funil.taxa_agendamento, color: 'bg-purple-500' },
                  { label: 'Compareceu', value: funil.comparecimentos, pct: (funil.comparecimentos / funil.leads) * 100, color: 'bg-amber-500' },
                  { label: 'Fechou', value: funil.fechamentos, pct: funil.taxa_geral, color: 'bg-green-500' },
                ].map((step, i, arr) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <NumberTicker value={step.value} delay={i * 0.15} className="text-white text-sm font-bold" />
                    <span className="sr-only">{step.value}</span>
                    <div className="w-full rounded-t-lg relative" style={{ height: `${Math.max(step.pct * 1.5, 15)}px` }}>
                      <div className={`w-full h-full ${step.color} rounded-t-lg opacity-80`} />
                    </div>
                    <span className="text-[10px] text-gray-400 text-center">{step.label}</span>
                    {i < arr.length - 1 && (
                      <span className="text-[10px] text-gray-500">
                        {i === 0 ? funil.taxa_agendamento : i === 1 ? funil.taxa_comparecimento : funil.taxa_fechamento}%
                      </span>
                    )}
                    {i === arr.length - 1 && (
                      <span className="text-[10px] text-green-400 font-bold">{funil.taxa_geral}% geral</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm font-semibold">Metricas do Funil</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: 'CPL Medio', value: fmtFull(funil.cpl), color: funil.cpl > 35 ? 'text-red-400' : 'text-green-400' },
                  { label: 'CAC Real', value: fmt(funil.cac_real), color: funil.cac_real > 200 ? 'text-red-400' : 'text-green-400' },
                  { label: 'Ticket Medio', value: fmt(funil.ticket_medio), color: 'text-amber-400' },
                  { label: 'Conversao Geral', value: `${funil.taxa_geral}%`, color: funil.taxa_geral > 20 ? 'text-green-400' : 'text-amber-400' },
                  { label: 'Receita Gerada', value: fmt(funil.receita_gerada), color: 'text-green-400' },
                  { label: 'Investimento Ads', value: fmt(funil.investimento_ads), color: 'text-blue-400' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{item.label}</span>
                    <span className={`text-sm font-bold ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ━━━ BLOCO 4: GARGALOS ━━━ */}
        <Card className="bg-gray-900 border-gray-800 mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-semibold">Onde esta perdendo dinheiro agora</CardTitle>
              <Button size="sm" variant="outline" className="min-h-[44px] md:h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                Pedir analise ao HEAD
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gargalos.map((g) => {
                const maxImpacto = Math.max(...gargalos.map(x => Number(x.impacto_financeiro)))
                const pctImpacto = maxImpacto > 0 ? (Number(g.impacto_financeiro) / maxImpacto) * 100 : 0
                return (
                  <div key={g.id} className={`bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 border-l-4 ${nivelBorder[g.nivel] || 'border-l-gray-500'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[10px] ${nivelBadge[g.nivel]}`}>
                          {g.nivel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">
                          {g.area}
                        </Badge>
                      </div>
                      <span className="text-red-400 font-bold text-sm">-{fmt(Number(g.impacto_financeiro))}/mes</span>
                    </div>
                    <p className="text-white text-sm font-medium">{g.titulo}</p>
                    <p className="text-gray-400 text-xs mt-1">{g.descricao}</p>
                    <Progress value={pctImpacto} className="h-1.5 mt-3 bg-gray-700 [&>div]:bg-red-500/70" />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ━━━ BLOCO 5: TIMES ━━━ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Trafego */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-semibold">Trafego</CardTitle>
                <Badge variant="outline" className={`text-[10px] ${statusBadge[times.trafego.status]?.cls}`}>
                  {statusBadge[times.trafego.status]?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-gray-400">Leads/mes</span><span className="text-xs text-white font-bold">{funil.leads}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">CPL</span><span className={`text-xs font-bold ${funil.cpl > 35 ? 'text-red-400' : 'text-green-400'}`}>{fmtFull(funil.cpl)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Investimento</span><span className="text-xs text-blue-400 font-bold">{fmt(funil.investimento_ads)}</span></div>
              </div>
              <Progress value={funil.cpl <= 35 ? 80 : 45} className={`h-1.5 mt-3 bg-gray-800 ${funil.cpl <= 35 ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`} />
            </CardContent>
          </Card>

          {/* Comercial */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-semibold">Comercial</CardTitle>
                <Badge variant="outline" className={`text-[10px] ${statusBadge[times.comercial.status]?.cls}`}>
                  {statusBadge[times.comercial.status]?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-gray-400">Vendas</span><span className="text-xs text-white font-bold">{funil.fechamentos}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Conversao</span><span className={`text-xs font-bold ${funil.taxa_fechamento < 55 ? 'text-red-400' : 'text-amber-400'}`}>{funil.taxa_fechamento}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Ticket Medio</span><span className="text-xs text-amber-400 font-bold">{fmt(funil.ticket_medio)}</span></div>
              </div>
              <Progress value={funil.taxa_fechamento} className={`h-1.5 mt-3 bg-gray-800 ${funil.taxa_fechamento >= 65 ? '[&>div]:bg-green-500' : funil.taxa_fechamento >= 55 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} />
            </CardContent>
          </Card>

          {/* CS */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-sm font-semibold">Customer Success</CardTitle>
                <Badge variant="outline" className={`text-[10px] ${statusBadge[times.cs.status]?.cls}`}>
                  {statusBadge[times.cs.status]?.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-xs text-gray-400">Clientes</span><span className="text-xs text-white font-bold">{times.cs.clientes as number}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Em Risco</span><span className="text-xs text-red-400 font-bold">{times.cs.em_risco as number}</span></div>
                <div className="flex justify-between"><span className="text-xs text-gray-400">Churn Rate</span><span className={`text-xs font-bold ${(times.cs.churn_rate as number) > 3 ? 'text-red-400' : 'text-green-400'}`}>{times.cs.churn_rate as number}%</span></div>
              </div>
              <Progress value={(times.cs.churn_rate as number) > 3 ? 40 : 80} className={`h-1.5 mt-3 bg-gray-800 ${(times.cs.churn_rate as number) > 3 ? '[&>div]:bg-red-500' : '[&>div]:bg-green-500'}`} />
            </CardContent>
          </Card>
        </div>

        {/* ━━━ BLOCO 6: CAIXA & FINANCEIRO ━━━ */}
        {finCeo && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm font-semibold">Caixa do Mes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Recebido</p>
                    <p className="text-lg font-bold text-green-400">{fmt(finCeo.recebido)}</p>
                    <p className="text-[10px] text-gray-500">{finCeo.tx_pagamento}% do previsto</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Pago</p>
                    <p className="text-lg font-bold text-red-400">{fmt(finCeo.pago)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 uppercase">Caixa</p>
                    <p className={`text-lg font-bold ${finCeo.caixa >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(finCeo.caixa)}</p>
                  </div>
                </div>
                <Progress value={Math.min(finCeo.tx_pagamento, 100)} className="h-1.5 bg-gray-800 [&>div]:bg-green-500" />
                <p className="text-[10px] text-gray-500 mt-2">{fmt(finCeo.recebido)} de {fmt(finCeo.total_receber)} previsto</p>
                {finCeo.mes_anterior.recebido > 0 && (
                  <div className="mt-3 flex gap-4 text-[10px] text-gray-500">
                    <span>Mes anterior: Caixa {fmt(finCeo.mes_anterior.caixa)}</span>
                    <span className={finCeo.caixa > finCeo.mes_anterior.caixa ? 'text-green-400' : 'text-red-400'}>
                      {finCeo.caixa > finCeo.mes_anterior.caixa ? '↑' : '↓'} {Math.abs(Math.round(((finCeo.caixa - finCeo.mes_anterior.caixa) / (finCeo.mes_anterior.caixa || 1)) * 100))}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {metas && (
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-sm font-semibold">Metas dos Times</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { label: 'SDR — Leads', atual: metas.sdr.leads.atual, meta: metas.sdr.leads.meta },
                      { label: 'SDR — Reunioes', atual: metas.sdr.reunioes.atual, meta: metas.sdr.reunioes.meta },
                      { label: 'Closer — Fechamentos', atual: metas.closer.fechamentos.atual, meta: metas.closer.fechamentos.meta },
                      { label: 'Closer — MRR', atual: metas.closer.mrr.atual, meta: metas.closer.mrr.meta },
                    ].map((m, i) => {
                      const p = m.meta > 0 ? Math.round((m.atual / m.meta) * 100) : 0
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400">{m.label}</span>
                            <span className={`font-bold ${p >= 80 ? 'text-green-400' : p >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                              {m.label.includes('MRR') ? fmt(m.atual) : m.atual}/{m.label.includes('MRR') ? fmt(m.meta) : m.meta}
                            </span>
                          </div>
                          <Progress value={Math.min(p, 100)} className={`h-1 bg-gray-800 ${p >= 80 ? '[&>div]:bg-green-500' : p >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`} />
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ━━━ BLOCO 7: ALERTAS ESTRATEGICOS ━━━ */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-sm font-semibold flex items-center gap-2">
                Decisao obrigatoria
                {alertas.length > 0 && (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">{alertas.length}</Badge>
                )}
              </CardTitle>
              <Button size="sm" variant="outline" className="min-h-[44px] md:h-7 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10">
                O que fazer agora
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alertas.map((alerta) => (
                <div key={alerta.id} className={`rounded-lg p-4 border ${
                  alerta.nivel === 'critico' ? 'bg-red-500/10 border-red-500/30' :
                  alerta.nivel === 'warn' ? 'bg-amber-500/10 border-amber-500/30' :
                  'bg-green-500/10 border-green-500/30'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] ${nivelBadge[alerta.nivel]}`}>
                          {alerta.nivel}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-gray-400 border-gray-600">
                          {alerta.area}
                        </Badge>
                      </div>
                      <p className="text-white text-sm font-medium">{alerta.titulo}</p>
                      <p className="text-gray-400 text-xs mt-1">{alerta.descricao}</p>
                    </div>
                    <Button size="sm" className="min-h-[44px] md:h-7 text-[10px] bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold ml-3 shrink-0">
                      Decidir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
