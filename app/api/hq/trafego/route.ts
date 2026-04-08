import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
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
      { data: sdrRows },
      { data: tarefasRows },
      { data: testesRows },
    ] = await Promise.all([
      supabase.from('funil_analise').select('*').order('created_at', { ascending: false }).limit(1),
      supabase.from('funil_baseline').select('*').limit(1),
      supabase.from('metas_operacionais').select('*').eq('ativo', true).order('faturamento_meta', { ascending: true }),
      supabase.from('sdr_performance').select('*').eq('ativo', true).order('receita_gerada', { ascending: false }),
      supabase.from('tarefas').select('*').in('status', ['pendente', 'em_andamento']).order('created_at', { ascending: false }).limit(20),
      supabase.from('testes_marketing').select('*').order('created_at', { ascending: false }).limit(20),
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

    const cores = {
      cpl: classificarMetrica('cpl', dados.cpl),
      agendamento: classificarMetrica('agendamento', dados.taxa_agendamento),
      comparecimento: classificarMetrica('comparecimento', dados.taxa_comparecimento),
      qualificacao: classificarMetrica('qualificacao', dados.taxa_qualificacao),
      conversao: classificarMetrica('conversao', dados.taxa_conversao_final),
      cac: classificarMetrica('cac', dados.cac),
    }

    // Projecao
    const diasUteisMes = 22
    const diasDecorridos = 8
    const diasRestantes = diasUteisMes - diasDecorridos
    const faturamentoProjetado = Math.round((dados.faturamento / diasDecorridos) * diasUteisMes)
    const vendasProjetadas = Math.round((dados.fechamentos / diasDecorridos) * diasUteisMes)
    const metaNormal = (metasRows || []).find((m: Record<string, unknown>) => m.tipo === 'normal')
    const metaNormalFat = Number((metaNormal as Record<string, unknown>)?.faturamento_meta || 90000)

    // Prioridade do dia
    const prioridadeDoDia = gargalos.length > 0
      ? {
          titulo: `Corrigir ${gargalos[0].etapa} — ${gargalos[0].atual}${gargalos[0].etapa === 'cac' ? '' : '%'} vs meta ${gargalos[0].meta}${gargalos[0].etapa === 'cac' ? '' : '%'}`,
          impacto: impacto.faturamento_perdido,
          severidade: gargalos[0].severidade,
          acoes: gerarAcoesPrioridade(gargalos[0].etapa),
        }
      : { titulo: 'Funil saudavel — focar em escala', impacto: 0, severidade: 'ok', acoes: ['Manter ritmo atual', 'Testar novos canais'] }

    // Simulacao: "Se aumentar agendamento para X% -> +R$Y"
    const simulacoes = [
      calcularSimulacao(dados, baseline, 'agendamento', 30),
      calcularSimulacao(dados, baseline, 'agendamento', 35.25),
      calcularSimulacao(dados, baseline, 'comparecimento', 71.30),
    ]

    // Comparativo
    const comparativo = [
      { metrica: 'CPL', atual: `R$${dados.cpl}`, baseline_val: `R$${baseline.cpl_meta}`, diferenca: `${dados.cpl > baseline.cpl_meta ? '+' : ''}R$${(dados.cpl - baseline.cpl_meta).toFixed(2)}`, cor: cores.cpl },
      { metrica: 'Agendamento', atual: `${dados.taxa_agendamento}%`, baseline_val: `${baseline.taxa_agendamento_meta}%`, diferenca: `${(dados.taxa_agendamento - baseline.taxa_agendamento_meta).toFixed(2)}pp`, cor: cores.agendamento },
      { metrica: 'Comparecimento', atual: `${dados.taxa_comparecimento}%`, baseline_val: `${baseline.taxa_comparecimento_meta}%`, diferenca: `${(dados.taxa_comparecimento - baseline.taxa_comparecimento_meta).toFixed(2)}pp`, cor: cores.comparecimento },
      { metrica: 'Qualificacao', atual: `${dados.taxa_qualificacao}%`, baseline_val: `${baseline.taxa_qualificacao_meta}%`, diferenca: `+${(dados.taxa_qualificacao - baseline.taxa_qualificacao_meta).toFixed(2)}pp`, cor: cores.qualificacao },
      { metrica: 'Conversao', atual: `${dados.taxa_conversao_final}%`, baseline_val: `${baseline.taxa_conversao_meta}%`, diferenca: `${(dados.taxa_conversao_final - baseline.taxa_conversao_meta).toFixed(2)}pp`, cor: cores.conversao },
      { metrica: 'CAC', atual: `R$${dados.cac}`, baseline_val: `R$${baseline.cac_meta}`, diferenca: `+R$${(dados.cac - baseline.cac_meta).toFixed(2)}`, cor: cores.cac },
    ]

    return NextResponse.json({
      success: true,
      dados,
      baseline,
      cores,
      gargalos,
      impacto,
      resumo,
      comparativo,
      metas: metasRows || [],
      sdr_performance: sdrRows || [],
      tarefas: tarefasRows || [],
      testes_marketing: testesRows || [],
      prioridade_do_dia: prioridadeDoDia,
      simulacoes,
      projecao_mes: {
        faturamento_projetado: faturamentoProjetado,
        vendas_projetadas: vendasProjetadas,
        meta_atingida: faturamentoProjetado >= 106000 ? 'super' : faturamentoProjetado >= 90000 ? 'normal' : faturamentoProjetado >= 74000 ? 'minima' : 'abaixo',
        dias_restantes: diasRestantes,
        falta_para_meta_normal: Math.max(0, metaNormalFat - dados.faturamento),
        vendas_necessarias: Math.max(0, Math.ceil((metaNormalFat - dados.faturamento) / baseline.ticket_medio)),
        vendas_por_dia: Number((Math.ceil((metaNormalFat - dados.faturamento) / baseline.ticket_medio) / Math.max(1, diasRestantes)).toFixed(1)),
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}

function gerarAcoesPrioridade(etapa: string): string[] {
  const map: Record<string, string[]> = {
    agendamento: ['Auditar tempo de resposta dos SDRs', 'Ativar auto-resposta <5min', 'Implementar follow-up 1h+24h+48h', 'Revisar script de agendamento'],
    comparecimento: ['Ativar confirmacao 48h+24h+2h', 'Reduzir janela para max 3 dias', 'Ligar para confirmar 1 dia antes'],
    cac: ['Pausar campanhas com CPL >2x meta', 'Focar orcamento nos canais baratos', 'Otimizar conversao de cada etapa'],
    conversao: ['Revisar script de vendas', 'Treinar closers em objecoes', 'Oferecer condicao especial'],
  }
  return map[etapa] || ['Analisar dados e definir plano de acao']
}

function calcularSimulacao(dados: DadosFunil, baseline: Baseline, etapa: string, novoValor: number) {
  let agend = dados.agendamentos
  let reun = dados.reunioes_realizadas
  let fech = dados.fechamentos

  if (etapa === 'agendamento') {
    agend = Math.round(dados.leads * (novoValor / 100))
    reun = Math.round(agend * (dados.taxa_comparecimento / 100))
    fech = Math.round(reun * (dados.taxa_conversao_final / 100))
  } else if (etapa === 'comparecimento') {
    reun = Math.round(dados.agendamentos * (novoValor / 100))
    fech = Math.round(reun * (dados.taxa_conversao_final / 100))
  }

  const novoFaturamento = fech * baseline.ticket_medio
  const ganho = novoFaturamento - dados.faturamento
  const novoCac = dados.investimento > 0 && fech > 0 ? Number((dados.investimento / fech).toFixed(2)) : 0

  return {
    cenario: `${etapa} em ${novoValor}%`,
    agendamentos: agend,
    reunioes: reun,
    fechamentos: fech,
    faturamento: novoFaturamento,
    ganho,
    cac: novoCac,
  }
}
