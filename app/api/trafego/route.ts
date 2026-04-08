import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const [{ data: campanhas }, { data: diario }] = await Promise.all([
    supabase.from('campanhas_trafego').select('*').order('created_at', { ascending: false }),
    supabase.from('leads_trafego_diario').select('*').order('data', { ascending: false }).limit(30),
  ])

  const items = campanhas || []
  const totalLeads = items.reduce((s, c) => s + (c.leads_gerados || 0), 0)
  const totalInvest = items.reduce((s, c) => s + Number(c.investimento_total || 0), 0)
  const cplMedio = totalLeads > 0 ? totalInvest / totalLeads : 0
  const roas = totalInvest > 0 ? totalLeads * 50 / totalInvest : 0 // estimativa

  return NextResponse.json({
    campanhas: items,
    diario: diario || [],
    kpis: { totalLeads, cplMedio: Math.round(cplMedio * 100) / 100, totalInvest, roas: Math.round(roas * 100) / 100 },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('campanhas_trafego').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  const { data, error } = await supabase.from('campanhas_trafego').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
