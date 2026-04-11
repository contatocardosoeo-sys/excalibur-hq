import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularScore, limparNomeClinica } from '../../../lib/trafego-clientes'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const hoje = new Date()
  const hojeIso = hoje.toISOString().split('T')[0]
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const seteDias = new Date(hoje)
  seteDias.setDate(seteDias.getDate() - 7)
  const seteDiasIso = seteDias.toISOString().split('T')[0]

  const [
    { data: clinicas },
    { data: vinculos },
    { data: gestores },
    { data: metricasHoje },
    { data: metricasMes },
    { data: metricas7d },
    { data: alertasAbertos },
  ] = await Promise.all([
    sb.from('clinicas').select('id, nome, fase, cs_responsavel, mrr, status'),
    sb.from('trafego_clinica').select('*'),
    sb.from('gestores_trafego').select('id, nome'),
    sb.from('trafego_metricas').select('*').eq('data', hojeIso),
    sb.from('trafego_metricas').select('clinica_id, leads, investimento, cpl, data').gte('data', inicioMes),
    sb.from('trafego_metricas').select('clinica_id, cpl, data').gte('data', seteDiasIso).order('data'),
    sb.from('trafego_alertas').select('*').eq('status', 'aberto'),
  ])

  const vincMap = Object.fromEntries((vinculos || []).map(v => [v.clinica_id, v]))
  const gestoresMap = Object.fromEntries((gestores || []).map(g => [g.id, g.nome]))
  const metricasHojeMap = Object.fromEntries((metricasHoje || []).map(m => [m.clinica_id, m]))

  // Agregar mês por clínica
  const mesMap: Record<string, { leads: number; investimento: number; cpl: number; ultimaData: string | null }> = {}
  ;(metricasMes || []).forEach(m => {
    const id = m.clinica_id as string
    if (!mesMap[id]) mesMap[id] = { leads: 0, investimento: 0, cpl: 0, ultimaData: null }
    mesMap[id].leads += Number(m.leads || 0)
    mesMap[id].investimento += Number(m.investimento || 0)
    if (!mesMap[id].ultimaData || m.data > mesMap[id].ultimaData) mesMap[id].ultimaData = m.data
  })
  Object.values(mesMap).forEach(m => {
    m.cpl = m.leads > 0 ? Math.round((m.investimento / m.leads) * 100) / 100 : 0
  })

  // Sparkline 7 dias por clínica
  const sparkMap: Record<string, number[]> = {}
  ;(metricas7d || []).forEach(m => {
    const id = m.clinica_id as string
    if (!sparkMap[id]) sparkMap[id] = []
    sparkMap[id].push(Number(m.cpl || 0))
  })

  const alertasPorClinica: Record<string, number> = {}
  ;(alertasAbertos || []).forEach(a => {
    if (a.clinica_id) alertasPorClinica[a.clinica_id] = (alertasPorClinica[a.clinica_id] || 0) + 1
  })

  const lista = (clinicas || []).map(c => {
    const v = vincMap[c.id]
    const mHoje = metricasHojeMap[c.id]
    const mes = mesMap[c.id] || { leads: 0, investimento: 0, cpl: 0, ultimaData: null }
    const statusTrafego = !v ? 'sem_gestor' : v.status

    const score = v ? calcularScore({
      meta_cpl: Number(v.meta_cpl || 0),
      cpl_medio_mes: mes.cpl,
      meta_leads: Number(v.meta_leads || 0),
      leads_mes: mes.leads,
      ultima_otimizacao: v.ultima_otimizacao || null,
      ultima_data_metrica: mes.ultimaData,
      status: v.status,
    }) : 0

    return {
      id: c.id,
      nome: c.nome,
      nome_limpo: limparNomeClinica(c.nome),
      fase: c.fase,
      cs_responsavel: c.cs_responsavel,
      mrr: Number(c.mrr || 0),
      gestor_id: v?.gestor_id || null,
      gestor_nome: v ? (gestoresMap[v.gestor_id] || null) : null,
      plataforma: v?.plataforma || null,
      especialidade: v?.especialidade || null,
      ticket_medio: Number(v?.ticket_medio || 0),
      investimento_mensal: Number(v?.investimento_mensal || 0),
      meta_leads: v?.meta_leads || 0,
      meta_cpl: Number(v?.meta_cpl || 0),
      meta_agendamentos: v?.meta_agendamentos || 0,
      ciclo_criativo_dias: v?.ciclo_criativo_dias || 14,
      ultima_otimizacao: v?.ultima_otimizacao || null,
      status_trafego: statusTrafego,
      leads_hoje: mHoje?.leads || 0,
      cpl_hoje: Number(mHoje?.cpl || 0),
      investimento_hoje: Number(mHoje?.investimento || 0),
      leads_mes: mes.leads,
      investimento_mes: mes.investimento,
      cpl_mes: mes.cpl,
      score,
      sparkline_7d: sparkMap[c.id] || [],
      alertas_count: alertasPorClinica[c.id] || 0,
    }
  })

  return NextResponse.json({ clinicas: lista })
}
