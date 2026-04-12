// ═══════════════════════════════════════════════════════════════
// EXCALIBUR — MOTOR DE DATAS (dias úteis + feriados BR)
// Fonte única de verdade para cálculo de dias úteis.
// config.ts importa tudo daqui. Nenhum cálculo de data fora deste arquivo.
// ═══════════════════════════════════════════════════════════════

// ─── FERIADOS BR ─────────────────────────────────────────────────────
// Formato YYYY-MM-DD. Nacionais + móveis (Carnaval/Páscoa/Corpus Christi).
export const FERIADOS_BR: readonly string[] = [
  // 2026
  '2026-01-01', // Ano Novo
  '2026-02-16', // Carnaval segunda
  '2026-02-17', // Carnaval terça
  '2026-04-03', // Sexta-feira Santa
  '2026-04-21', // Tiradentes
  '2026-05-01', // Dia do Trabalho
  '2026-06-04', // Corpus Christi
  '2026-09-07', // Independência
  '2026-10-12', // Nossa Senhora Aparecida
  '2026-11-02', // Finados
  '2026-11-15', // Proclamação da República
  '2026-11-20', // Consciência Negra
  '2026-12-25', // Natal
  // 2027
  '2027-01-01',
  '2027-02-08', // Carnaval
  '2027-02-09',
  '2027-03-26', // Sexta Santa
  '2027-04-21',
  '2027-05-01',
  '2027-05-27', // Corpus Christi
  '2027-09-07',
  '2027-10-12',
  '2027-11-02',
  '2027-11-15',
  '2027-11-20',
  '2027-12-25',
]

const FERIADOS_SET = new Set<string>(FERIADOS_BR)

// ─── HELPERS ────────────────────────────────────────────────────────
function toISO(data: Date): string {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── API PÚBLICA ────────────────────────────────────────────────────
export function isDiaUtil(data: Date = new Date()): boolean {
  const dow = data.getDay()
  if (dow === 0 || dow === 6) return false
  return !FERIADOS_SET.has(toISO(data))
}

export function isHojeDiaUtil(): boolean {
  return isDiaUtil(new Date())
}

export function diasUteisNoMes(ano: number, mes: number): number {
  const diasNoMes = new Date(ano, mes, 0).getDate()
  let count = 0
  for (let d = 1; d <= diasNoMes; d++) {
    if (isDiaUtil(new Date(ano, mes - 1, d))) count++
  }
  return count
}

export function diasUteisPassados(
  ano: number,
  mes: number,
  hoje: Date = new Date(),
): number {
  const noMesAtual = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
  const diaLimite = noMesAtual ? hoje.getDate() : new Date(ano, mes, 0).getDate()
  let count = 0
  for (let d = 1; d <= diaLimite; d++) {
    if (isDiaUtil(new Date(ano, mes - 1, d))) count++
  }
  return count
}

export function diasUteisFaltando(
  ano: number,
  mes: number,
  hoje: Date = new Date(),
): number {
  return diasUteisNoMes(ano, mes) - diasUteisPassados(ano, mes, hoje)
}

export function diasUteisDoMesAtual(): number {
  const agora = new Date()
  return diasUteisNoMes(agora.getFullYear(), agora.getMonth() + 1)
}

export function semanasUteisDoMes(): number {
  return diasUteisDoMesAtual() / 5
}

export function semanasUteisNoMes(ano: number, mes: number): number {
  return diasUteisNoMes(ano, mes) / 5
}

export function addDiasUteis(data: Date, dias: number): Date {
  const result = new Date(data)
  let adicionados = 0
  while (adicionados < dias) {
    result.setDate(result.getDate() + 1)
    if (isDiaUtil(result)) adicionados++
  }
  return result
}

export function proximoDiaUtil(data: Date = new Date()): Date {
  const next = new Date(data)
  next.setDate(next.getDate() + 1)
  while (!isDiaUtil(next)) next.setDate(next.getDate() + 1)
  return next
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

// ─── CALENDÁRIO DO MÊS ATUAL (usado pelo /admin/metas) ──────────────
export type CalendarioMes = {
  ano: number
  mes: number
  total: number      // dias úteis do mês
  passados: number   // já ocorridos (inclui hoje)
  faltando: number   // restantes (exclui hoje)
  semanas: number    // total / 5
  hoje_util: boolean
  feriados_no_mes: string[]
}

export function calendarioMesAtual(hoje: Date = new Date()): CalendarioMes {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const total = diasUteisNoMes(ano, mes)
  const passados = diasUteisPassados(ano, mes, hoje)
  const feriadosNoMes = FERIADOS_BR.filter(f => f.startsWith(`${ano}-${String(mes).padStart(2, '0')}`))
  return {
    ano,
    mes,
    total,
    passados,
    faltando: Math.max(0, total - passados),
    semanas: total / 5,
    hoje_util: isHojeDiaUtil(),
    feriados_no_mes: feriadosNoMes,
  }
}

// ─── COMPAT LEGADO (antigas funções do arquivo anterior) ────────────
export function ehDiaUtil(data: Date = new Date()): boolean {
  return isDiaUtil(data)
}

export function diasUteisDecorridosNoMes(hoje: Date = new Date()): number {
  return diasUteisPassados(hoje.getFullYear(), hoje.getMonth() + 1, hoje)
}

export function metaMensalPorDiaria(
  meta_diaria: number,
  ano: number,
  mes: number,
): number {
  return Math.round(meta_diaria * diasUteisNoMes(ano, mes))
}

export function ritmoEsperado(
  meta_mensal: number,
  hoje: Date = new Date(),
): number {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const total = diasUteisNoMes(ano, mes)
  const decorridos = diasUteisPassados(ano, mes, hoje)
  if (total === 0) return 0
  return Math.round((decorridos / total) * meta_mensal)
}

export function corPorPct(
  pct: number,
): { cor: string; nivel: 'critico' | 'atencao' | 'ok' } {
  if (pct >= 80) return { cor: '#4ade80', nivel: 'ok' }
  if (pct >= 40) return { cor: '#fbbf24', nivel: 'atencao' }
  return { cor: '#f87171', nivel: 'critico' }
}

export function corPorRitmo(
  atual: number,
  metaMensal: number,
  hoje: Date = new Date(),
): {
  cor: string
  nivel: 'critico' | 'atencao' | 'ok'
  pct_esperado: number
  pct_real: number
} {
  if (metaMensal === 0)
    return { cor: '#6b7280', nivel: 'critico', pct_esperado: 0, pct_real: 0 }
  const esperado = ritmoEsperado(metaMensal, hoje)
  const pctReal = Math.round((atual / metaMensal) * 100)
  const pctDoEsperado = esperado > 0 ? Math.round((atual / esperado) * 100) : 0
  if (atual === 0)
    return { cor: '#f87171', nivel: 'critico', pct_esperado: esperado, pct_real: pctReal }
  const { cor, nivel } = corPorPct(pctDoEsperado)
  return { cor, nivel, pct_esperado: esperado, pct_real: pctReal }
}
