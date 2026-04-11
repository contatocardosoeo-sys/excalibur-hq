// Mapeamento de etapas técnicas do banco para labels humanos em PT-BR
export const ETAPA_LABEL: Record<string, string> = {
  D0_NOVO: '📋 Início',
  D0_PAGAMENTO: '💳 Pagamento',
  D1_ATIVACAO: '⚙️ Ativação',
  D3_ONBOARDING: '🎓 Onboarding',
  D7_ATIVADO: '🚀 Ativado',
  D7: '🏁 Semana 1',
  D15_ADOCAO: '📈 Adoção',
  D15: '📊 Duas semanas',
  D30_CONSOLIDACAO: '💪 Consolidado',
  D30: '💎 Um mês',
  D45: '🔥 45 dias',
  D60: '⭐ Dois meses',
  D90_RETENCAO: '👑 Retido',
  D90: '🏆 Três meses',
  D90_EMBARCADO: '🚀 Embarcado (Escala)',
  RISCO: '⚠️ Em risco',
  CRITICO: '🚨 Crítico',
  CHURN: '💀 Churn',
}

// Etapas de tarefa (fase) usadas em tarefas_jornada
export const FASE_LABEL: Record<string, string> = {
  'D1-D2': 'Dia 1–2',
  'D2-D3': 'Dia 2–3',
  'D3-D7': 'Dia 3–7',
  'D7': 'Dia 7',
  'D7-D15': 'Dia 7–15',
  'D15': 'Dia 15',
  'D15-D30': 'Dia 15–30',
  'D30': 'Dia 30',
  'D90+': 'D90+ (Escala)',
}

// Categorias de tarefas pós-D90 (playbooks de Customer Marketing)
export const D90_CATEGORIAS = ['indicacao', 'upsell', 'manutencao', 'novo_produto'] as const
export type D90Categoria = typeof D90_CATEGORIAS[number]

export const D90_CATEGORIA_LABEL: Record<D90Categoria, { emoji: string; label: string; cor: string }> = {
  indicacao:    { emoji: '🤝', label: 'Pedir indicação', cor: '#22c55e' },
  upsell:       { emoji: '📈', label: 'Upsell de plano', cor: '#f59e0b' },
  manutencao:   { emoji: '🛠️', label: 'Manutenção da conta', cor: '#3b82f6' },
  novo_produto: { emoji: '🆕', label: 'Novo produto', cor: '#a855f7' },
}

export function etapaLabel(etapa?: string | null): string {
  if (!etapa) return '—'
  return ETAPA_LABEL[etapa] || etapa.replace(/_/g, ' ')
}

export function faseLabel(fase?: string | null): string {
  if (!fase) return '—'
  return FASE_LABEL[fase] || fase
}
