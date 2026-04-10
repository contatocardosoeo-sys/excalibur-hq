/**
 * Utilitários compartilhados — Excalibur HQ
 * Funções puras, sem side effects
 */

/**
 * Retorna a semana ISO no formato YYYY-Www
 * Usado para chave da tabela adocao_clinica
 */
export function getWeekString(date: Date = new Date()): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum =
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7
    )
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}

/**
 * Formata número como BRL
 */
export function fmtReal(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

/**
 * Formata número como BRL sem decimais
 */
export function fmtRealCurto(v: number): string {
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

/**
 * Formata data ISO para dd/mm
 */
export function fmtData(d: string | null): string {
  if (!d) return '-'
  const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Formata data ISO completa pt-BR
 */
export function fmtDataCompleta(d: string | null): string {
  if (!d) return '-'
  const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d)
  return dt.toLocaleDateString('pt-BR')
}

/**
 * Tempo desde uma data (ex: "2h", "5d", "agora")
 */
export function tempoAtras(d: string): string {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

/**
 * Calcula percentual seguro (evita divisão por zero)
 */
export function pct(a: number, b: number): number {
  return b > 0 ? Math.round((a / b) * 100) : 0
}

/**
 * Retorna cor baseada em percentual de meta
 * verde >= 80, amarelo >= 50, vermelho < 50
 */
export function corMeta(p: number): string {
  if (p >= 80) return '#22c55e'
  if (p >= 50) return '#fbbf24'
  return '#ef4444'
}

/**
 * Retorna cor baseada em score (0-100)
 * verde >= 80, amarelo >= 60, vermelho < 60
 */
export function corScore(s: number): string {
  if (s >= 80) return '#4ade80'
  if (s >= 60) return '#fbbf24'
  return '#f87171'
}
