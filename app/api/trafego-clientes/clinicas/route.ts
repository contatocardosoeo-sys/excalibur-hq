import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const hoje = new Date().toISOString().split('T')[0]

  const [
    { data: clinicas },
    { data: vinculos },
    { data: gestores },
    { data: metricasHoje },
    { data: alertasAbertos },
  ] = await Promise.all([
    sb.from('clinicas').select('id, nome, fase, cs_responsavel, mrr, status'),
    sb.from('trafego_clinica').select('*'),
    sb.from('gestores_trafego').select('id, nome'),
    sb.from('trafego_metricas').select('*').eq('data', hoje),
    sb.from('trafego_alertas').select('*').eq('status', 'aberto'),
  ])

  const vincMap = Object.fromEntries((vinculos || []).map(v => [v.clinica_id, v]))
  const gestoresMap = Object.fromEntries((gestores || []).map(g => [g.id, g.nome]))
  const metricasMap = Object.fromEntries((metricasHoje || []).map(m => [m.clinica_id, m]))

  const alertasPorClinica: Record<string, number> = {}
  ;(alertasAbertos || []).forEach(a => {
    if (a.clinica_id) alertasPorClinica[a.clinica_id] = (alertasPorClinica[a.clinica_id] || 0) + 1
  })

  const lista = (clinicas || []).map(c => {
    const v = vincMap[c.id]
    const m = metricasMap[c.id]
    const statusTrafego = !v ? 'sem_gestor' : v.status
    return {
      id: c.id,
      nome: c.nome,
      fase: c.fase,
      cs_responsavel: c.cs_responsavel,
      mrr: Number(c.mrr || 0),
      gestor_id: v?.gestor_id || null,
      gestor_nome: v ? (gestoresMap[v.gestor_id] || null) : null,
      plataforma: v?.plataforma || null,
      investimento_mensal: Number(v?.investimento_mensal || 0),
      meta_leads: v?.meta_leads || 0,
      meta_cpl: Number(v?.meta_cpl || 0),
      status_trafego: statusTrafego,
      leads_hoje: m?.leads || 0,
      cpl_hoje: Number(m?.cpl || 0),
      investimento_hoje: Number(m?.investimento || 0),
      alertas_count: alertasPorClinica[c.id] || 0,
    }
  })

  return NextResponse.json({ clinicas: lista })
}
