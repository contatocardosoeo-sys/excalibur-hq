import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const mes = Number(req.nextUrl.searchParams.get('mes') || new Date().getMonth() + 1)
  const ano = Number(req.nextUrl.searchParams.get('ano') || new Date().getFullYear())

  const inicioMes = `${ano}-${String(mes).padStart(2, '0')}-01`
  const fimMes = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, '0')}-01`

  const { data, error } = await supabase
    .from('financeiro_receber')
    .select('*')
    .gte('data_vencimento', inicioMes)
    .lt('data_vencimento', fimMes)
    .order('data_vencimento', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = data || []
  const total_previsto = items.reduce((s, i) => s + Number(i.valor), 0)
  const total_recebido = items.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
  const total_pendente = items.filter(i => i.status === 'pendente').reduce((s, i) => s + Number(i.valor), 0)
  const total_atrasado = items.filter(i => i.status === 'atrasado').reduce((s, i) => s + Number(i.valor), 0)

  return NextResponse.json({ items, totais: { total_previsto, total_recebido, total_pendente, total_atrasado } })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('financeiro_receber').insert({
    data_vencimento: body.data_vencimento,
    cliente_nome: body.cliente_nome,
    clinica_id: body.clinica_id || null,
    plano: body.plano,
    valor: body.valor,
    observacao: body.observacao || null,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  updates.updated_at = new Date().toISOString()
  if (updates.status === 'pago' && !updates.data_pagamento) {
    updates.data_pagamento = new Date().toISOString().split('T')[0]
  }
  const { data, error } = await supabase.from('financeiro_receber').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
