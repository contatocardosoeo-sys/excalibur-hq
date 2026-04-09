import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'trindade.excalibur@gmail.com'
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const [{ data: leads }, { data: metas }, { data: campanhas }] = await Promise.all([
    supabase.from('leads_sdr').select('*').order('created_at', { ascending: false }),
    supabase.from('metas_sdr').select('*').eq('sdr_email', email).eq('mes', mes).eq('ano', ano).single(),
    supabase.from('campanhas_trafego').select('id, nome').eq('status', 'ativa').order('nome'),
  ])

  const all = leads || []
  const hoje = now.toISOString().split('T')[0]
  const totalLeads = all.length
  const contatosHoje = all.filter(l => l.status !== 'prospeccao' && l.data_contato === hoje).length
  const agendamentos = all.filter(l => ['agendado', 'reuniao_feita', 'convertido'].includes(l.status)).length
  const reunioes = all.filter(l => ['reuniao_feita', 'convertido'].includes(l.status)).length
  const conversoes = all.filter(l => l.status === 'convertido').length
  const taxaConversao = totalLeads > 0 ? Math.round((conversoes / totalLeads) * 100) : 0

  return NextResponse.json({
    leads: all,
    campanhas: campanhas || [],
    kpis: { totalLeads, contatosHoje, agendamentos, taxaConversao },
    metas: metas ? {
      leads: { atual: totalLeads, meta: metas.meta_leads },
      reunioes: { atual: reunioes, meta: metas.meta_reunioes },
      conversoes: { atual: conversoes, meta: metas.meta_conversoes },
    } : null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('leads_sdr').insert({
    nome: body.nome, cidade: body.cidade, responsavel_lead: body.responsavel_lead,
    telefone: body.telefone, origem: body.origem, proxima_acao: body.proxima_acao,
    observacoes: body.observacoes, campanha_id: body.campanha_id || null,
    data_contato: body.data_contato || new Date().toISOString().split('T')[0],
  }).select().single()
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
