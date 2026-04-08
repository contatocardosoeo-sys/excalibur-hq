import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data: leads } = await supabase.from('leads_sdr').select('*').order('created_at', { ascending: false })

  const hoje = new Date().toISOString().split('T')[0]
  const leadsHoje = (leads || []).filter(l => l.created_at?.startsWith(hoje)).length
  const contatosHoje = (leads || []).filter(l => l.status !== 'prospeccao' && l.data_contato === hoje).length
  const agendamentosHoje = (leads || []).filter(l => l.status === 'agendado' && l.data_reuniao === hoje).length
  const total = (leads || []).length
  const convertidos = (leads || []).filter(l => l.status === 'convertido' || l.status === 'reuniao_feita').length

  return NextResponse.json({
    leads: leads || [],
    kpis: { leadsHoje, contatosHoje, agendamentosHoje, taxaConversao: total > 0 ? Math.round((convertidos / total) * 100) : 0 },
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('leads_sdr').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()
  updates.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('leads_sdr').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
