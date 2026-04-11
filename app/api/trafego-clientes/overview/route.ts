import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deltaPct } from '../../../lib/trafego-clientes'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().split('T')[0]
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().split('T')[0]

  const [
    { count: totalClinicas },
    { data: vinculos },
    { data: metricasMes },
    { data: metricasMesAnterior },
    { data: alertasAbertos },
  ] = await Promise.all([
    sb.from('clinicas').select('*', { count: 'exact', head: true }),
    sb.from('trafego_clinica').select('*'),
    sb.from('trafego_metricas').select('clinica_id, leads, investimento, cpl, data, fechamentos, receita_gerada').gte('data', inicioMes),
    sb.from('trafego_metricas').select('leads, investimento, fechamentos, receita_gerada').gte('data', inicioMesAnterior).lte('data', fimMesAnterior),
    sb.from('trafego_alertas').select('*').eq('status', 'aberto'),
  ])

  const vinc = vinculos || []
  const ativas = vinc.filter(v => v.status === 'ativo').length
  const pausadas = vinc.filter(v => v.status === 'pausado').length
  const setup = vinc.filter(v => v.status === 'setup').length
  const problema = vinc.filter(v => v.status === 'problema').length
  const comGestor = vinc.length
  const semGestor = (totalClinicas || 0) - comGestor
  const cobertura = totalClinicas && totalClinicas > 0 ? Math.round((comGestor / totalClinicas) * 100) : 0

  const m = metricasMes || []
  const investimentoMes = m.reduce((s, x) => s + Number(x.investimento || 0), 0)
  const leadsMes = m.reduce((s, x) => s + Number(x.leads || 0), 0)
  const fechamentosMes = m.reduce((s, x) => s + Number(x.fechamentos || 0), 0)
  const receitaMes = m.reduce((s, x) => s + Number(x.receita_gerada || 0), 0)
  const cplMedio = leadsMes > 0 ? Math.round((investimentoMes / leadsMes) * 100) / 100 : 0
  const cacMedio = fechamentosMes > 0 ? Math.round((investimentoMes / fechamentosMes) * 100) / 100 : 0
  const roiMes = investimentoMes > 0 ? Math.round((receitaMes / investimentoMes) * 100) : 0

  const mAnt = metricasMesAnterior || []
  const investimentoMesAnt = mAnt.reduce((s, x) => s + Number(x.investimento || 0), 0)
  const leadsMesAnt = mAnt.reduce((s, x) => s + Number(x.leads || 0), 0)
  const cplMedioAnt = leadsMesAnt > 0 ? Math.round((investimentoMesAnt / leadsMesAnt) * 100) / 100 : 0

  const deltaCpl = deltaPct(cplMedio, cplMedioAnt)
  const deltaLeads = deltaPct(leadsMes, leadsMesAnt)
  const deltaInv = deltaPct(investimentoMes, investimentoMesAnt)

  // Estimativa de potencial com as clínicas sem tráfego
  const leadsEstimadosPotencial = semGestor * (leadsMes / Math.max(1, ativas)) || 0
  const investPotencial = semGestor * (investimentoMes / Math.max(1, ativas)) || 0

  // CPL por clínica
  const porClinica: Record<string, { leads: number; investimento: number }> = {}
  m.forEach(x => {
    const id = x.clinica_id as string
    if (!porClinica[id]) porClinica[id] = { leads: 0, investimento: 0 }
    porClinica[id].leads += Number(x.leads || 0)
    porClinica[id].investimento += Number(x.investimento || 0)
  })
  const cplRanking = Object.entries(porClinica)
    .map(([id, d]) => ({ clinica_id: id, cpl: d.leads > 0 ? Math.round((d.investimento / d.leads) * 100) / 100 : 0, leads: d.leads, investimento: d.investimento }))
    .filter(x => x.leads > 0)
    .sort((a, b) => a.cpl - b.cpl)

  const plataformas: Record<string, number> = {}
  vinc.forEach(v => {
    const p = v.plataforma || 'meta'
    plataformas[p] = (plataformas[p] || 0) + 1
  })

  return NextResponse.json({
    kpis: {
      totalClinicas: totalClinicas || 0,
      comGestor, ativas, pausadas, setup, problema, semGestor, cobertura,
      investimentoMes, leadsMes, cplMedio, fechamentosMes, receitaMes, cacMedio, roiMes,
      alertasAtivos: alertasAbertos?.length || 0,
    },
    comparativo: {
      cpl: { atual: cplMedio, anterior: cplMedioAnt, ...deltaCpl },
      leads: { atual: leadsMes, anterior: leadsMesAnt, ...deltaLeads },
      investimento: { atual: investimentoMes, anterior: investimentoMesAnt, ...deltaInv },
    },
    potencial: {
      clinicasSemTrafego: semGestor,
      leadsEstimados: Math.round(leadsEstimadosPotencial),
      investimentoEstimado: Math.round(investPotencial),
    },
    distribuicao: { plataformas, status: { ativas, pausadas, setup, problema, semGestor } },
    ranking: {
      melhores: cplRanking.slice(0, 5),
      piores: cplRanking.slice(-5).reverse(),
    },
    alertas: alertasAbertos || [],
  })
}
