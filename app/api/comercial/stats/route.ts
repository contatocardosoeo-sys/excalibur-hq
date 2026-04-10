import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const [{ data: pipeline }, { data: metas }] = await Promise.all([
    supabase.from('pipeline_closer').select('*'),
    supabase.from('metas_closer').select('*').eq('mes', mesAtual).eq('ano', anoAtual).single(),
  ])

  const all = pipeline || []
  const reunioes = all.filter(p => ['reuniao_agendada', 'proposta_enviada', 'fechado'].includes(p.status)).length
  const fechamentos = all.filter(p => p.status === 'fechado').length
  const mrr = all.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  const cincoAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const esfriando = all.filter(p => !['fechado', 'perdido'].includes(p.status) && (p.updated_at || '') < cincoAtras)

  return NextResponse.json({
    total_propostas: all.length,
    reunioes,
    fechamentos,
    mrr_gerado: mrr,
    meta_reunioes: metas?.meta_reunioes || 20,
    meta_fechamentos: metas?.meta_fechamentos || 5,
    meta_mrr: metas?.meta_mrr || 10000,
    esfriando: esfriando.map(p => ({ nome: p.nome_clinica || 'Clinica', dias: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000) })),
  })
}
