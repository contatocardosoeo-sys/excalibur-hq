import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ notificacoes: [] })

  const { data } = await supabase
    .from('notificacoes_hq')
    .select('*')
    .eq('para_email', email)
    .eq('lida', false)
    .order('created_at', { ascending: false })
    .limit(20)

  return NextResponse.json({ notificacoes: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { id } = await req.json()
  await supabase.from('notificacoes_hq').update({ lida: true }).eq('id', id)
  return NextResponse.json({ success: true })
}

// Helper: criar notificação (chamado por outras APIs)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('notificacoes_hq').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
