export const ETIQUETAS_SDR: Record<string, string> = {
  'novo': 'prospeccao', 'novo lead': 'prospeccao', 'prospeccao': 'prospeccao',
  'prospecção': 'prospeccao', 'nao respondeu': 'prospeccao', 'não respondeu': 'prospeccao',
  'contato': 'contato', 'em contato': 'contato', 'qualificado': 'contato',
  'agendado': 'agendado', 'reuniao agendada': 'agendado', 'reunião agendada': 'agendado', 'confirmado': 'agendado',
  'reuniao feita': 'reuniao_feita', 'reunião feita': 'reuniao_feita', 'reuniao realizada': 'reuniao_feita', 'compareceu': 'reuniao_feita',
  'perdido': 'perdido', 'sem interesse': 'perdido', 'descartado': 'perdido', 'nao qualificado': 'perdido', 'não qualificado': 'perdido',
}

export const ETIQUETAS_CLOSER: Record<string, string> = {
  'proposta': 'proposta_enviada', 'proposta enviada': 'proposta_enviada',
  'em negociacao': 'proposta_enviada', 'em negociação': 'proposta_enviada',
  'fechado': 'fechado', 'fechamento': 'fechado', 'ganho': 'fechado', 'cliente': 'fechado',
  'perdido': 'perdido', 'lost': 'perdido', 'sem interesse': 'perdido',
}

export const EVENTOS_MAP: Record<string, string> = {
  'Anuncio do Instagram': 'lead_anuncio', 'Encerrar Atendimento': 'atendimento_encerrado',
  'Respostas Rapidas': 'resposta_rapida', 'Auto Atendimento': 'bot_respondeu',
  'Follow Up': 'follow_up', 'Agendamento': 'agendamento', 'CRM': 'movimento_crm',
  'Etiqueta': 'etiqueta_adicionada', 'Mensagens': 'mensagem_enviada',
}

export function normalizarEtiqueta(etiqueta: string): string {
  return etiqueta?.toLowerCase().trim().replace(/[_-]/g, ' ') || ''
}

export function mapearEtapaSDR(etiqueta: string): string | null {
  return ETIQUETAS_SDR[normalizarEtiqueta(etiqueta)] || null
}

export function mapearEtapaCloser(etiqueta: string): string | null {
  return ETIQUETAS_CLOSER[normalizarEtiqueta(etiqueta)] || null
}
