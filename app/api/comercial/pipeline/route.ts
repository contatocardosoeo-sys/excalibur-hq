import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'guilherme.excalibur@gmail.com'
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const [{ data: pipeline }, { data: metas }, { data: funilMensal }] = await Promise.all([
    supabase.from('pipeline_closer').select('*').order('created_at', { ascending: false }),
    supabase.from('metas_closer').select('*').eq('closer_email', email).eq('mes', mes).eq('ano', ano).maybeSingle(),
    supabase.from('funil_trafego').select('*').eq('mes', mes).eq('ano', ano).maybeSingle(),
  ])

  const items = pipeline || []

  // Reunioes do mes = todas que ja agendaram/avancaram (status reuniao_agendada/proposta/fechado)
  let reunioesSemana = items.filter(p => ['reuniao_agendada', 'proposta_enviada', 'fechado'].includes(p.status)).length
  let propostasEnviadas = items.filter(p => p.status === 'proposta_enviada').length
  let fechamentos = items.filter(p => p.status === 'fechado').length
  let mrrMes = items.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  // Fallback: se pipeline_closer esta vazio, usar funil_trafego (Guilherme preenche manualmente)
  if (items.length === 0 && funilMensal) {
    reunioesSemana = funilMensal.reunioes_realizadas || 0
    fechamentos = funilMensal.fechamentos || 0
    mrrMes = Number(funilMensal.faturamento) || 0
  }

  const totalReunioes = Math.max(reunioesSemana, items.length)

  return NextResponse.json({
    pipeline: items,
    kpis: { reunioesSemana, propostasEnviadas, fechamentos, mrrMes },
    metas: metas ? {
      reunioes: { atual: totalReunioes, meta: metas.meta_reunioes },
      fechamentos: { atual: fechamentos, meta: metas.meta_fechamentos },
      mrr: { atual: mrrMes, meta: Number(metas.meta_mrr) },
      comissao_pct: Number(metas.comissao_pct),
      comissao_valor: mrrMes * Number(metas.comissao_pct) / 100,
    } : null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('pipeline_closer').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const { data, error } = await supabase.from('pipeline_closer').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
