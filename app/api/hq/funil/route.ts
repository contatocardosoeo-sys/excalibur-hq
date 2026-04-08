import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  detectarGargalos,
  calcularImpactoFinanceiro,
  gerarResumoExecutivo,
  classificarMetrica,
  type DadosFunil,
  type Baseline,
} from '@/app/lib/funil'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function GET() {
  try {
    const [
      { data: analiseRows },
      { data: baselineRows },
      { data: metasRows },
    ] = await Promise.all([
      supabase.from('funil_analise').select('*').order('created_at', { ascending: false }).limit(1),
      supabase.from('funil_baseline').select('*').limit(1),
      supabase.from('metas_operacionais').select('*').eq('ativo', true).order('faturamento_meta', { ascending: true }),
    ])

    const analise = (analiseRows?.[0] || {}) as Record<string, unknown>
    const baselineRaw = (baselineRows?.[0] || {}) as Record<string, unknown>

    const dados: DadosFunil = {
      leads: Number(analise.leads || 0),
      agendamentos: Number(analise.agendamentos || 0),
      reunioes_realizadas: Number(analise.reunioes_realizadas || 0),
      reunioes_qualificadas: Number(analise.reunioes_qualificadas || 0),
      fechamentos: Number(analise.fechamentos || 0),
      taxa_agendamento: Number(analise.taxa_agendamento || 0),
      taxa_comparecimento: Number(analise.taxa_comparecimento || 0),
      taxa_qualificacao: Number(analise.taxa_qualificacao || 0),
      taxa_conversao_final: Number(analise.taxa_conversao_final || 0),
      cpl: Number(analise.cpl || 0),
      cac: Number(analise.cac || 0),
      custo_agendamento: Number(analise.custo_agendamento || 0),
      custo_reuniao: Number(analise.custo_reuniao || 0),
      faturamento: Number(analise.faturamento || 0),
      investimento: Number(analise.investimento || 0),
    }

    const baseline: Baseline = {
      cpl_meta: Number(baselineRaw.cpl_meta || 10.68),
      taxa_agendamento_meta: Number(baselineRaw.taxa_agendamento_meta || 35.25),
      taxa_comparecimento_meta: Number(baselineRaw.taxa_comparecimento_meta || 71.30),
      taxa_qualificacao_meta: Number(baselineRaw.taxa_qualificacao_meta || 82.56),
      taxa_conversao_meta: Number(baselineRaw.taxa_conversao_meta || 24.09),
      cac_meta: Number(baselineRaw.cac_meta || 188.94),
      ticket_medio: Number(baselineRaw.ticket_medio || 2000),
      reunioes_dia_meta: Number(baselineRaw.reunioes_dia_meta || 10),
      closers: Number(baselineRaw.closers || 2),
    }

    const gargalos = detectarGargalos(dados)
    const impacto = calcularImpactoFinanceiro(dados, baseline)
    const resumo = gerarResumoExecutivo(dados, gargalos)

    // Classificações de cor
    const cores = {
      cpl: classificarMetrica('cpl', dados.cpl),
      agendamento: classificarMetrica('agendamento', dados.taxa_agendamento),
      comparecimento: classificarMetrica('comparecimento', dados.taxa_comparecimento),
      qualificacao: classificarMetrica('qualificacao', dados.taxa_qualificacao),
      conversao: classificarMetrica('conversao', dados.taxa_conversao_final),
      cac: classificarMetrica('cac', dados.cac),
    }

    // Projeção do mês (assumindo dia 7 de 22 úteis)
    const diasUteisMes = 22
    const diasDecorridos = 7
    const diasRestantes = diasUteisMes - diasDecorridos
    const faturamentoProjetado = diasUteisMes > 0
      ? Math.round((dados.faturamento / diasDecorridos) * diasUteisMes)
      : 0
    const vendasProjetadas = diasUteisMes > 0
      ? Math.round((dados.fechamentos / diasDecorridos) * diasUteisMes)
      : 0

    const metaNormal = (metasRows || []).find((m: Record<string, unknown>) => m.tipo === 'normal')
    const metaNormalFat = Number((metaNormal as Record<string, unknown>)?.faturamento_meta || 90000)

    let metaAtingida = 'abaixo'
    if (faturamentoProjetado >= 106000) metaAtingida = 'super'
    else if (faturamentoProjetado >= 90000) metaAtingida = 'normal'
    else if (faturamentoProjetado >= 74000) metaAtingida = 'minima'

    return NextResponse.json({
      success: true,
      dados,
      baseline,
      metas: metasRows || [],
      gargalos,
      impacto,
      resumo,
      cores,
      projecao_mes: {
        faturamento_projetado: faturamentoProjetado,
        vendas_projetadas: vendasProjetadas,
        meta_atingida: metaAtingida,
        dias_restantes: diasRestantes,
        falta_para_meta_normal: Math.max(0, metaNormalFat - dados.faturamento),
        vendas_necessarias_restantes: Math.max(0, Math.ceil((metaNormalFat - dados.faturamento) / baseline.ticket_medio)),
      },
      comparativo: [
        { metrica: 'CPL', atual: `R$${dados.cpl}`, baseline_val: `R$${baseline.cpl_meta}`, diferenca: `${dados.cpl > baseline.cpl_meta ? '+' : ''}R$${(dados.cpl - baseline.cpl_meta).toFixed(2)}`, cor: cores.cpl },
        { metrica: 'Agendamento', atual: `${dados.taxa_agendamento}%`, baseline_val: `${baseline.taxa_agendamento_meta}%`, diferenca: `${(dados.taxa_agendamento - baseline.taxa_agendamento_meta).toFixed(2)}pp`, cor: cores.agendamento },
        { metrica: 'Comparecimento', atual: `${dados.taxa_comparecimento}%`, baseline_val: `${baseline.taxa_comparecimento_meta}%`, diferenca: `${(dados.taxa_comparecimento - baseline.taxa_comparecimento_meta).toFixed(2)}pp`, cor: cores.comparecimento },
        { metrica: 'Qualificacao', atual: `${dados.taxa_qualificacao}%`, baseline_val: `${baseline.taxa_qualificacao_meta}%`, diferenca: `+${(dados.taxa_qualificacao - baseline.taxa_qualificacao_meta).toFixed(2)}pp`, cor: cores.qualificacao },
        { metrica: 'Conversao Final', atual: `${dados.taxa_conversao_final}%`, baseline_val: `${baseline.taxa_conversao_meta}%`, diferenca: `${(dados.taxa_conversao_final - baseline.taxa_conversao_meta).toFixed(2)}pp`, cor: cores.conversao },
        { metrica: 'CAC', atual: `R$${dados.cac}`, baseline_val: `R$${baseline.cac_meta}`, diferenca: `+R$${(dados.cac - baseline.cac_meta).toFixed(2)}`, cor: cores.cac },
      ],
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
