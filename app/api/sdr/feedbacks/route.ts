import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const sdr_email = req.nextUrl.searchParams.get('email')
  const limit = Number(req.nextUrl.searchParams.get('limit') || 30)

  let query = supabase.from('sdr_feedbacks').select('*').order('data', { ascending: false }).limit(limit)
  if (sdr_email) query = query.eq('sdr_email', sdr_email)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('sdr_feedbacks').insert({
    data: body.data || new Date().toISOString().split('T')[0],
    sdr_email: body.sdr_email || 'trindade.excalibur@gmail.com',
    tipo: body.tipo || 'diario',
    o_que_funcionou: body.o_que_funcionou || null,
    o_que_nao_funcionou: body.o_que_nao_funcionou || null,
    bloqueios: body.bloqueios || null,
    ideias: body.ideias || null,
    humor: Number(body.humor) || 5,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
