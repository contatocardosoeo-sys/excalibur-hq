// ═══════════════════════════════════════════════════════════════
// EXCALIBUR HQ — ARQUIVO MÃE DE CONFIGURAÇÃO
// Toda meta, prazo, divisor e cálculo do sistema vem daqui.
// Para mudar qualquer parâmetro global: altere SÓ este arquivo.
// ═══════════════════════════════════════════════════════════════

// ─── MOTOR DE DATAS ───────────────────────────────────────────────────
// Tudo que envolve dias úteis/feriados vem de ./dias-uteis.ts
import {
  isDiaUtil,
  isHojeDiaUtil,
  diasUteisNoMes,
  diasUteisPassados,
  diasUteisFaltando,
  diasUteisDoMesAtual,
  semanasUteisDoMes,
  addDiasUteis,
  proximoDiaUtil,
  diasUteisEntre,
  calendarioMesAtual,
} from './dias-uteis'

// Re-exporta tudo pra manter compat com imports antigos (`from '@/lib/config'`)
export {
  isDiaUtil,
  isHojeDiaUtil,
  diasUteisNoMes,
  diasUteisPassados,
  diasUteisFaltando,
  diasUteisDoMesAtual,
  semanasUteisDoMes,
  addDiasUteis,
  proximoDiaUtil,
  diasUteisEntre,
  calendarioMesAtual,
}

// ─── CONSTANTES DINÂMICAS ─────────────────────────────────────────────
// DIAS_UTEIS_MES é calculado no primeiro import e vale pro mês atual
export const DIAS_UTEIS_MES = diasUteisDoMesAtual()
export const SEMANAS_MES = DIAS_UTEIS_MES / 5 || 4.2  // fallback

// ─── FUNIL DE VENDAS ──────────────────────────────────────────────────
export const TICKET_MEDIO = 2000
export const CPL_MEDIO = 10.70
export const CPL_MAX = 15.00

export const RECEITA_METAS = {
  minima: 74_000,
  alvo:   90_000,
  super: 106_000,
} as const

export type NivelMeta = keyof typeof RECEITA_METAS

// Meta ativa do sistema — mudar aqui muda em tudo
export const META_ATIVA: NivelMeta = 'alvo'

// Taxas de conversão alvo (meta contratual)
export const TAXAS_META = {
  qualificacao: 0.70,
  agendamento: 0.35,
  comparecimento: 0.70,
  fechamento: 0.24,
}

// Taxas reais (Fev/Mar 2026) — comparativo + gargalo
export const TAXAS_REAIS = {
  qualificacao: 0.75,
  agendamento: 0.32,
  comparecimento: 0.696,
  fechamento: 0.325,
}

// ─── CÁLCULO DO FUNIL A PARTIR DA RECEITA ────────────────────────────
export type Funil = {
  receita: number
  mensal: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  diario: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  semanal: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  custos: { investimento_mensal: number; investimento_diario: number; cac: number; custo_reuniao: number }
}

export function calcularFunil(receita: number): Funil {
  const vendas        = Math.ceil(receita / TICKET_MEDIO)
  const comparec      = Math.ceil(vendas  / TAXAS_META.fechamento)
  const agendamentos  = Math.ceil(comparec / TAXAS_META.comparecimento)
  const qualificados  = Math.ceil(agendamentos / TAXAS_META.agendamento)
  const leads         = Math.ceil(qualificados / TAXAS_META.qualificacao)
  const investimento  = Math.round(leads * CPL_MEDIO)
  const cac           = Math.round(investimento / vendas)
  const custo_reuniao = Math.round(investimento / comparec)

  const du = DIAS_UTEIS_MES || 22
  const su = SEMANAS_MES || 4.33

  return {
    receita,
    mensal: { vendas, comparecimentos: comparec, agendamentos, qualificados, leads },
    diario: {
      vendas:          Math.ceil(vendas / du),
      comparecimentos: Math.ceil(comparec / du),
      agendamentos:    Math.ceil(agendamentos / du),
      qualificados:    Math.ceil(qualificados / du),
      leads:           Math.ceil(leads / du),
    },
    semanal: {
      vendas:          Math.ceil(vendas / su),
      comparecimentos: Math.ceil(comparec / su),
      agendamentos:    Math.ceil(agendamentos / su),
      qualificados:    Math.ceil(qualificados / su),
      leads:           Math.ceil(leads / su),
    },
    custos: {
      investimento_mensal: investimento,
      investimento_diario: Math.round(investimento / du),
      cac,
      custo_reuniao,
    },
  }
}

