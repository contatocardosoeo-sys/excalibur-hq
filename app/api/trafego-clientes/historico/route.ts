import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clinicaId = url.searchParams.get('clinica_id')
  if (!clinicaId) return NextResponse.json({ error: 'clinica_id obrigatório' }, { status: 400 })

  const trintaDiasAtras = new Date()
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30)
  const iso30 = trintaDiasAtras.toISOString().split('T')[0]

  const [
    { data: metricas30d },
    { data: otimizacoes },
    { data: alertas },
    { data: clinica },
    { data: vinculo },
  ] = await Promise.all([
    sb.from('trafego_metricas').select('*').eq('clinica_id', clinicaId).gte('data', iso30).order('data'),
    sb.from('trafego_otimizacoes').select('*').eq('clinica_id', clinicaId).order('data', { ascending: false }).limit(10),
    sb.from('trafego_alertas').select('*').eq('clinica_id', clinicaId).eq('status', 'aberto'),
    sb.from('clinicas').select('id, nome, fase, cs_responsavel, mrr').eq('id', clinicaId).maybeSingle(),
    sb.from('trafego_clinica').select('*, gestores_trafego(nome, whatsapp, email)').eq('clinica_id', clinicaId).maybeSingle(),
  ])

  return NextResponse.json({
    clinica,
    vinculo,
    metricas: metricas30d || [],
    ultimosLancamentos: (metricas30d || []).slice(-7).reverse(),
    otimizacoes: otimizacoes || [],
    alertas: alertas || [],
  })
}
