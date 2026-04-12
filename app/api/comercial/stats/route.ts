import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { COMERCIAL_METAS, RECEITA_METAS, META_ATIVA } from '../../../lib/config'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const mesAtual = new Date().getMonth() + 1
  const anoAtual = new Date().getFullYear()

  const [{ data: pipeline }, { data: metas }, { data: funilMensal }] = await Promise.all([
    supabase.from('pipeline_closer').select('*'),
    supabase.from('metas_closer').select('*').eq('mes', mesAtual).eq('ano', anoAtual).maybeSingle(),
    supabase.from('funil_trafego').select('*').eq('mes', mesAtual).eq('ano', anoAtual).maybeSingle(),
  ])

  const all = pipeline || []
  let reunioes = all.filter(p => ['reuniao_agendada', 'proposta_enviada', 'fechado'].includes(p.status)).length
  let fechamentos = all.filter(p => p.status === 'fechado').length
  let mrr = all.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  // Fallback para funil_trafego quando pipeline_closer esta vazio
  // (Guilherme ainda preenche os numeros de fechamento manualmente no funil do mes)
  if (all.length === 0 && funilMensal) {
    reunioes = funilMensal.reunioes_realizadas || 0
    fechamentos = funilMensal.fechamentos || 0
    mrr = Number(funilMensal.faturamento) || 0
  }

  const cincoAtras = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  const esfriando = all.filter(p => !['fechado', 'perdido'].includes(p.status) && (p.updated_at || '') < cincoAtras)

  return NextResponse.json({
    total_propostas: all.length,
    reunioes,
    fechamentos,
    mrr_gerado: mrr,
    // Metas vêm do config (fonte única) — NÃO mais da tabela metas_closer
    meta_reunioes: COMERCIAL_METAS.reunioes_mes,       // 150
    meta_fechamentos: COMERCIAL_METAS.fechamentos_mes, // 45
    meta_mrr: COMERCIAL_METAS.mrr_meta,                // 90000
    comissao_pct: COMERCIAL_METAS.comissao_pct,
    fonte_fallback: all.length === 0 && funilMensal ? 'funil_trafego' : 'pipeline_closer',
    fonte_metas: 'config.ts (funil alvo R$90k)',
    esfriando: esfriando.map(p => ({ nome: p.nome_clinica || 'Clinica', dias: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000) })),
  })
}
