import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET — lista presenças ativas (ping < 5min)
export async function GET() {
  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('escritorio_presenca')
    .select('*')
    .gte('ultimo_ping', cincoMinAtras)
    .order('user_nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presencas: data || [] })
}

// POST — upsert da presença do usuário (ping a cada 10s)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, role, nome, status, sala, posX, posY } = body

  if (!email || !role || !nome) {
    return NextResponse.json({ error: 'email, role e nome obrigatorios' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('escritorio_presenca')
    .upsert({
      user_email: email,
      user_role: role,
      user_nome: nome,
      status: status || 'online',
      sala_atual: sala || 'Corredor',
      pos_x: typeof posX === 'number' ? posX : 18,
      pos_y: typeof posY === 'number' ? posY : 14,
      ultimo_ping: new Date().toISOString(),
    }, { onConflict: 'user_email' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ presenca: data })
}
