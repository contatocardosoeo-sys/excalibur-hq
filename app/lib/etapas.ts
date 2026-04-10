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
}

export function etapaLabel(etapa?: string | null): string {
  if (!etapa) return '—'
  return ETAPA_LABEL[etapa] || etapa.replace(/_/g, ' ')
}

export function faseLabel(fase?: string | null): string {
  if (!fase) return '—'
  return FASE_LABEL[fase] || fase
}
