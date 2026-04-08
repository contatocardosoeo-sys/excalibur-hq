import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data: campanhas } = await supabase.from('campanhas_trafego').select('*').order('created_at', { ascending: false })

  const items = campanhas || []
  const totalLeads = items.reduce((s, c) => s + (c.leads || 0), 0)
  const totalInvest = items.reduce((s, c) => s + Number(c.investimento || 0), 0)
  const cplMedio = totalLeads > 0 ? Math.round((totalInvest / totalLeads) * 100) / 100 : 0
  const ativas = items.filter(c => c.status === 'ativa').length

  return NextResponse.json({
    campanhas: items,
    kpis: { totalLeads, cplMedio, totalInvest, ativas },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('campanhas_trafego').insert({
    nome: body.nome, canal: body.canal, investimento: Number(body.investimento) || 0,
    leads: 0, status: 'ativa', inicio: body.inicio || new Date().toISOString().split('T')[0],
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const { data, error } = await supabase.from('campanhas_trafego').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
