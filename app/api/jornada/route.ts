import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const clinica_id = req.nextUrl.searchParams.get('clinica_id')

  // DETALHE de uma clínica
  if (clinica_id) {
    const [
      { data: clinica },
      { data: tarefas },
      { data: jornada },
    ] = await Promise.all([
      supabase.from('clinicas').select('*').eq('id', clinica_id).single(),
      supabase.from('tarefas_jornada').select('*').eq('clinica_id', clinica_id).order('prazo_dia'),
      supabase.from('jornada_clinica').select('*').eq('clinica_id', clinica_id).single(),
    ])

    const total = tarefas?.length || 0
    const concluidas = tarefas?.filter((t: { status: string }) => t.status === 'concluida').length || 0
    const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0

    return NextResponse.json({ clinica, tarefas, jornada, progresso, total, concluidas })
  }

  // CARTEIRA COMPLETA
  const { data: clinicas } = await supabase
    .from('clinicas')
    .select('id, nome, data_inicio, cs_responsavel, ativo')
    .eq('ativo', true)
    .order('nome')

  if (!clinicas || clinicas.length === 0) {
    return NextResponse.json({ carteira: [], kpis: { total: 0, onboarding: 0, adocao: 0, consolidacao: 0, retencao: 0, emRisco: 0, atrasados: 0, semInteracao: 0, alertasCriticos: 0 } })
  }

  const hoje = new Date().toISOString().split('T')[0]

  const carteira = await Promise.all(
    clinicas.map(async (clinica) => {
      const [
        { data: jornada },
        { data: adocao },
        { data: alertas },
        { data: tarefas },
        { data: funil },
      ] = await Promise.all([
        supabase.from('jornada_clinica').select('etapa, dias_na_plataforma, notas').eq('clinica_id', clinica.id).single(),
        supabase.from('adocao_clinica').select('score, classificacao').eq('clinica_id', clinica.id).order('created_at', { ascending: false }).limit(1).single(),
        supabase.from('alertas_clinica').select('id, tipo, nivel').eq('clinica_id', clinica.id).eq('resolvido', false),
        supabase.from('tarefas_jornada').select('status, prazo_dia, data_prazo, fase').eq('clinica_id', clinica.id),
        supabase.from('funil_diario').select('data, leads, fechamentos, taxa_agendamento, taxa_fechamento').eq('clinica_id', clinica.id).order('data', { ascending: false }).limit(7),
      ])

      const dias = jornada?.dias_na_plataforma || 0
      const score = adocao?.score || 0
      const totalAlertas = alertas?.length || 0
      const alertasCriticos = alertas?.filter(a => a.nivel === 3).length || 0

      let faseMacro = 'D0-D7'
      if (dias > 30) faseMacro = 'D30+'
      else if (dias > 15) faseMacro = 'D15-D30'
      else if (dias > 7) faseMacro = 'D7-D15'

      const tarefasAtrasadas = tarefas?.filter(t =>
        t.status !== 'concluida' && t.data_prazo && t.data_prazo < hoje
      ).length || 0

      let gargalo = 'Sem gargalo identificado'
      const ultimoFunil = funil?.[0]
      if (!ultimoFunil || !ultimoFunil.leads) gargalo = 'Marketing'
      else if (ultimoFunil.taxa_agendamento && Number(ultimoFunil.taxa_agendamento) < 30) gargalo = 'Atendimento / Comercial'
      else if (ultimoFunil.taxa_fechamento && Number(ultimoFunil.taxa_fechamento) < 30) gargalo = 'Conversão'
      else if (score < 40) gargalo = 'Adoção / Execução'

      const ultimaInteracao = jornada?.notas
        ? String(jornada.notas).split('\n').pop()?.slice(0, 50) || null
        : null

      let status: 'saudavel' | 'atencao' | 'risco' = 'saudavel'
      if (score < 60 || alertasCriticos > 0 || tarefasAtrasadas > 2) status = 'risco'
      else if (score < 80 || totalAlertas > 0 || tarefasAtrasadas > 0) status = 'atencao'

      const proximaTarefa = tarefas
        ?.filter(t => t.status === 'pendente' || t.status === 'em_andamento')
        ?.sort((a, b) => a.prazo_dia - b.prazo_dia)?.[0]

      return {
        id: clinica.id,
        nome: clinica.nome,
        data_inicio: clinica.data_inicio,
        cs_responsavel: clinica.cs_responsavel,
        dias, faseMacro,
        etapa: jornada?.etapa || 'D0_NOVO',
        score, classificacao: adocao?.classificacao || 'RISCO',
        status, totalAlertas, alertasCriticos, tarefasAtrasadas,
        gargalo, ultimaInteracao,
        proximaAcao: proximaTarefa ? `D${proximaTarefa.prazo_dia}: ${proximaTarefa.fase}` : 'Sem tarefas pendentes',
        progresso: tarefas?.length
          ? Math.round((tarefas.filter(t => t.status === 'concluida').length / tarefas.length) * 100)
          : 0,
      }
    })
  )

  const kpis = {
    total: carteira.length,
    onboarding: carteira.filter(c => c.faseMacro === 'D0-D7').length,
    adocao: carteira.filter(c => c.faseMacro === 'D7-D15').length,
    consolidacao: carteira.filter(c => c.faseMacro === 'D15-D30').length,
    retencao: carteira.filter(c => c.faseMacro === 'D30+').length,
    emRisco: carteira.filter(c => c.status === 'risco').length,
    atrasados: carteira.filter(c => c.tarefasAtrasadas > 0).length,
    semInteracao: carteira.filter(c => !c.ultimaInteracao && c.dias > 5).length,
    alertasCriticos: carteira.reduce((acc, c) => acc + c.alertasCriticos, 0),
  }

  const ordenados = carteira.sort((a, b) => {
    const prioA = (a.status === 'risco' ? 0 : a.status === 'atencao' ? 1 : 2) * 100 + (a.alertasCriticos > 0 ? 0 : 10) + (a.tarefasAtrasadas * 2)
    const prioB = (b.status === 'risco' ? 0 : b.status === 'atencao' ? 1 : 2) * 100 + (b.alertasCriticos > 0 ? 0 : 10) + (b.tarefasAtrasadas * 2)
    return prioA - prioB
  })

  return NextResponse.json({ carteira: ordenados, kpis })
}

export async function PATCH(req: NextRequest) {
  const { tarefa_id, status, clinica_id } = await req.json()

  const { data, error } = await supabase
    .from('tarefas_jornada')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', tarefa_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (status === 'concluida' && data.titulo?.includes('Marco D7')) {
    await supabase.from('jornada_clinica').update({ etapa: 'D7_ATIVADO' }).eq('clinica_id', clinica_id)
  }
  if (status === 'concluida' && data.titulo?.includes('Marco D15')) {
    await supabase.from('jornada_clinica').update({ etapa: 'D15_MARCO' }).eq('clinica_id', clinica_id)
  }
  if (status === 'concluida' && data.titulo?.includes('Marco D30')) {
    await supabase.from('jornada_clinica').update({ etapa: 'D30_CLASSIFICACAO' }).eq('clinica_id', clinica_id)
  }

  return NextResponse.json({ success: true, data })
}
