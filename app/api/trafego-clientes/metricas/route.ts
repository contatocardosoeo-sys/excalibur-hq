import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clinicaId = url.searchParams.get('clinica_id')
  const dias = Number(url.searchParams.get('dias') || 7)

  const inicio = new Date()
  inicio.setDate(inicio.getDate() - dias)
  const iso = inicio.toISOString().split('T')[0]

  let query = sb.from('trafego_metricas').select('*').gte('data', iso).order('data', { ascending: false })
  if (clinicaId) query = query.eq('clinica_id', clinicaId)

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metricas: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const leads = Number(body.leads || 0)
  const investimento = Number(body.investimento || 0)
  const cpl = leads > 0 ? Math.round((investimento / leads) * 100) / 100 : 0
  const cliques = Number(body.cliques || 0)
  const impressoes = Number(body.impressoes || 0)
  const cpc = cliques > 0 ? Math.round((investimento / cliques) * 100) / 100 : 0
  const ctr = impressoes > 0 ? Math.round((cliques / impressoes) * 10000) / 100 : 0

  // Pegar gestor_id do vínculo da clínica se não informado
  let gestorId = body.gestor_id || null
  if (!gestorId) {
    const { data: v } = await sb.from('trafego_clinica').select('gestor_id, meta_cpl').eq('clinica_id', body.clinica_id).maybeSingle()
    gestorId = v?.gestor_id || null
  }

  const { data, error } = await sb.from('trafego_metricas').upsert({
    clinica_id: body.clinica_id,
    gestor_id: gestorId,
    data: body.data || new Date().toISOString().split('T')[0],
    leads, investimento, cpl, cpc, ctr,
    impressoes, cliques,
    alcance: Number(body.alcance || 0),
    frequencia: Number(body.frequencia || 0),
  }, { onConflict: 'clinica_id,data' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gerar alertas automáticos
  const alertasCriados: Array<{ tipo: string; prioridade: string }> = []

  const { data: vinc } = await sb.from('trafego_clinica').select('meta_cpl, meta_leads').eq('clinica_id', body.clinica_id).maybeSingle()
  const metaCpl = Number(vinc?.meta_cpl || 0)

  // Regra 1: CPL > 2x meta = crítico
  if (metaCpl > 0 && cpl > metaCpl * 2) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id,
      gestor_id: gestorId,
      tipo: 'cpl_alto',
      titulo: 'CPL 2x acima da meta',
      descricao: `CPL de R$ ${cpl} vs meta de R$ ${metaCpl}`,
      prioridade: 'critica',
    })
    alertasCriados.push({ tipo: 'cpl_alto', prioridade: 'critica' })
  }
  // Regra 2: CPL > meta = alta
  else if (metaCpl > 0 && cpl > metaCpl) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id,
      gestor_id: gestorId,
      tipo: 'cpl_alto',
      titulo: 'CPL acima da meta',
      descricao: `CPL de R$ ${cpl} vs meta de R$ ${metaCpl}`,
      prioridade: 'alta',
    })
    alertasCriados.push({ tipo: 'cpl_alto', prioridade: 'alta' })
  }

  // Regra 3: 0 leads com investimento > 0 = crítico
  if (leads === 0 && investimento > 0) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id,
      gestor_id: gestorId,
      tipo: 'sem_leads',
      titulo: 'Zero leads com investimento ativo',
      descricao: `R$ ${investimento} investido sem retorno de leads`,
      prioridade: 'critica',
    })
    alertasCriados.push({ tipo: 'sem_leads', prioridade: 'critica' })
  }

  return NextResponse.json({ success: true, data, alertas_gerados: alertasCriados })
}