export const FUNIL: Record<NivelMeta, Funil> = {
  minima: calcularFunil(RECEITA_METAS.minima),
  alvo:   calcularFunil(RECEITA_METAS.alvo),
  super:  calcularFunil(RECEITA_METAS.super),
}

export const FUNIL_ATIVO = FUNIL[META_ATIVA]

// Alias compat com código antigo que importava FUNIL_METAS
export const FUNIL_METAS = FUNIL

// ─── META POR PERÍODO (sempre divide por dias úteis REAIS) ───────────
export type Periodo = 'hoje' | 'semana' | 'mes' | 'personalizado'

export function metaPorPeriodo(
  valorMensal: number,
  periodo: Periodo,
  diasRange = 1,
): number {
  const du = DIAS_UTEIS_MES || 22
  const su = SEMANAS_MES || 4.33
  switch (periodo) {
    case 'hoje':         return Math.ceil(valorMensal / du)
    case 'semana':       return Math.ceil(valorMensal / su)
    case 'mes':          return valorMensal
    case 'personalizado':return Math.ceil((valorMensal / du) * diasRange)
  }
}

// ─── VELOCIDADE NECESSÁRIA ("PACE") ──────────────────────────────────
export type Pace = {
  necessario_por_dia: number
  no_ritmo: boolean
  projecao_mensal: number
  dias_passados: number
  dias_restantes: number
}

export function calcularPace(
  metaMensal: number,
  realizadoMes: number,
  hoje: Date = new Date(),
): Pace {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const du = diasUteisNoMes(ano, mes)
  const passados = diasUteisPassados(ano, mes, hoje)
  const restantes = du - passados
  const ritmo = passados > 0 ? realizadoMes / passados : 0
  const projecao = Math.round(ritmo * du)
  const necessario = restantes > 0 ? Math.ceil((metaMensal - realizadoMes) / restantes) : 0

  return {
    necessario_por_dia: Math.max(0, necessario),
    no_ritmo: projecao >= metaMensal,
    projecao_mensal: projecao,
    dias_passados: passados,
    dias_restantes: restantes,
  }
}

// ─── DETECÇÃO DE GARGALO ─────────────────────────────────────────────
export type Gargalo = {
  etapa: 'qualificacao' | 'agendamento' | 'comparecimento' | 'fechamento'
  real: number
  meta: number
  impacto_pct: number
}

export function detectarGargalo(): Gargalo | null {
  const etapas: Array<Gargalo['etapa']> = ['qualificacao', 'agendamento', 'comparecimento', 'fechamento']
  let pior: { etapa: Gargalo['etapa']; diff: number } | null = null
  for (const etapa of etapas) {
    const diff = TAXAS_META[etapa] - TAXAS_REAIS[etapa]
    if (diff > 0 && (pior === null || diff > pior.diff)) {
      pior = { etapa, diff }
    }
  }
  if (!pior) return null
  return {
    etapa: pior.etapa,
    real: TAXAS_REAIS[pior.etapa],
    meta: TAXAS_META[pior.etapa],
    impacto_pct: Math.round(pior.diff * 100),
  }
}

// ─── LIMITES DE CUSTO ────────────────────────────────────────────────
export const LIMITES = {
  cac_max: 300,
  custo_reuniao_max: 55,
  cpl_max: CPL_MAX,
  cpl_otimo: 12,
}

// ─── JORNADA CS — prazos em DIAS ÚTEIS ──────────────────────────────
// Ao invés de somar 7/30/60 dias corridos, usamos addDiasUteis
export const JORNADA_PRAZOS_UTEIS = {
  D0_NOVO: 0,
  D7_ATIVADO: 7,
  D15_ENGAJADO: 15,
  D30_ATIVO: 30,
  D60_MADURO: 60,
  D90_SENIOR: 90,
}

export const CS_TAREFAS_SEMANA_ALVO = 20

// ─── DESIGN & VÍDEO — SLAs em dias úteis ─────────────────────────────
export const DESIGN_SLA_UTEIS = {
  urgente: 1,  // 1 dia útil (próximo dia)
  alta: 2,     // 2 dias úteis
  media: 4,    // 4 dias úteis (~1 semana)
  baixa: 8,    // 8 dias úteis (~2 semanas)
}

