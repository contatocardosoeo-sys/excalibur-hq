import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const { pipeline_id } = await req.json()

  const { data: item, error: pErr } = await supabase.from('pipeline_closer').select('*').eq('id', pipeline_id).single()
  if (pErr || !item) return NextResponse.json({ error: 'Oportunidade nao encontrada' }, { status: 404 })

  // Criar clínica
  const { data: clinica, error: cErr } = await supabase.from('clinicas').insert({
    nome: item.nome_clinica,
    plano: item.plano,
    valor_contrato: item.mrr_proposto,
    cs_responsavel: 'Bruno Medina',
    data_inicio: new Date().toISOString().split('T')[0],
    ativo: true,
  }).select().single()

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  return NextResponse.json({ success: true, clinica_id: clinica.id })
}
