// ═══════════════════════════════════════════════
// FUNIL B2B — Lógica de classificação e análise
// ═══════════════════════════════════════════════

interface RegraClassificacao {
  verde: number
  amarelo: number
  inverso?: boolean
}

const REGRAS: Record<string, RegraClassificacao> = {
  agendamento: { verde: 35, amarelo: 30 },
  comparecimento: { verde: 70, amarelo: 65 },
  qualificacao: { verde: 75, amarelo: 65 },
  conversao: { verde: 24, amarelo: 20 },
  cac: { verde: 200, amarelo: 300, inverso: true },
  cpl: { verde: 12, amarelo: 15, inverso: true },
}

export type CorStatus = 'verde' | 'amarelo' | 'vermelho' | 'neutro'

export function classificarMetrica(tipo: string, valor: number): CorStatus {
  const regra = REGRAS[tipo]
  if (!regra) return 'neutro'

  if (regra.inverso) {
    if (valor <= regra.verde) return 'verde'
    if (valor <= regra.amarelo) return 'amarelo'
    return 'vermelho'
  }

  if (valor >= regra.verde) return 'verde'
  if (valor >= regra.amarelo) return 'amarelo'
  return 'vermelho'
}

export interface DadosFunil {
  leads: number
  agendamentos: number
  reunioes_realizadas: number
  reunioes_qualificadas: number
  fechamentos: number
  taxa_agendamento: number
  taxa_comparecimento: number
  taxa_qualificacao: number
  taxa_conversao_final: number
  cpl: number
  cac: number
  custo_agendamento: number
  custo_reuniao: number
  faturamento: number
  investimento: number
}

export interface Gargalo {
  etapa: string
  severidade: 'critico' | 'atencao'
  atual: number
  meta: number
  diferenca: number
  mensagem: string
  impacto_financeiro?: number
}

export interface Baseline {
  cpl_meta: number
  taxa_agendamento_meta: number
  taxa_comparecimento_meta: number
  taxa_qualificacao_meta: number
  taxa_conversao_meta: number
  cac_meta: number
  ticket_medio: number
  reunioes_dia_meta: number
  closers: number
}

export function detectarGargalos(dados: DadosFunil): Gargalo[] {
  const gargalos: Gargalo[] = []

  if (dados.taxa_agendamento < 30) {
    gargalos.push({
      etapa: 'agendamento',
      severidade: 'critico',
      atual: dados.taxa_agendamento,
      meta: 35.25,
      diferenca: Number((dados.taxa_agendamento - 35.25).toFixed(2)),
      mensagem: 'Taxa de agendamento abaixo do minimo',
    })
  } else if (dados.taxa_agendamento < 35) {
    gargalos.push({
      etapa: 'agendamento',
      severidade: 'atencao',
      atual: dados.taxa_agendamento,
      meta: 35.25,
      diferenca: Number((dados.taxa_agendamento - 35.25).toFixed(2)),
      mensagem: 'Taxa de agendamento abaixo da meta',
    })
  }

  if (dados.taxa_comparecimento < 65) {
    gargalos.push({
      etapa: 'comparecimento',
      severidade: 'critico',
      atual: dados.taxa_comparecimento,
      meta: 71.30,
      diferenca: Number((dados.taxa_comparecimento - 71.30).toFixed(2)),
      mensagem: 'Taxa de comparecimento critica',
    })
  } else if (dados.taxa_comparecimento < 70) {
    gargalos.push({
      etapa: 'comparecimento',
      severidade: 'atencao',
      atual: dados.taxa_comparecimento,
      meta: 71.30,
      diferenca: Number((dados.taxa_comparecimento - 71.30).toFixed(2)),
      mensagem: 'Comparecimento abaixo da meta',
    })
  }

  if (dados.cac > 300) {
    gargalos.push({
      etapa: 'cac',
      severidade: 'critico',
      atual: dados.cac,
      meta: 188.94,
      diferenca: Number((dados.cac - 188.94).toFixed(2)),
      mensagem: 'CAC acima do limite aceitavel',
    })
  } else if (dados.cac > 200) {
    gargalos.push({
      etapa: 'cac',
      severidade: 'atencao',
      atual: dados.cac,
      meta: 188.94,
      diferenca: Number((dados.cac - 188.94).toFixed(2)),
      mensagem: 'CAC acima do ideal',
    })
  }

  if (dados.taxa_conversao_final < 20) {
    gargalos.push({
      etapa: 'conversao',
      severidade: 'critico',
      atual: dados.taxa_conversao_final,
      meta: 24.09,
      diferenca: Number((dados.taxa_conversao_final - 24.09).toFixed(2)),
      mensagem: 'Taxa de conversao final critica',
    })
  } else if (dados.taxa_conversao_final < 24) {
    gargalos.push({
      etapa: 'conversao',
      severidade: 'atencao',
      atual: dados.taxa_conversao_final,
      meta: 24.09,
      diferenca: Number((dados.taxa_conversao_final - 24.09).toFixed(2)),
      mensagem: 'Conversao final abaixo da meta',
    })
  }

  return gargalos
}

