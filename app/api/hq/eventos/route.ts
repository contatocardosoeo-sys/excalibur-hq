import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') || 50)
  const camada = searchParams.get('camada')
  const tipo = searchParams.get('tipo')

  let query = supabase
    .from('eventos_hq')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500))

  if (camada) query = query.eq('camada', camada)
  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ eventos: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (!body.tipo || !body.titulo || !body.mensagem) {
    return NextResponse.json({ error: 'tipo, titulo e mensagem sao obrigatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('eventos_hq')
    .insert({
      tipo: body.tipo,
      titulo: body.titulo,
      mensagem: body.mensagem,
      usuario_nome: body.usuario_nome || null,
      valor: body.valor ?? null,
      camada: body.camada || 'todos',
      roles_visibilidade: body.roles_visibilidade || [],
      metadata: body.metadata || {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
