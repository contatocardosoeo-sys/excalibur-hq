// ═══════════════════════════════════════════════════════════════
// EXCALIBUR HQ — ARQUIVO MÃE DE CONFIGURAÇÃO
// Toda meta, prazo, divisor e cálculo do sistema vem daqui.
// Para mudar qualquer parâmetro global: altere SÓ este arquivo.
// ═══════════════════════════════════════════════════════════════

// ─── FERIADOS BR 2026 (feriados nacionais + Carnaval/Sexta-Santa) ─────
// Sexta-Santa 2026 = 03/04 · Tiradentes = 21/04 · etc.
const FERIADOS_2026 = [
  '2026-01-01', // Ano Novo
  '2026-02-16', // Carnaval (segunda)
  '2026-02-17', // Carnaval (terça)
  '2026-04-03', // Sexta-feira Santa
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-09-07', // Independência
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-15', // Proclamação da República
  '2026-11-20', // Consciência Negra (dia nacional)
  '2026-12-25', // Natal
]

const FERIADOS: string[] = [...FERIADOS_2026]

// ─── FUNÇÕES DE DIAS ÚTEIS ────────────────────────────────────────────
export function isDiaUtil(data: Date): boolean {
  const dow = data.getDay() // 0=dom, 6=sab
  if (dow === 0 || dow === 6) return false
  // formato YYYY-MM-DD local-safe
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  const iso = `${y}-${m}-${d}`
  return !FERIADOS.includes(iso)
}

export function diasUteisNoMes(ano: number, mes: number): number {
  const diasNoMes = new Date(ano, mes, 0).getDate()
  let count = 0
  for (let d = 1; d <= diasNoMes; d++) {
    if (isDiaUtil(new Date(ano, mes - 1, d))) count++
  }
  return count
}

export function diasUteisPassados(ano: number, mes: number, hoje: Date = new Date()): number {
  const diaHoje = (hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes) ? hoje.getDate() : new Date(ano, mes, 0).getDate()
  let count = 0
  for (let d = 1; d <= diaHoje; d++) {
    if (isDiaUtil(new Date(ano, mes - 1, d))) count++
  }
  return count
}

export function diasUteisFaltando(ano: number, mes: number, hoje: Date = new Date()): number {
  return diasUteisNoMes(ano, mes) - diasUteisPassados(ano, mes, hoje)
}

export function isHojeDiaUtil(): boolean {
  return isDiaUtil(new Date())
}

export function diasUteisDoMesAtual(): number {
  const agora = new Date()
  return diasUteisNoMes(agora.getFullYear(), agora.getMonth() + 1)
}

export function semanasUteisDoMes(): number {
  return diasUteisDoMesAtual() / 5
}

// Adiciona N dias úteis a partir de uma data (pula sáb/dom/feriados)
export function addDiasUteis(data: Date, dias: number): Date {
  const result = new Date(data)
  let adicionados = 0
  while (adicionados < dias) {
    result.setDate(result.getDate() + 1)
    if (isDiaUtil(result)) adicionados++
  }
  return result
}

export function diasUteisEntre(inicio: Date, fim: Date): number {
  let count = 0
  const current = new Date(inicio)
  while (current <= fim) {
    if (isDiaUtil(current)) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function proximoDiaUtil(data: Date = new Date()): Date {
  const next = new Date(data)
  next.setDate(next.getDate() + 1)
  while (!isDiaUtil(next)) next.setDate(next.getDate() + 1)
  return next
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
  fechamento: 0.30,
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

// ─── METAS POR SETOR (vêm do FUNIL_ATIVO, nunca hardcoded) ──────────
export const SDR_METAS = {
  mensal:  FUNIL_ATIVO.mensal,
  diario:  FUNIL_ATIVO.diario,
  semanal: FUNIL_ATIVO.semanal,
}

export const COMERCIAL_METAS = {
  reunioes_mes:    FUNIL_ATIVO.mensal.comparecimentos, // 150
  fechamentos_mes: FUNIL_ATIVO.mensal.vendas,           // 45
  mrr_meta:        RECEITA_METAS[META_ATIVA],           // 90000
  comissao_pct:    0.10,
  reunioes_dia:    FUNIL_ATIVO.diario.comparecimentos,
  fechamentos_dia: FUNIL_ATIVO.diario.vendas,
  reunioes_semana: FUNIL_ATIVO.semanal.comparecimentos,
  fechamentos_semana: FUNIL_ATIVO.semanal.vendas,
}

export const TRAFEGO_METAS = {
  leads_mes:           FUNIL_ATIVO.mensal.leads,        // 879
  leads_dia:           FUNIL_ATIVO.diario.leads,
  leads_semana:        FUNIL_ATIVO.semanal.leads,
  investimento_mensal: FUNIL_ATIVO.custos.investimento_mensal,
  investimento_dia:    FUNIL_ATIVO.custos.investimento_diario,
  cpl_alvo:            CPL_MEDIO,
  cpl_max:             CPL_MAX,
  cac_max:             LIMITES.cac_max,
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
