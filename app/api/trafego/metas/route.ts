import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data, error } = await supabase.from('metas_trafego').select('*').order('nome')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metas: data })
}

export async function PATCH(req: NextRequest) {
  const { nome, meta_minima, meta_boa, meta_excelente } = await req.json()
  const updates: Record<string, unknown> = {}
  if (meta_minima !== undefined) updates.meta_minima = meta_minima
  if (meta_boa !== undefined) updates.meta_boa = meta_boa
  if (meta_excelente !== undefined) updates.meta_excelente = meta_excelente

  const { data, error } = await supabase.from('metas_trafego').update(updates).eq('nome', nome).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