// ══════════════════════════════════════════════════════════════
// SDR — META PRINCIPAL: 15 agendamentos/dia
// ══════════════════════════════════════════════════════════════
// Matemática: 15 agend × 69.6% comp = 10 reuniões/dia
//             10 reuniões × 30% fech = 3 vendas/dia
//             3 vendas × 21 dias úteis = 63 fechamentos/mês
//             63 × R$2.000 = R$126.000/mês (SUPERMETA viável)
// Mínimo viável (R$90k): 8 agend/dia (entrega 5 reuniões/dia)

export const SDR_METAS_DIARIAS = {
  agendamentos:       15, // ⚡ META PRINCIPAL — foco 80/20 do Trindade
  leads:              62, // 15 ÷ (0.70 qualif × 0.35 agend) = 62
  qualificados:       43, // 15 ÷ 0.35 agend
  reunioes_esperadas: 10, // 15 × 0.696 compar
  noshow_esperado:    5,  // 15 × 0.304 (faz parte do processo)
  vendas_esperadas:   3,  // 10 × 0.30 fech
}

export const SDR_METAS_MENSAIS = {
  agendamentos:       315,  // 15 × 21 dias úteis (abril 2026)
  leads:             1302,  // 62 × 21
  qualificados:       903,  // 43 × 21
  reunioes_esperadas: 210,  // 10 × 21
  vendas_esperadas:   63,   // 3 × 21
  receita_esperada:   126000, // 63 × R$2.000 = SUPERMETA
}

export const SDR_METAS_SEMANAIS = {
  agendamentos:       75,   // ceil(315 / 4.2)
  leads:             310,   // ceil(1302 / 4.2)
  qualificados:      215,
  reunioes_esperadas: 50,
  vendas_esperadas:   15,
}

export const SDR_MINIMO_DIARIO = {
  agendamentos: 8, // mínimo viável pra bater R$90k alvo
}

// Função dinâmica: recalcula metas SDR para qualquer meta diária de agendamentos
// usando dias úteis reais do mês atual + taxas vigentes.
export function calcularMetasSDR(agendDia: number = 15) {
  const du = DIAS_UTEIS_MES || 21
  const su = SEMANAS_MES || 4.2
  const txComp = TAXAS_REAIS.comparecimento   // 0.696
  const txFech = TAXAS_META.fechamento        // 0.30
  const txAgend = TAXAS_META.agendamento      // 0.35
  const txQualif = TAXAS_META.qualificacao    // 0.70

  const reunioes_dia = Math.floor(agendDia * txComp)
  const noshow_dia   = Math.max(0, agendDia - reunioes_dia)
  const vendas_dia   = Math.ceil(reunioes_dia * txFech)
  const qualif_dia   = Math.ceil(agendDia / txAgend)
  const leads_dia    = Math.ceil(qualif_dia / txQualif)

  return {
    diario: {
      agendamentos: agendDia,
      reunioes:     reunioes_dia,
      noshow:       noshow_dia,
      vendas:       vendas_dia,
      qualificados: qualif_dia,
      leads:        leads_dia,
    },
    mensal: {
      agendamentos: agendDia * du,
      reunioes:     reunioes_dia * du,
      vendas:       vendas_dia * du,
      qualificados: qualif_dia * du,
      leads:        leads_dia * du,
      receita:      vendas_dia * du * TICKET_MEDIO,
    },
    semanal: {
      agendamentos: Math.ceil((agendDia * du) / su),
      reunioes:     Math.ceil((reunioes_dia * du) / su),
      vendas:       Math.ceil((vendas_dia * du) / su),
      leads:        Math.ceil((leads_dia * du) / su),
    },
    dias_uteis: du,
  }
}

export const SDR_AGEND_DIA = 15

// Jornada CS — prazos agora em DIAS ÚTEIS (antes era corridos)
export const JORNADA_DIAS_UTEIS = {
  D0: 0,
  D7: 7,
  D15: 15,
  D30: 30,
  D60: 60,
  D90: 90,
} as const

// Alias para código antigo que importava DESIGN_SLA_UTEIS
export const DESIGN_SLA = {
  urgente: 1,
  alta: 2,
  media: 4,
  baixa: 8,
}

// ══════════════════════════════════════════════════════════════
// BI — ZONAS DE CAC, ALERTAS, SENSIBILIDADE, DIAGNÓSTICO
// ══════════════════════════════════════════════════════════════

