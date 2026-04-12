import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { userEmail, missaoId } = await req.json()
  if (!missaoId) return NextResponse.json({ error: 'missaoId obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {
    concluida: true,
    concluida_em: new Date().toISOString(),
  }

  const { error } = await sb
    .from('missoes_diarias')
    .update(updates)
    .eq('id', missaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
