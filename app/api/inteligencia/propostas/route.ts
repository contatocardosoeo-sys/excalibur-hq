import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data } = await sb.from('melhorias_propostas').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ propostas: data || [] })
}

export async function PATCH(req: NextRequest) {
  const { id, status, aprovada_por } = await req.json()
  const updates: Record<string, unknown> = { status }
  if (status === 'aprovada') {
    updates.aprovada_por = aprovada_por || 'ceo'
    updates.aprovada_em = new Date().toISOString()
  }
  const { data, error } = await sb.from('melhorias_propostas').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, proposta: data })
}