export const CAC_ZONAS = {
  saudavel_max: 250,  // pode escalar
  atencao_max:  300,  // monitorar
  // > 300 = crítico
} as const

export type ZonaCAC = 'saudavel' | 'atencao' | 'critico'

export function zonaCAC(cac: number): ZonaCAC {
  if (cac < CAC_ZONAS.saudavel_max) return 'saudavel'
  if (cac <= CAC_ZONAS.atencao_max) return 'atencao'
  return 'critico'
}

export function corCAC(cac: number): string {
  const z = zonaCAC(cac)
  if (z === 'saudavel') return '#22c55e'
  if (z === 'atencao') return '#fbbf24'
  return '#ef4444'
}

export type AlertaFunil = {
  etapa: 'qualificacao' | 'agendamento' | 'comparecimento' | 'fechamento' | 'cac' | 'custo_reuniao'
  nivel: 'critico' | 'atencao'
  valor_real: number
  limite: number
  mensagem: string
  acao: string
}

// Gera alertas a partir das taxas reais + custos
export function gerarAlertas(opts: {
  taxa_qualif?: number
  taxa_agend?: number
  taxa_comp?: number
  taxa_fech?: number
  cac?: number
  custo_reuniao?: number
}): AlertaFunil[] {
  const alertas: AlertaFunil[] = []

  if (opts.taxa_qualif !== undefined) {
    if (opts.taxa_qualif < 0.60) {
      alertas.push({ etapa: 'qualificacao', nivel: 'critico', valor_real: opts.taxa_qualif, limite: 0.60,
        mensagem: `Qualificação ${(opts.taxa_qualif * 100).toFixed(0)}% — abaixo do mínimo 60%`,
        acao: 'Corrigir público-alvo (ICP errado)' })
    } else if (opts.taxa_qualif < 0.70) {
      alertas.push({ etapa: 'qualificacao', nivel: 'atencao', valor_real: opts.taxa_qualif, limite: 0.70,
        mensagem: `Qualificação ${(opts.taxa_qualif * 100).toFixed(0)}% — abaixo da meta 70%`,
        acao: 'Revisar ICP e segmentação de campanhas' })
    }
  }

  if (opts.taxa_agend !== undefined) {
    if (opts.taxa_agend < 0.32) {
      alertas.push({ etapa: 'agendamento', nivel: 'critico', valor_real: opts.taxa_agend, limite: 0.32,
        mensagem: `Agendamento ${(opts.taxa_agend * 100).toFixed(0)}% — GARGALO CRÍTICO`,
        acao: 'Parar escala e corrigir script SDR' })
    } else if (opts.taxa_agend < 0.35) {
      alertas.push({ etapa: 'agendamento', nivel: 'atencao', valor_real: opts.taxa_agend, limite: 0.35,
        mensagem: `Agendamento ${(opts.taxa_agend * 100).toFixed(0)}% — abaixo da meta 35%`,
        acao: 'Otimizar script do SDR e objeções iniciais' })
    }
  }

  if (opts.taxa_comp !== undefined) {
    if (opts.taxa_comp < 0.66) {
      alertas.push({ etapa: 'comparecimento', nivel: 'critico', valor_real: opts.taxa_comp, limite: 0.66,
        mensagem: `Comparecimento ${(opts.taxa_comp * 100).toFixed(0)}% — falha operacional`,
        acao: 'Rever cadência de lembretes (D-1, H-3, H-1)' })
    } else if (opts.taxa_comp < 0.70) {
      alertas.push({ etapa: 'comparecimento', nivel: 'atencao', valor_real: opts.taxa_comp, limite: 0.70,
        mensagem: `Comparecimento ${(opts.taxa_comp * 100).toFixed(0)}% — abaixo da meta 70%`,
        acao: 'Reforçar confirmação no WhatsApp + ligar no dia' })
    }
  }

  if (opts.taxa_fech !== undefined) {
    if (opts.taxa_fech < 0.21) {
      alertas.push({ etapa: 'fechamento', nivel: 'critico', valor_real: opts.taxa_fech, limite: 0.21,
        mensagem: `Fechamento ${(opts.taxa_fech * 100).toFixed(0)}% — problema estrutural`,
        acao: 'Rever oferta/produto — possível problema de produto/mercado' })
    } else if (opts.taxa_fech < 0.24) {
      alertas.push({ etapa: 'fechamento', nivel: 'atencao', valor_real: opts.taxa_fech, limite: 0.24,
        mensagem: `Fechamento ${(opts.taxa_fech * 100).toFixed(0)}% — abaixo da meta 24%`,
        acao: 'Revisar pitch de vendas e tratamento de objeções' })
    }
  }

  if (opts.cac !== undefined) {
    if (opts.cac > CAC_ZONAS.atencao_max) {
      alertas.push({ etapa: 'cac', nivel: 'critico', valor_real: opts.cac, limite: CAC_ZONAS.atencao_max,
        mensagem: `CAC R$${Math.round(opts.cac)} — acima do teto R$${CAC_ZONAS.atencao_max}`,
        acao: 'PARAR escala imediatamente e corrigir funil antes de investir mais' })
    } else if (opts.cac > CAC_ZONAS.saudavel_max) {
      alertas.push({ etapa: 'cac', nivel: 'atencao', valor_real: opts.cac, limite: CAC_ZONAS.saudavel_max,
        mensagem: `CAC R$${Math.round(opts.cac)} — zona de atenção (> R$${CAC_ZONAS.saudavel_max})`,
        acao: 'Monitorar de perto antes de escalar mais investimento' })
    }
  }

  if (opts.custo_reuniao !== undefined) {
    if (opts.custo_reuniao > 70) {
      alertas.push({ etapa: 'custo_reuniao', nivel: 'critico', valor_real: opts.custo_reuniao, limite: 70,
        mensagem: `Custo/reunião R$${Math.round(opts.custo_reuniao)} — gargalo no meio do funil`,
        acao: 'Auditar qualificação + agendamento (leads chegando ruim ou SDR agendando errado)' })
    } else if (opts.custo_reuniao > 60) {
      alertas.push({ etapa: 'custo_reuniao', nivel: 'atencao', valor_real: opts.custo_reuniao, limite: 60,
        mensagem: `Custo/reunião R$${Math.round(opts.custo_reuniao)} — acima do ideal R$60`,
        acao: 'Ajustar taxa de agendamento' })
    }
  }

  return alertas
}

