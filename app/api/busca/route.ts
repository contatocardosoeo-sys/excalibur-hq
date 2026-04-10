import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim()
  if (q.length < 2) return NextResponse.json({ results: [] })

  const pattern = `%${q}%`

  const [clinicas, leads, pipeline, receber] = await Promise.all([
    supabase.from('clinicas').select('id, nome, plano, status').ilike('nome', pattern).limit(5),
    supabase.from('leads_sdr').select('id, nome, telefone, status').ilike('nome', pattern).limit(5),
    supabase.from('pipeline_closer').select('id, nome_clinica, status, plano').ilike('nome_clinica', pattern).limit(5),
    supabase.from('financeiro_receber').select('id, cliente_nome, plano, valor, status').ilike('cliente_nome', pattern).limit(5),
  ])

  const results = [
    ...(clinicas.data || []).map(c => ({ tipo: 'clinica', id: c.id, nome: c.nome, sub: c.plano || c.status, href: '/clientes' })),
    ...(leads.data || []).map(l => ({ tipo: 'lead', id: l.id, nome: l.nome, sub: l.status, href: '/sdr' })),
    ...(pipeline.data || []).map(p => ({ tipo: 'pipeline', id: p.id, nome: p.nome_clinica, sub: p.plano || p.status, href: '/comercial' })),
    ...(receber.data || []).map(r => ({ tipo: 'financeiro', id: r.id, nome: r.cliente_nome, sub: `R$${Number(r.valor).toFixed(0)} - ${r.status}`, href: '/operacao/financeiro' })),
  ]

  return NextResponse.json({ results })
}
