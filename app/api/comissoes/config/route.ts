import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function GET() {
  const { data, error } = await sb
    .from('config_comissoes')
    .select('*')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PUT(req: NextRequest) {
  const body = await req.json()
  const allowed = [
    'closer_pct_venda',
    'sdr_valor_agendamento',
    'sdr_bonus_comparecimento',
    'sdr_bonus_venda',
    'bonus_equipe_patamar1_fech',
    'bonus_equipe_patamar1_closer',
    'bonus_equipe_patamar1_sdr',
    'bonus_equipe_patamar2_fech',
    'bonus_equipe_patamar2_closer',
    'bonus_equipe_patamar2_sdr',
    'atualizado_por',
  ] as const

  const updates: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] !== undefined) updates[k] = body[k]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nenhum campo para atualizar' }, { status: 400 })
  }
  updates.atualizado_em = new Date().toISOString()

  const { data: existente } = await sb
    .from('config_comissoes')
    .select('id')
    .order('atualizado_em', { ascending: false })
    .limit(1)
    .single()

  if (!existente) {
    const { data, error } = await sb.from('config_comissoes').insert(updates).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, config: data })
  }

  const { data, error } = await sb
    .from('config_comissoes')
    .update(updates)
    .eq('id', existente.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, config: data })
}
