'use client'

export type TipoEvento =
  // EMPRESA TODA
  | 'venda_fechada' | 'marco_d7' | 'marco_d30' | 'nova_clinica_ativa'
  | 'meta_mensal_sdr' | 'meta_empresa' | 'agendamento_meta'
  // SDR ↔ CLOSER
  | 'agendamento' | 'comparecimento' | 'reuniao_concluida'
  // CLOSER ↔ CS
  | 'cliente_handoff'
  // TRÁFEGO → SDR
  | 'lead_chegou' | 'lote_leads'
  // CEO + FINANCEIRO
  | 'pagamento_recebido' | 'folha_paga' | 'recorde_mrr' | 'meta_mrr'
  | 'pagamento_atrasado' | 'caixa_critico'
  // CEO + SETOR
  | 'gargalo_trafego' | 'cliente_risco' | 'sdr_sem_leads' | 'cac_alto'
  // PRIVADO
  | 'lead_recebido' | 'contato_feito' | 'proposta_enviada'
  | 'tarefa_concluida' | 'tarefa_atrasada' | 'cpl_otimo' | 'meta_diaria_sdr'

// Mapa de camadas: quem vê cada evento
export const CAMADAS_EVENTO: Record<TipoEvento, { camada: string; roles: string[] }> = {
  // TODOS VÊM
  venda_fechada:       { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  marco_d7:            { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  marco_d30:           { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  nova_clinica_ativa:  { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  meta_mensal_sdr:     { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  meta_empresa:        { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  agendamento_meta:    { camada: 'todos',          roles: ['admin','coo','cs','sdr','closer','cmo'] },
  // SDR ↔ CLOSER
  agendamento:         { camada: 'sdr_closer',     roles: ['sdr','closer','admin','coo'] },
  comparecimento:      { camada: 'sdr_closer',     roles: ['sdr','closer','admin','coo'] },
  reuniao_concluida:   { camada: 'sdr_closer',     roles: ['sdr','closer','admin','coo'] },
  // CLOSER ↔ CS
  cliente_handoff:     { camada: 'closer_cs',      roles: ['closer','cs','admin','coo'] },
  // TRÁFEGO → SDR
  lead_chegou:         { camada: 'trafego_sdr',    roles: ['cmo','sdr','admin','coo'] },
  lote_leads:          { camada: 'trafego_sdr',    roles: ['cmo','sdr','admin','coo'] },
  // CEO + FINANCEIRO
  pagamento_recebido:  { camada: 'ceo_financeiro', roles: ['admin','coo','financeiro'] },
  folha_paga:          { camada: 'ceo_financeiro', roles: ['admin','coo','financeiro'] },
  recorde_mrr:         { camada: 'ceo_financeiro', roles: ['admin','coo','financeiro'] },
  meta_mrr:            { camada: 'ceo_financeiro', roles: ['admin','coo','financeiro'] },
  pagamento_atrasado:  { camada: 'ceo_financeiro', roles: ['admin','coo','financeiro'] },
  caixa_critico:       { camada: 'ceo_financeiro', roles: ['admin','coo','financeiro'] },
  // CEO + SETOR
  gargalo_trafego:     { camada: 'ceo_setor',      roles: ['admin','coo','cmo'] },
  cliente_risco:       { camada: 'ceo_setor',      roles: ['admin','coo','cs'] },
  sdr_sem_leads:       { camada: 'ceo_setor',      roles: ['admin','coo','cmo','sdr'] },
  cac_alto:            { camada: 'ceo_setor',      roles: ['admin','coo','cmo'] },
  // PRIVADO
  lead_recebido:       { camada: 'privado',        roles: ['sdr'] },
  contato_feito:       { camada: 'privado',        roles: ['sdr'] },
  proposta_enviada:    { camada: 'privado',        roles: ['closer'] },
  tarefa_concluida:    { camada: 'privado',        roles: ['cs'] },
  tarefa_atrasada:     { camada: 'privado',        roles: ['cs'] },
  cpl_otimo:           { camada: 'privado',        roles: ['cmo'] },
  meta_diaria_sdr:     { camada: 'privado',        roles: ['sdr'] },
}

interface EventoPayload {
  tipo: TipoEvento
  titulo: string
  mensagem: string
  usuario_nome?: string
  valor?: number
  metadata?: Record<string, unknown>
}

export function useDispararEvento() {
  const disparar = async (payload: EventoPayload) => {
    const config = CAMADAS_EVENTO[payload.tipo]
    if (!config) {
      console.error('Tipo de evento desconhecido:', payload.tipo)
      return null
    }
    try {
      const r = await fetch('/api/hq/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          camada: config.camada,
          roles_visibilidade: config.roles,
        }),
      })
      if (!r.ok) return null
      const evento = await r.json()
      // Broadcast local para outras abas no mesmo device
      try {
        const ch = new BroadcastChannel('excalibur-eventos')
        ch.postMessage(evento)
        ch.close()
      } catch { /* ambiente sem BroadcastChannel */ }
      return evento
    } catch (e) {
      console.error('Erro ao disparar evento:', e)
      return null
    }
  }
  return { disparar }
}