// ─── ANÁLISE DE SENSIBILIDADE ────────────────────────────────────────
// Mostra quanto ganha de receita se cada taxa subir 5 pontos percentuais
export type Sensibilidade = {
  base: Funil
  agendamento_plus_5: Funil
  comparecimento_plus_5: Funil
  fechamento_plus_5: Funil
  ganhos: {
    agendamento: { reuniao_extra: number; vendas_extra: number; receita_extra: number }
    comparecimento: { reuniao_extra: number; vendas_extra: number; receita_extra: number }
    fechamento: { vendas_extra: number; receita_extra: number }
  }
}

function recalcFunilComTaxas(receita: number, taxas: typeof TAXAS_META): Funil {
  const vendas = Math.ceil(receita / TICKET_MEDIO)
  const comparec = Math.ceil(vendas / taxas.fechamento)
  const agend = Math.ceil(comparec / taxas.comparecimento)
  const qualif = Math.ceil(agend / taxas.agendamento)
  const leads = Math.ceil(qualif / taxas.qualificacao)
  const invest = Math.round(leads * CPL_MEDIO)
  const cac = Math.round(invest / vendas)
  const custo_reuniao = Math.round(invest / comparec)
  const du = DIAS_UTEIS_MES || 22
  const su = SEMANAS_MES || 4.33
  return {
    receita,
    mensal: { vendas, comparecimentos: comparec, agendamentos: agend, qualificados: qualif, leads },
    diario: {
      vendas: Math.ceil(vendas / du),
      comparecimentos: Math.ceil(comparec / du),
      agendamentos: Math.ceil(agend / du),
      qualificados: Math.ceil(qualif / du),
      leads: Math.ceil(leads / du),
    },
    semanal: {
      vendas: Math.ceil(vendas / su),
      comparecimentos: Math.ceil(comparec / su),
      agendamentos: Math.ceil(agend / su),
      qualificados: Math.ceil(qualif / su),
      leads: Math.ceil(leads / su),
    },
    custos: {
      investimento_mensal: invest,
      investimento_diario: Math.round(invest / du),
      cac,
      custo_reuniao,
    },
  }
}

