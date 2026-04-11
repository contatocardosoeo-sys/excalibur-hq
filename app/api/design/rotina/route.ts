import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

  const { data, error } = await sb
    .from('design_rotina')
    .select('*')
    .eq('user_email', email)
    .order('ordem')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rotina: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb.from('design_rotina').insert({
    user_email: body.user_email,
    ordem: body.ordem || 99,
    hora: body.hora,
    titulo: body.titulo,
    descricao: body.descricao,
    duracao_min: body.duracao_min,
    categoria: body.categoria,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })
  const { error } = await sb.from('design_rotina').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