export function calcularImpactoFinanceiro(dados: DadosFunil, baseline: Baseline) {
  const agendamentosEsperados = Math.round(dados.leads * (baseline.taxa_agendamento_meta / 100))
  const reunioesEsperadas = Math.round(agendamentosEsperados * (baseline.taxa_comparecimento_meta / 100))
  const fechamentosEsperados = Math.round(reunioesEsperadas * (baseline.taxa_conversao_meta / 100))
  const faturamentoEsperado = fechamentosEsperados * baseline.ticket_medio
  const faturamentoAtual = dados.fechamentos * baseline.ticket_medio
  const perdaFinanceira = faturamentoEsperado - faturamentoAtual
  const cacIdeal = dados.investimento > 0 && fechamentosEsperados > 0
    ? Number((dados.investimento / fechamentosEsperados).toFixed(2))
    : 0

  return {
    agendamentos_esperados: agendamentosEsperados,
    agendamentos_perdidos: agendamentosEsperados - dados.agendamentos,
    reunioes_esperadas: reunioesEsperadas,
    reunioes_perdidas: reunioesEsperadas - dados.reunioes_realizadas,
    fechamentos_esperados: fechamentosEsperados,
    fechamentos_perdidos: fechamentosEsperados - dados.fechamentos,
    faturamento_esperado: faturamentoEsperado,
    faturamento_perdido: perdaFinanceira,
    cac_ideal: cacIdeal,
    cac_inflado_em: Number((dados.cac - cacIdeal).toFixed(2)),
  }
}

export function gerarResumoExecutivo(dados: DadosFunil, gargalos: Gargalo[]): string {
  const gargaloPrincipal = gargalos[0]

  if (!gargaloPrincipal) {
    return 'Funil operando dentro dos parametros ideais. Manter o ritmo e focar em escala.'
  }

  const resumos: Record<string, string> = {
    agendamento: `O funil apresenta CPL saudavel (R$${dados.cpl}) e geracao de leads consistente (${dados.leads}). O principal gargalo esta na conversao de leads em agendamentos (${dados.taxa_agendamento}% vs meta 35,25%), impactando o volume de reunioes e elevando o CAC para R$${dados.cac}. Prioridade: corrigir o agendamento para aumentar volume de reunioes e reduzir CAC.`,
    comparecimento: `Leads e agendamentos chegando bem. Gargalo no comparecimento (${dados.taxa_comparecimento}% vs meta 71,30%). Implementar confirmacao 24h antes e follow-up no dia da reuniao.`,
    cac: `CAC em R$${dados.cac} — ${Math.round(((dados.cac - 188.94) / 188.94) * 100)}% acima do ideal. Otimizar conversao em todas as etapas para diluir o custo de aquisicao.`,
    conversao: `Pipeline chegando bem nas reunioes. Gargalo no fechamento (${dados.taxa_conversao_final}% vs meta 24,09%). Revisar script de vendas e objecoes.`,
  }

  return resumos[gargaloPrincipal.etapa] || 'Analisar funil completo para identificar pontos de melhoria.'
}

export const COR_CSS: Record<CorStatus, { bg: string; text: string; border: string }> = {
  verde: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30' },
  amarelo: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  vermelho: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  neutro: { bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/30' },
}
