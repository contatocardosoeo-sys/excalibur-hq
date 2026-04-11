// Lib compartilhada do setor /trafego-clientes
// Benchmarks reais odontologia BR + utilitários

export type CplNivel = 'excelente' | 'media' | 'atencao' | 'critico' | 'sem'

export type Especialidade = 'geral' | 'implante' | 'clareamento' | 'ortodontia' | 'emergencia' | 'protese' | 'endodontia'

export const BENCHMARKS = {
  cpl: {
    excelente: 12,   // < R$12
    media: 20,       // R$12-20
    atencao: 35,     // R$20-35
    // > R$35 = crítico
  },
  ctr: {
    min: 0.8,
    max: 1.2,
  },
  cvr: 9.83,
  cpcMedioUsd: 9.78,
  tempoResposta: {
    excelente: 5,    // < 5min
    bom: 15,
    atencao: 60,
  },
} as const

export const CPL_POR_ESPECIALIDADE: Record<Especialidade, { min: number; max: number; emoji: string; label: string }> = {
  geral:       { min: 8,  max: 15, emoji: '🦷', label: 'Geral' },
  clareamento: { min: 10, max: 20, emoji: '✨', label: 'Clareamento' },
  ortodontia:  { min: 15, max: 30, emoji: '😁', label: 'Ortodontia' },
  implante:    { min: 25, max: 50, emoji: '🔩', label: 'Implante' },
  emergencia:  { min: 5,  max: 12, emoji: '🚨', label: 'Emergência' },
  protese:     { min: 15, max: 30, emoji: '🦷', label: 'Prótese' },
  endodontia:  { min: 12, max: 25, emoji: '🦷', label: 'Endodontia' },
}

export function avaliarCpl(cpl: number): { nivel: CplNivel; label: string; cor: string } {
  if (!cpl || cpl <= 0) return { nivel: 'sem', label: 'Sem dados', cor: 'text-gray-500' }
  if (cpl < BENCHMARKS.cpl.excelente) return { nivel: 'excelente', label: 'Excelente', cor: 'text-green-400' }
  if (cpl <= BENCHMARKS.cpl.media) return { nivel: 'media', label: 'Na média', cor: 'text-amber-400' }
  if (cpl <= BENCHMARKS.cpl.atencao) return { nivel: 'atencao', label: 'Atenção', cor: 'text-orange-400' }
  return { nivel: 'critico', label: 'Crítico', cor: 'text-red-400' }
}

export function badgeCpl(cpl: number): { emoji: string; label: string; classe: string } {
  const a = avaliarCpl(cpl)
  const map: Record<CplNivel, { emoji: string; classe: string }> = {
    excelente: { emoji: '🟢', classe: 'bg-green-500/10 text-green-400 border-green-500/40' },
    media:     { emoji: '🟡', classe: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
    atencao:   { emoji: '🟠', classe: 'bg-orange-500/10 text-orange-400 border-orange-500/40' },
    critico:   { emoji: '🔴', classe: 'bg-red-500/10 text-red-400 border-red-500/40' },
    sem:       { emoji: '⚪', classe: 'bg-gray-500/10 text-gray-500 border-gray-600' },
  }
  return { ...map[a.nivel], label: a.label }
}

export function avaliarTempoResposta(min: number | null | undefined): { nivel: string; label: string; cor: string } {
  if (min == null) return { nivel: 'sem', label: 'Sem dados', cor: 'text-gray-500' }
  if (min < BENCHMARKS.tempoResposta.excelente) return { nivel: 'excelente', label: 'Excelente', cor: 'text-green-400' }
  if (min <= BENCHMARKS.tempoResposta.bom) return { nivel: 'bom', label: 'Bom', cor: 'text-amber-400' }
  if (min <= BENCHMARKS.tempoResposta.atencao) return { nivel: 'atencao', label: 'Atenção', cor: 'text-orange-400' }
  return { nivel: 'critico', label: 'Crítico', cor: 'text-red-400' }
}

// Calcula score 0-100 de saúde do tráfego da clínica
export type ScoreInput = {
  meta_cpl: number
  cpl_medio_mes: number
  meta_leads: number
  leads_mes: number
  ultima_otimizacao: string | null
  ultima_data_metrica: string | null
  status: string
}

export function calcularScore(i: ScoreInput): number {
  let score = 100

  // CPL vs meta (peso 30)
  if (i.meta_cpl > 0 && i.cpl_medio_mes > 0) {
    const ratio = i.cpl_medio_mes / i.meta_cpl
    if (ratio > 2) score -= 30
    else if (ratio > 1.5) score -= 20
    else if (ratio > 1.2) score -= 10
    else if (ratio <= 0.8) score += 5
  } else {
    score -= 15
  }

  // Volume de leads vs meta (peso 25)
  const pctLeads = i.meta_leads > 0 ? i.leads_mes / i.meta_leads : 1
  if (pctLeads < 0.5) score -= 25
  else if (pctLeads < 0.8) score -= 15
  else if (pctLeads < 1.0) score -= 5

  // Dias sem otimização (peso 20)
  const diasSemOtim = i.ultima_otimizacao
    ? Math.floor((Date.now() - new Date(i.ultima_otimizacao).getTime()) / 86400000)
    : 30
  if (diasSemOtim > 14) score -= 20
  else if (diasSemOtim > 7) score -= 10

  // Dias sem lançar dados (peso 15)
  const diasSemDados = i.ultima_data_metrica
    ? Math.floor((Date.now() - new Date(i.ultima_data_metrica).getTime()) / 86400000)
    : 7
  if (diasSemDados > 3) score -= 15
  else if (diasSemDados > 1) score -= 5

  // Status pausado (peso 10)
  if (i.status === 'pausado') score -= 10

  return Math.max(0, Math.min(100, score))
}

export function nivelScore(s: number): { emoji: string; label: string; cor: string; classe: string } {
  if (s >= 80) return { emoji: '🟢', label: 'Saudável', cor: 'text-green-400', classe: 'bg-green-500/10 border-green-500/40' }
  if (s >= 60) return { emoji: '🟡', label: 'Atenção', cor: 'text-amber-400', classe: 'bg-amber-500/10 border-amber-500/40' }
  if (s >= 40) return { emoji: '🟠', label: 'Risco', cor: 'text-orange-400', classe: 'bg-orange-500/10 border-orange-500/40' }
  return { emoji: '🔴', label: 'Crítico', cor: 'text-red-400', classe: 'bg-red-500/10 border-red-500/40' }
}

// Limpa nomes sujos das clínicas (valores monetários, info de pagamento)
export function limparNomeClinica(nome: string | null | undefined): string {
  if (!nome) return ''
  return nome
    .replace(/\d{1,3}(\.\d{3})*,\d{2}/g, '')
    .replace(/paga em \d+x.*/gi, '')
    .replace(/dia e dia \d+.*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fmtReais(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 0 })
}

export function deltaPct(atual: number, anterior: number): { pct: number; direcao: 'up' | 'down' | 'flat' } {
  if (anterior === 0) return { pct: 0, direcao: 'flat' }
  const pct = Math.round(((atual - anterior) / anterior) * 1000) / 10
  return { pct, direcao: pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat' }
}
