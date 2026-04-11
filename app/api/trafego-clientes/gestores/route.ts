import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const inicioMes = new Date()
  inicioMes.setDate(1)
  const iso = inicioMes.toISOString().split('T')[0]

  const [
    { data: gestores },
    { data: vinculos },
    { data: metricasMes },
    { data: alertasAbertos },
  ] = await Promise.all([
    sb.from('gestores_trafego').select('*').order('nome'),
    sb.from('trafego_clinica').select('clinica_id, gestor_id, status'),
    sb.from('trafego_metricas').select('gestor_id, leads, investimento').gte('data', iso),
    sb.from('trafego_alertas').select('gestor_id').eq('status', 'aberto'),
  ])

  const vinc = vinculos || []
  const metr = metricasMes || []
  const alertas = alertasAbertos || []

  const lista = (gestores || []).map(g => {
    const clinicasDoGestor = vinc.filter(v => v.gestor_id === g.id)
    const metricasDoGestor = metr.filter(m => m.gestor_id === g.id)
    const leads = metricasDoGestor.reduce((s, m) => s + Number(m.leads || 0), 0)
    const inv = metricasDoGestor.reduce((s, m) => s + Number(m.investimento || 0), 0)
    const cpl = leads > 0 ? Math.round((inv / leads) * 100) / 100 : 0
    const alertasCount = alertas.filter(a => a.gestor_id === g.id).length

    let performance: 'bom' | 'atencao' | 'critico' = 'bom'
    if (alertasCount >= 3 || cpl > 30) performance = 'critico'
    else if (alertasCount >= 1 || cpl > 20) performance = 'atencao'

    return {
      ...g,
      clinicas_count: clinicasDoGestor.length,
      ativas: clinicasDoGestor.filter(v => v.status === 'ativo').length,
      cpl_medio: cpl,
      investimento_mes: inv,
      leads_mes: leads,
      alertas_count: alertasCount,
      performance,
    }
  })

  return NextResponse.json({ gestores: lista })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb.from('gestores_trafego').insert({
    nome: body.nome,
    email: body.email || null,
    whatsapp: body.whatsapp || null,
    status: 'ativo',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