// Mostra impacto de otimizar cada taxa do funil mantendo o MESMO investimento/leads
export function analisarSensibilidade(
  leads: number,
  taxaBase: typeof TAXAS_META = TAXAS_META,
): Sensibilidade {
  // Base: quanto entrega com as taxas atuais a partir desses leads
  function rodar(t: typeof TAXAS_META) {
    const qualif = Math.floor(leads * t.qualificacao)
    const agend = Math.floor(qualif * t.agendamento)
    const comp = Math.floor(agend * t.comparecimento)
    const vendas = Math.floor(comp * t.fechamento)
    const receita = vendas * TICKET_MEDIO
    const invest = Math.round(leads * CPL_MEDIO)
    const cac = vendas > 0 ? Math.round(invest / vendas) : 0
    const custo_reuniao = comp > 0 ? Math.round(invest / comp) : 0
    const du = DIAS_UTEIS_MES || 22
    const su = SEMANAS_MES || 4.33
    return {
      receita,
      mensal: { vendas, comparecimentos: comp, agendamentos: agend, qualificados: qualif, leads },
      diario: {
        vendas: Math.ceil(vendas / du),
        comparecimentos: Math.ceil(comp / du),
        agendamentos: Math.ceil(agend / du),
        qualificados: Math.ceil(qualif / du),
        leads: Math.ceil(leads / du),
      },
      semanal: {
        vendas: Math.ceil(vendas / su),
        comparecimentos: Math.ceil(comp / su),
        agendamentos: Math.ceil(agend / su),
        qualificados: Math.ceil(qualif / su),
        leads: Math.ceil(leads / su),
      },
      custos: { investimento_mensal: invest, investimento_diario: Math.round(invest / du), cac, custo_reuniao },
    } as Funil
  }

  const base = rodar(taxaBase)
  const plusAgend = rodar({ ...taxaBase, agendamento: Math.min(1, taxaBase.agendamento + 0.05) })
  const plusComp  = rodar({ ...taxaBase, comparecimento: Math.min(1, taxaBase.comparecimento + 0.05) })
  const plusFech  = rodar({ ...taxaBase, fechamento: Math.min(1, taxaBase.fechamento + 0.05) })

  return {
    base,
    agendamento_plus_5: plusAgend,
    comparecimento_plus_5: plusComp,
    fechamento_plus_5: plusFech,
    ganhos: {
      agendamento: {
        reuniao_extra: plusAgend.mensal.comparecimentos - base.mensal.comparecimentos,
        vendas_extra: plusAgend.mensal.vendas - base.mensal.vendas,
        receita_extra: plusAgend.receita - base.receita,
      },
      comparecimento: {
        reuniao_extra: plusComp.mensal.comparecimentos - base.mensal.comparecimentos,
        vendas_extra: plusComp.mensal.vendas - base.mensal.vendas,
        receita_extra: plusComp.receita - base.receita,
      },
      fechamento: {
        vendas_extra: plusFech.mensal.vendas - base.mensal.vendas,
        receita_extra: plusFech.receita - base.receita,
      },
    },
  }
}

// Apenas re-exporta recalcFunilComTaxas pra quem precisar
export { recalcFunilComTaxas }

// COMPATIBILIDADE — antigos imports de SDR_METAS
export const SDR_METAS = {
  mensal:  SDR_METAS_MENSAIS,
  diario:  SDR_METAS_DIARIAS,
  semanal: SDR_METAS_SEMANAIS,
}

// ══════════════════════════════════════════════════════════════
// COMERCIAL — recebe o fluxo do SDR
// ══════════════════════════════════════════════════════════════
// SDR agenda 15/dia → 10 reuniões chegam ao closer → 3 fechamentos/dia
export const COMERCIAL_METAS = {
  reunioes_mes:       SDR_METAS_MENSAIS.reunioes_esperadas,  // 210 (era 150)
  fechamentos_mes:    SDR_METAS_MENSAIS.vendas_esperadas,    // 63  (era 45)
  mrr_meta:           SDR_METAS_MENSAIS.receita_esperada,    // 126000 (era 90000)
  comissao_pct:       0.10,
  reunioes_dia:       SDR_METAS_DIARIAS.reunioes_esperadas,  // 10
  fechamentos_dia:    SDR_METAS_DIARIAS.vendas_esperadas,    // 3
  reunioes_semana:    SDR_METAS_SEMANAIS.reunioes_esperadas, // 50
  fechamentos_semana: SDR_METAS_SEMANAIS.vendas_esperadas,   // 15
}

