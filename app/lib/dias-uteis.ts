// Excalibur opera APENAS em dias úteis (seg-sex).
// Toda meta mensal é calculada como valor_diario * diasUteisNoMes.
// TODO futuro: adicionar tabela de feriados nacionais + regionais.

/**
 * Conta quantos dias úteis (seg-sex) tem num mês/ano.
 */
export function diasUteisNoMes(ano: number, mes: number): number {
  // mes é 1-indexado (1=jan, 12=dez)
  let count = 0
  const diasNoMes = new Date(ano, mes, 0).getDate()
  for (let d = 1; d <= diasNoMes; d++) {
    const data = new Date(ano, mes - 1, d)
    const dow = data.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

/**
 * Conta quantos dias úteis já passaram neste mês (inclui hoje).
 * Útil pra calcular "estimativa linear": quanto deveria já ter acumulado.
 */
export function diasUteisDecorridosNoMes(hoje: Date = new Date()): number {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() // 0-indexado
  let count = 0
  for (let d = 1; d <= hoje.getDate(); d++) {
    const data = new Date(ano, mes, d)
    const dow = data.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return count
}

/**
 * Dia é útil?
 */
export function ehDiaUtil(data: Date = new Date()): boolean {
  const dow = data.getDay()
  return dow !== 0 && dow !== 6
}

/**
 * Calcula meta mensal a partir de meta diária (baseada em dias úteis do mês).
 */
export function metaMensalPorDiaria(meta_diaria: number, ano: number, mes: number): number {
  return Math.round(meta_diaria * diasUteisNoMes(ano, mes))
}

/**
 * Calcula ritmo esperado até hoje (linear).
 * Ex: se estamos no 10º dia útil de 22, o esperado é 10/22 * meta.
 */
export function ritmoEsperado(meta_mensal: number, hoje: Date = new Date()): number {
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const total = diasUteisNoMes(ano, mes)
  const decorridos = diasUteisDecorridosNoMes(hoje)
  if (total === 0) return 0
  return Math.round((decorridos / total) * meta_mensal)
}

/**
 * Classifica percentual vs meta em cor semafórica.
 * < 40% = crítico (vermelho) · 40-79% = atenção (amarelo) · >= 80% = ok (verde)
 */
export function corPorPct(pct: number): { cor: string; nivel: 'critico' | 'atencao' | 'ok' } {
  if (pct >= 80) return { cor: '#4ade80', nivel: 'ok' }
  if (pct >= 40) return { cor: '#fbbf24', nivel: 'atencao' }
  return { cor: '#f87171', nivel: 'critico' }
}

/**
 * Calcula cor com base em valor_atual vs meta_mensal + dias decorridos.
 * Se está em dia com o ritmo esperado, retorna verde.
 * Se está abaixo mas não muito, amarelo.
 * Se está muito abaixo ou em zero, vermelho.
 */
export function corPorRitmo(atual: number, metaMensal: number, hoje: Date = new Date()): { cor: string; nivel: 'critico' | 'atencao' | 'ok'; pct_esperado: number; pct_real: number } {
  if (metaMensal === 0) return { cor: '#6b7280', nivel: 'critico', pct_esperado: 0, pct_real: 0 }
  const esperado = ritmoEsperado(metaMensal, hoje)
  const pctReal = Math.round((atual / metaMensal) * 100)
  const pctDoEsperado = esperado > 0 ? Math.round((atual / esperado) * 100) : 0

  // Zero absoluto = crítico vermelho
  if (atual === 0) return { cor: '#f87171', nivel: 'critico', pct_esperado: esperado, pct_real: pctReal }

  // Comparar com esperado (não meta total)
  const { cor, nivel } = corPorPct(pctDoEsperado)
  return { cor, nivel, pct_esperado: esperado, pct_real: pctReal }
}
