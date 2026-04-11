import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { limparNomeClinica } from '../../../lib/trafego-clientes'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

function semanaRange(offset = 0): { inicio: string; fim: string } {
  const hoje = new Date()
  const dia = hoje.getDay() // 0=dom
  const segunda = new Date(hoje)
  segunda.setDate(hoje.getDate() - dia + 1 - offset * 7)
  const domingo = new Date(segunda)
  domingo.setDate(segunda.getDate() + 6)
  return {
    inicio: segunda.toISOString().split('T')[0],
    fim: domingo.toISOString().split('T')[0],
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const periodo = url.searchParams.get('periodo') || 'atual' // atual | passada | mes

  let inicio: string
  let fim: string

  if (periodo === 'mes') {
    const hoje = new Date()
    inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
    fim = new Date().toISOString().split('T')[0]
  } else if (periodo === 'passada') {
    ;({ inicio, fim } = semanaRange(1))
  } else {
    ;({ inicio, fim } = semanaRange(0))
  }

  // Período anterior (mesmo tamanho) pra comparativo
  const dInicio = new Date(inicio)
  const dFim = new Date(fim)
  const tamanho = Math.floor((dFim.getTime() - dInicio.getTime()) / 86400000) + 1
  const dAntFim = new Date(dInicio); dAntFim.setDate(dAntFim.getDate() - 1)
  const dAntIni = new Date(dAntFim); dAntIni.setDate(dAntIni.getDate() - tamanho + 1)
  const antIni = dAntIni.toISOString().split('T')[0]
  const antFim = dAntFim.toISOString().split('T')[0]

  const [
    { data: clinicas },
    { data: metricas },
    { data: metricasAnt },
    { data: alertasAbertos },
    { data: otimizacoes },
  ] = await Promise.all([
    sb.from('clinicas').select('id, nome'),
    sb.from('trafego_metricas').select('*').gte('data', inicio).lte('data', fim),
    sb.from('trafego_metricas').select('leads, investimento').gte('data', antIni).lte('data', antFim),
    sb.from('trafego_alertas').select('*').eq('status', 'aberto'),
    sb.from('trafego_otimizacoes').select('*').gte('data', inicio).lte('data', fim),
  ])

  const clinicaMap = Object.fromEntries((clinicas || []).map(c => [c.id, limparNomeClinica(c.nome)]))

  const m = metricas || []
  const mAnt = metricasAnt || []
  const totalLeads = m.reduce((s, x) => s + Number(x.leads || 0), 0)
  const totalInv = m.reduce((s, x) => s + Number(x.investimento || 0), 0)
  const totalAgend = m.reduce((s, x) => s + Number(x.agendamentos || 0), 0)
  const totalComp = m.reduce((s, x) => s + Number(x.comparecimentos || 0), 0)
  const totalFech = m.reduce((s, x) => s + Number(x.fechamentos || 0), 0)
  const totalReceita = m.reduce((s, x) => s + Number(x.receita_gerada || 0), 0)
  const cplMedio = totalLeads > 0 ? Math.round((totalInv / totalLeads) * 100) / 100 : 0

  const totalLeadsAnt = mAnt.reduce((s, x) => s + Number(x.leads || 0), 0)
  const totalInvAnt = mAnt.reduce((s, x) => s + Number(x.investimento || 0), 0)
  const cplMedioAnt = totalLeadsAnt > 0 ? Math.round((totalInvAnt / totalLeadsAnt) * 100) / 100 : 0

  // Por clínica (ranking)
  const porClinica: Record<string, { leads: number; investimento: number; cpl: number; nome: string }> = {}
  m.forEach(x => {
    const id = x.clinica_id as string
    if (!porClinica[id]) porClinica[id] = { leads: 0, investimento: 0, cpl: 0, nome: clinicaMap[id] || 'Clínica' }
    porClinica[id].leads += Number(x.leads || 0)
    porClinica[id].investimento += Number(x.investimento || 0)
  })
  Object.values(porClinica).forEach(c => {
    c.cpl = c.leads > 0 ? Math.round((c.investimento / c.leads) * 100) / 100 : 0
  })
  const ranking = Object.values(porClinica).filter(c => c.leads > 0).sort((a, b) => a.cpl - b.cpl)

  return NextResponse.json({
    periodo: { tipo: periodo, inicio, fim },
    totais: {
      leads: totalLeads,
      investimento: totalInv,
      cplMedio,
      agendamentos: totalAgend,
      comparecimentos: totalComp,
      fechamentos: totalFech,
      receita: totalReceita,
      roi: totalInv > 0 ? Math.round((totalReceita / totalInv) * 100) : 0,
    },
    comparativo: {
      cpl: { atual: cplMedio, anterior: cplMedioAnt, delta: cplMedioAnt > 0 ? Math.round(((cplMedio - cplMedioAnt) / cplMedioAnt) * 1000) / 10 : 0 },
      leads: { atual: totalLeads, anterior: totalLeadsAnt, delta: totalLeadsAnt > 0 ? Math.round(((totalLeads - totalLeadsAnt) / totalLeadsAnt) * 1000) / 10 : 0 },
    },
    melhores: ranking.slice(0, 3),
    piores: ranking.slice(-3).reverse(),
    alertasAtivos: (alertasAbertos || []).length,
    otimizacoes: (otimizacoes || []).length,
  })
}
