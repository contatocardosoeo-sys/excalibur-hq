import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { userEmail, pagina } = await req.json()
  await sb.from('tour_progresso').upsert(
    { user_email: userEmail, pagina, concluido: true, concluido_em: new Date().toISOString() },
    { onConflict: 'user_email,pagina' },
  )
  return NextResponse.json({ ok: true })
}
