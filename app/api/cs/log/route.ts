import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const clinica_id = req.nextUrl.searchParams.get('clinica_id')
  const limit = Number(req.nextUrl.searchParams.get('limit') || 50)

  let query = supabase.from('log_atividades_cs').select('*').order('created_at', { ascending: false }).limit(limit)
  if (clinica_id) query = query.eq('clinica_id', clinica_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ items: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('log_atividades_cs').insert({
    clinica_id: body.clinica_id || null,
    clinica_nome: body.clinica_nome,
    tipo: body.tipo || 'contato',
    descricao: body.descricao,
    responsavel: body.responsavel || 'CS',
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
