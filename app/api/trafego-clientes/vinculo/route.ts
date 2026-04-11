import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb.from('trafego_clinica').upsert({
    clinica_id: body.clinica_id,
    gestor_id: body.gestor_id || null,
    plataforma: body.plataforma || 'meta',
    investimento_mensal: Number(body.investimento_mensal || 0),
    meta_leads: Number(body.meta_leads || 0),
    meta_cpl: Number(body.meta_cpl || 0),
    status: body.status || 'ativo',
    observacoes: body.observacoes || null,
  }, { onConflict: 'clinica_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, ...updates } = body
  const { data, error } = await sb.from('trafego_clinica').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