// ══════════════════════════════════════════════════════════════
// TRÁFEGO (Marketing) — precisa entregar 62 leads/dia pro SDR
// ══════════════════════════════════════════════════════════════
export const TRAFEGO_METAS = {
  leads_mes:           SDR_METAS_MENSAIS.leads,           // 1302
  leads_dia:           SDR_METAS_DIARIAS.leads,           // 62
  leads_semana:        SDR_METAS_SEMANAIS.leads,          // 310
  // Investimento = leads × CPL
  investimento_mensal: Math.round(SDR_METAS_MENSAIS.leads * CPL_MEDIO), // ~R$13.931
  investimento_dia:    Math.round(SDR_METAS_DIARIAS.leads * CPL_MEDIO),  // ~R$663
  cpl_alvo:            CPL_MEDIO,
  cpl_max:             CPL_MAX,
  cac_max:             LIMITES.cac_max,
}

// ══════════════════════════════════════════════════════════════
// COMPENSAÇÃO INTELIGENTE DE DÉFICIT
// ══════════════════════════════════════════════════════════════
// Se SDR fez menos do que deveria até ontem, redistribui o déficit
// nos dias úteis restantes. Meta de hoje sobe proporcionalmente.
export type MetaAjustada = {
  meta_hoje: number
  meta_base: number
  deficit_acumulado: number
  compensacao_diaria: number
  no_ritmo: boolean
  projecao_fim_mes: number
  dias_restantes: number
  dia_util_atual: number
  mensagem: string
}

export function calcularMetaAjustada(
  metaDiaria: number,
  realizadoNoMes: number,
  diaUtilAtual: number,
  diasUteisMes: number = 21,
): MetaAjustada {
  // Quanto deveria ter até ontem (dia util atual - 1)
  const esperadoAteOntem = metaDiaria * Math.max(0, diaUtilAtual - 1)
  const deficit = Math.max(0, esperadoAteOntem - realizadoNoMes)
  const diasRestantes = Math.max(1, diasUteisMes - diaUtilAtual + 1)

  // Compensação distribuída
  const compensacao = Math.ceil(deficit / diasRestantes)
  const metaHoje = metaDiaria + compensacao

  // Projeção no ritmo atual
  const diasPassados = Math.max(1, diaUtilAtual - 1)
  const ritmoAtual = realizadoNoMes / diasPassados
  const projecao = Math.round(ritmoAtual * diasUteisMes)

  const noRitmo = realizadoNoMes >= esperadoAteOntem

  let mensagem = ''
  if (noRitmo) {
    mensagem = `🔥 No ritmo — meta hoje: ${metaHoje} agendamentos`
  } else if (compensacao <= 3) {
    mensagem = `💪 Pequeno atraso (déficit ${deficit}) — meta hoje: ${metaHoje} (+${compensacao} reposição)`
  } else {
    mensagem = `⚠️ Reposição necessária — meta hoje: ${metaHoje}/dia (déficit de ${deficit} distribuído em ${diasRestantes} dias)`
  }

  return {
    meta_hoje: metaHoje,
    meta_base: metaDiaria,
    deficit_acumulado: deficit,
    compensacao_diaria: compensacao,
    no_ritmo: noRitmo,
    projecao_fim_mes: projecao,
    dias_restantes: diasRestantes,
    dia_util_atual: diaUtilAtual,
    mensagem,
  }
}

// ─── PROGRESSO & COR SEMAFÓRICA ──────────────────────────────────────
export function progressoPct(realizado: number, metaMensal: number): number {
  if (metaMensal <= 0) return 0
  return Math.round((realizado / metaMensal) * 100)
}

export function corProgresso(pct: number): string {
  if (pct >= 100) return '#22c55e'
  if (pct >= 80) return '#4ade80'
  if (pct >= 50) return '#fbbf24'
  if (pct > 0)  return '#fb923c'
  return '#f87171'
}

// ─── LOG DE CONFIG (debug) ───────────────────────────────────────────
export const CONFIG_DEBUG = {
  dias_uteis_mes: DIAS_UTEIS_MES,
  semanas_mes: SEMANAS_MES,
  meta_ativa: META_ATIVA,
  receita_alvo: RECEITA_METAS[META_ATIVA],
  leads_alvo: FUNIL_ATIVO.mensal.leads,
  leads_dia: FUNIL_ATIVO.diario.leads,
}
