// ══════════════════════════════════════════════════════════════════
// METAS DO FUNIL — FONTE ÚNICA DE VERDADE
// ══════════════════════════════════════════════════════════════════
// Tudo (SDR, Comercial, Tráfego, CEO) deriva desta lib.
// Meta de receita mensal → funil reverso → metas de cada etapa.

// ─── CONSTANTES DO NEGÓCIO ────────────────────────────
export const TICKET_MEDIO = 2000        // R$ por venda
export const CPL_MEDIO = 10.70           // R$ por lead
export const DIAS_UTEIS_MES = 22
export const SEMANAS_MES = 4.33

// ─── TAXAS DE CONVERSÃO (METAS CONTRATADAS) ──────────
export const TAXAS = {
  qualificacao: 0.70,    // 70% dos leads viram qualificados
  agendamento: 0.35,     // 35% dos qualificados agendam
  comparecimento: 0.70,  // 70% dos agendamentos comparecem
  fechamento: 0.30,      // 30% dos comparecimentos fecham
}

// ─── TAXAS REAIS (FEV/MAR) — para comparativo + gargalo ────
export const TAXAS_REAIS = {
  qualificacao: 0.75,    // acima da meta
  agendamento: 0.32,     // GARGALO: abaixo da meta
  comparecimento: 0.696, // OK
  fechamento: 0.325,     // acima da meta
}

// ─── METAS DE RECEITA (3 níveis) ────────────────────
export type NivelMeta = 'minima' | 'alvo' | 'super'

export const RECEITA_METAS: Record<NivelMeta, number> = {
  minima: 74000,
  alvo:   90000,
  super:  106000,
}

// ─── LIMITES DE CUSTO ────────────────────────────────
export const LIMITES = {
  cac_max: 300,            // CAC deve ser < R$300
  custo_reuniao_max: 55,   // Custo/reunião ideal < R$55
  cpl_target: 10.70,       // CPL médio alvo
}

// ─── TIPOS ────────────────────────────────────────────
export type Funil = {
  mensal: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  diario: { leads: number; agendamentos: number; comparecimentos: number; vendas: number }
  semanal: { leads: number; agendamentos: number; comparecimentos: number; vendas: number }
  custos: { investimento_mensal: number; cac: number; custo_reuniao: number }
  receita: number
}

// ─── CALCULAR FUNIL COMPLETO A PARTIR DA RECEITA ─────
// Recebe valor mensal de receita alvo, retorna o funil todo reverso.
export function calcularFunil(receita: number): Funil {
  const vendas        = Math.ceil(receita / TICKET_MEDIO)
  const comparec      = Math.ceil(vendas / TAXAS.fechamento)
  const agendamentos  = Math.ceil(comparec / TAXAS.comparecimento)
  const qualificados  = Math.ceil(agendamentos / TAXAS.agendamento)
  const leads         = Math.ceil(qualificados / TAXAS.qualificacao)
  const investimento  = Math.round(leads * CPL_MEDIO)
  const cac           = Math.round(investimento / vendas)
  const custo_reuniao = Math.round(investimento / comparec)

  return {
    receita,
    mensal: { vendas, comparecimentos: comparec, agendamentos, qualificados, leads },
    diario: {
      leads:           Math.ceil(leads / DIAS_UTEIS_MES),
      agendamentos:    Math.ceil(agendamentos / DIAS_UTEIS_MES),
      comparecimentos: Math.ceil(comparec / DIAS_UTEIS_MES),
      vendas:          Math.ceil(vendas / DIAS_UTEIS_MES),
    },
    semanal: {
      leads:           Math.ceil(leads / SEMANAS_MES),
      agendamentos:    Math.ceil(agendamentos / SEMANAS_MES),
      comparecimentos: Math.ceil(comparec / SEMANAS_MES),
      vendas:          Math.ceil(vendas / SEMANAS_MES),
    },
    custos: { investimento_mensal: investimento, cac, custo_reuniao },
  }
}

// ─── PRÉ-CALCULAR OS 3 NÍVEIS (exports imutáveis) ────
export const FUNIL_METAS: Record<NivelMeta, Funil> = {
  minima: calcularFunil(RECEITA_METAS.minima),
  alvo:   calcularFunil(RECEITA_METAS.alvo),
  super:  calcularFunil(RECEITA_METAS.super),
}

// ─── HELPER: meta por período ─────────────────────────
export type Periodo = 'hoje' | 'semana' | 'mes' | 'personalizado'

export function metaPorPeriodo(
  valorMensal: number,
  periodo: Periodo,
  diasRange = 1,
): number {
  switch (periodo) {
    case 'hoje':
      return Math.ceil(valorMensal / DIAS_UTEIS_MES)
    case 'semana':
      return Math.ceil(valorMensal / SEMANAS_MES)
    case 'mes':
      return valorMensal
    case 'personalizado':
      return Math.ceil((valorMensal / DIAS_UTEIS_MES) * diasRange)
  }
}

// ─── HELPER: determinar nível atual pelo valor de vendas do mês ──
export function nivelAtualPorVendas(vendas: number): NivelMeta {
  if (vendas >= FUNIL_METAS.super.mensal.vendas)  return 'super'
  if (vendas >= FUNIL_METAS.alvo.mensal.vendas)   return 'alvo'
  return 'minima'
}

// ─── HELPER: determinar nível atual pela receita ──
export function nivelAtualPorReceita(receita: number): NivelMeta {
  if (receita >= RECEITA_METAS.super)  return 'super'
  if (receita >= RECEITA_METAS.alvo)   return 'alvo'
  return 'minima'
}

// ─── HELPER: detectar gargalo (qual etapa está abaixo) ──
export type Gargalo = {
  etapa: 'qualificacao' | 'agendamento' | 'comparecimento' | 'fechamento'
  real: number
  meta: number
  impacto_pct: number  // quanto perde em vendas por estar abaixo
}

export function detectarGargalo(): Gargalo | null {
  type EtapaKey = 'qualificacao' | 'agendamento' | 'comparecimento' | 'fechamento'
  const etapas: Array<EtapaKey> = ['qualificacao', 'agendamento', 'comparecimento', 'fechamento']

  let pior: { etapa: EtapaKey; diff: number } | null = null
  for (const etapa of etapas) {
    const diff = TAXAS[etapa] - TAXAS_REAIS[etapa]
    if (diff > 0 && (pior === null || diff > pior.diff)) {
      pior = { etapa, diff }
    }
  }

  if (!pior) return null
  return {
    etapa: pior.etapa,
    real: TAXAS_REAIS[pior.etapa],
    meta: TAXAS[pior.etapa],
    impacto_pct: Math.round(pior.diff * 100),
  }
}

// ─── HELPER: progresso real vs meta (% atingido) ──
export function progressoPct(realizado: number, metaMensal: number): number {
  if (metaMensal <= 0) return 0
  return Math.round((realizado / metaMensal) * 100)
}

// ─── HELPER: cor semafórica padronizada ──
export function corProgresso(pct: number): string {
  if (pct >= 100) return '#22c55e'  // verde cheio
  if (pct >= 80) return '#4ade80'   // verde claro
  if (pct >= 50) return '#fbbf24'   // amarelo
  if (pct > 0)  return '#fb923c'    // laranja
  return '#f87171'                  // vermelho (zero)
}
