import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data, error } = await sb.from('trafego_setup').select('*').order('criado_em', { ascending: false }).limit(1).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    respondido: !!data?.respondido_em,
    dados: data || null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await sb.from('trafego_setup').insert({
    respondido_em: new Date().toISOString(),
    respondido_por: body.respondido_por || 'jessica',
    q_gestores_count: body.q_gestores_count ? Number(body.q_gestores_count) : null,
    q_clinicas_por_gestor: body.q_clinicas_por_gestor || null,
    q_plataformas: body.q_plataformas || null,
    q_rotina_diaria: body.q_rotina_diaria || null,
    q_dados_hoje: body.q_dados_hoje || null,
    q_metricas_importantes: body.q_metricas_importantes || null,
    q_meta_padrao: body.q_meta_padrao || null,
    q_cpl_alvo: body.q_cpl_alvo ? Number(body.q_cpl_alvo) : null,
    q_definicao_bom: body.q_definicao_bom || null,
    q_fluxo_medina: body.q_fluxo_medina || null,
    q_saber_jornada: body.q_saber_jornada || null,
    q_trafego_pausado: body.q_trafego_pausado || null,
    q_planilha_atual: body.q_planilha_atual || null,
    q_relatorio_manual: body.q_relatorio_manual || null,
    q_integracao_api: body.q_integracao_api || null,
    q_dor_principal: body.q_dor_principal || null,
    q_mvp: body.q_mvp || null,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
