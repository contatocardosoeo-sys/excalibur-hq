import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data: pipeline } = await supabase.from('pipeline_closer').select('*').order('created_at', { ascending: false })

  const semana = new Date(); semana.setDate(semana.getDate() - 7)
  const semanaStr = semana.toISOString().split('T')[0]
  const items = pipeline || []
  const reunioesSemana = items.filter(p => p.data_reuniao && p.data_reuniao >= semanaStr).length
  const propostasEnviadas = items.filter(p => p.status === 'proposta_enviada').length
  const fechamentos = items.filter(p => p.status === 'fechado').length
  const mrrMes = items.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  return NextResponse.json({
    pipeline: items,
    kpis: { reunioesSemana, propostasEnviadas, fechamentos, mrrMes },
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
