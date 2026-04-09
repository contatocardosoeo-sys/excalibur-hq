import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const mes = Number(req.nextUrl.searchParams.get('mes')) || new Date().getMonth() + 1
  const ano = Number(req.nextUrl.searchParams.get('ano')) || new Date().getFullYear()

  const [{ data: funil }, { data: metas }] = await Promise.all([
    supabase.from('funil_trafego').select('*').eq('mes', mes).eq('ano', ano).single(),
    supabase.from('metas_trafego').select('*').order('nome'),
  ])

  if (!funil) return NextResponse.json({ funil: null, metas: metas || [], etapas: [] })

  const f = funil
  const cpl = f.leads > 0 ? f.investimento_total / f.leads : 0
  const txAgendamento = f.leads > 0 ? (f.agendamentos / f.leads) * 100 : 0
  const txComparecimento = f.agendamentos > 0 ? (f.reunioes_realizadas / f.agendamentos) * 100 : 0
  const txQualificacao = f.reunioes_realizadas > 0 ? (f.reunioes_qualificadas / f.reunioes_realizadas) * 100 : 0
  const txConversao = f.reunioes_qualificadas > 0 ? (f.fechamentos / f.reunioes_qualificadas) * 100 : 0
  const cac = f.fechamentos > 0 ? f.investimento_total / f.fechamentos : 0
  const ticketMedio = f.fechamentos > 0 ? f.faturamento / f.fechamentos : 0
  const roas = f.investimento_total > 0 ? f.faturamento / f.investimento_total : 0

  const metasMap: Record<string, { minima: number; boa: number; excelente: number; unidade: string }> = {}
  for (const m of metas || []) {
    metasMap[m.nome] = { minima: Number(m.meta_minima), boa: Number(m.meta_boa), excelente: Number(m.meta_excelente), unidade: m.unidade }
  }

  function diagnosticar(valor: number, nome: string, inverso?: boolean) {
    const m = metasMap[nome]
    if (!m) return { cor: '#6b7280', status: 'sem meta', emoji: '⚪' }
    if (inverso) {
      if (valor <= m.excelente) return { cor: '#22c55e', status: 'excelente', emoji: '🟢' }
      if (valor <= m.boa) return { cor: '#22c55e', status: 'bom', emoji: '🟢' }
      if (valor <= m.minima) return { cor: '#f59e0b', status: 'atencao', emoji: '🟡' }
      return { cor: '#ef4444', status: 'critico', emoji: '🔴' }
    }
    if (valor >= m.excelente) return { cor: '#22c55e', status: 'excelente', emoji: '🟢' }
    if (valor >= m.boa) return { cor: '#22c55e', status: 'bom', emoji: '🟢' }
    if (valor >= m.minima) return { cor: '#f59e0b', status: 'atencao', emoji: '🟡' }
    return { cor: '#ef4444', status: 'critico', emoji: '🔴' }
  }

  const etapas = [
    { nome: 'Investimento', valor: f.investimento_total, fmt: 'R$', diag: null },
    { nome: 'Leads', valor: f.leads, fmt: 'num', taxa: null, diag: null },
    { nome: 'CPL', valor: Math.round(cpl * 100) / 100, fmt: 'R$', diag: diagnosticar(cpl, 'CPL', true), meta: metasMap['CPL'] },
    { nome: 'Agendamentos', valor: f.agendamentos, fmt: 'num', taxa: Math.round(txAgendamento * 10) / 10, diag: diagnosticar(txAgendamento, 'Taxa Agendamento'), meta: metasMap['Taxa Agendamento'] },
    { nome: 'Reunioes', valor: f.reunioes_realizadas, fmt: 'num', taxa: Math.round(txComparecimento * 10) / 10, diag: diagnosticar(txComparecimento, 'Taxa Comparecimento'), meta: metasMap['Taxa Comparecimento'] },
    { nome: 'Qualificadas', valor: f.reunioes_qualificadas, fmt: 'num', taxa: Math.round(txQualificacao * 10) / 10, diag: diagnosticar(txQualificacao, 'Taxa Qualificacao'), meta: metasMap['Taxa Qualificacao'] },
    { nome: 'Fechamentos', valor: f.fechamentos, fmt: 'num', taxa: Math.round(txConversao * 10) / 10, diag: diagnosticar(txConversao, 'Taxa Conversao'), meta: metasMap['Taxa Conversao'] },
    { nome: 'Faturamento', valor: f.faturamento, fmt: 'R$', diag: null },
  ]

  // Gargalo = pior etapa
  const etapasComDiag = etapas.filter(e => e.diag?.status === 'critico')
  const gargalo = etapasComDiag.length > 0 ? etapasComDiag[0] : null

  // Alertas
  const alertas: string[] = []
  if (diagnosticar(txAgendamento, 'Taxa Agendamento').status === 'critico') alertas.push('Taxa de agendamento critica — revisar abordagem comercial e scripts')
  if (diagnosticar(txComparecimento, 'Taxa Comparecimento').status === 'critico') alertas.push('Comparecimento baixo — melhorar confirmacao e lembretes')
  if (diagnosticar(cpl, 'CPL', true).status === 'critico') alertas.push('CPL acima do limite — revisar segmentacao e criativos')
  if (diagnosticar(cac, 'CAC', true).status === 'critico') alertas.push('CAC acima de R$300 — otimizar funil de conversao')

  return NextResponse.json({
    funil: f,
    etapas,
    metricas: { cpl, txAgendamento, txComparecimento, txQualificacao, txConversao, cac, ticketMedio, roas },
    gargalo: gargalo ? { nome: gargalo.nome, taxa: gargalo.taxa, status: gargalo.diag?.status } : null,
    alertas,
    metas: metas || [],
  })
}

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { mes, ano, ...dados } = body
  dados.updated_at = new Date().toISOString()

  const { data, error } = await supabase.from('funil_trafego')
    .upsert({ mes: mes || new Date().getMonth() + 1, ano: ano || new Date().getFullYear(), ...dados }, { onConflict: 'mes,ano' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}
