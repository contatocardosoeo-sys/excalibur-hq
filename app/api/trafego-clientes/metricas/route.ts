import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const clinicaId = url.searchParams.get('clinica_id')
  const dias = Number(url.searchParams.get('dias') || 7)

  const inicio = new Date()
  inicio.setDate(inicio.getDate() - dias)
  const iso = inicio.toISOString().split('T')[0]

  let query = sb.from('trafego_metricas').select('*').gte('data', iso).order('data', { ascending: false })
  if (clinicaId) query = query.eq('clinica_id', clinicaId)

  const { data, error } = await query.limit(500)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ metricas: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const leads = Number(body.leads || 0)
  const investimento = Number(body.investimento || 0)
  const cpl = leads > 0 ? Math.round((investimento / leads) * 100) / 100 : 0
  const cliques = Number(body.cliques || 0)
  const impressoes = Number(body.impressoes || 0)
  const cpc = cliques > 0 ? Math.round((investimento / cliques) * 100) / 100 : 0
  const ctr = impressoes > 0 ? Math.round((cliques / impressoes) * 10000) / 100 : 0

  const agendamentos = Number(body.agendamentos || 0)
  const comparecimentos = Number(body.comparecimentos || 0)
  const fechamentos = Number(body.fechamentos || 0)
  const receitaGerada = Number(body.receita_gerada || 0)
  const tempoRespostaMin = body.tempo_resposta_min != null && body.tempo_resposta_min !== '' ? Number(body.tempo_resposta_min) : null
  const ofertaRodando = body.oferta_rodando || null

  let gestorId = body.gestor_id || null
  let metaCpl = 0
  if (!gestorId) {
    const { data: v } = await sb.from('trafego_clinica').select('gestor_id, meta_cpl').eq('clinica_id', body.clinica_id).maybeSingle()
    gestorId = v?.gestor_id || null
    metaCpl = Number(v?.meta_cpl || 0)
  } else {
    const { data: v } = await sb.from('trafego_clinica').select('meta_cpl').eq('clinica_id', body.clinica_id).maybeSingle()
    metaCpl = Number(v?.meta_cpl || 0)
  }

  const { data, error } = await sb.from('trafego_metricas').upsert({
    clinica_id: body.clinica_id,
    gestor_id: gestorId,
    data: body.data || new Date().toISOString().split('T')[0],
    leads, investimento, cpl, cpc, ctr,
    impressoes, cliques,
    alcance: Number(body.alcance || 0),
    frequencia: Number(body.frequencia || 0),
    agendamentos, comparecimentos, fechamentos,
    receita_gerada: receitaGerada,
    tempo_resposta_min: tempoRespostaMin,
    oferta_rodando: ofertaRodando,
  }, { onConflict: 'clinica_id,data' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const alertasCriados: Array<{ tipo: string; prioridade: string }> = []

  // CPL > 2x meta = crítico
  if (metaCpl > 0 && cpl > metaCpl * 2) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id, gestor_id: gestorId,
      tipo: 'cpl_alto',
      titulo: 'CPL 2x acima da meta',
      descricao: `CPL de R$ ${cpl} vs meta de R$ ${metaCpl}`,
      prioridade: 'critica',
    })
    alertasCriados.push({ tipo: 'cpl_alto', prioridade: 'critica' })
  } else if (metaCpl > 0 && cpl > metaCpl) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id, gestor_id: gestorId,
      tipo: 'cpl_alto',
      titulo: 'CPL acima da meta',
      descricao: `CPL de R$ ${cpl} vs meta de R$ ${metaCpl}`,
      prioridade: 'alta',
    })
    alertasCriados.push({ tipo: 'cpl_alto', prioridade: 'alta' })
  }

  // 0 leads com investimento
  if (leads === 0 && investimento > 0) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id, gestor_id: gestorId,
      tipo: 'sem_leads',
      titulo: 'Zero leads com investimento ativo',
      descricao: `R$ ${investimento} investido sem retorno de leads`,
      prioridade: 'critica',
    })
    alertasCriados.push({ tipo: 'sem_leads', prioridade: 'critica' })
  }

  // Velocidade de resposta lenta nos últimos 3 lançamentos
  if (tempoRespostaMin != null && tempoRespostaMin > 30) {
    const { data: ultimas } = await sb
      .from('trafego_metricas')
      .select('tempo_resposta_min, data')
      .eq('clinica_id', body.clinica_id)
      .not('tempo_resposta_min', 'is', null)
      .order('data', { ascending: false })
      .limit(3)

    if ((ultimas || []).length === 3 && ultimas!.every(u => Number(u.tempo_resposta_min || 0) > 30)) {
      await sb.from('trafego_alertas').insert({
        clinica_id: body.clinica_id, gestor_id: gestorId,
        tipo: 'resposta_lenta',
        titulo: 'Resposta lenta há 3 lançamentos',
        descricao: `Tempo médio de resposta acima de 30 min — leads esfriando`,
        prioridade: 'alta',
      })
      alertasCriados.push({ tipo: 'resposta_lenta', prioridade: 'alta' })
    }
  }

  // ROI baixo (receita/investimento < 100%)
  if (receitaGerada > 0 && investimento > 0 && receitaGerada / investimento < 1) {
    await sb.from('trafego_alertas').insert({
      clinica_id: body.clinica_id, gestor_id: gestorId,
      tipo: 'roi_baixo',
      titulo: 'ROI abaixo de 100%',
      descricao: `Receita R$ ${receitaGerada} vs investimento R$ ${investimento}`,
      prioridade: 'media',
    })
    alertasCriados.push({ tipo: 'roi_baixo', prioridade: 'media' })
  }

  return NextResponse.json({ success: true, data, alertas_gerados: alertasCriados })
}
