export interface HealthScoreInput {
  assistiu_onboarding: boolean
  participa_aulas_ao_vivo: boolean
  usa_crm: boolean
  responde_leads: boolean
  usa_script: boolean
  preenche_planilha: boolean
  responde_relatorio: boolean
  campanha_ativa: boolean
  leads_chegando: boolean
  taxa_resposta_boa: boolean
  segue_processo: boolean
  realizou_vendas: boolean
  vendas_recorrentes: boolean
  roi_positivo: boolean
}

export interface HealthScoreResult {
  adocao: number
  operacao: number
  resultado: number
  total: number
  classificacao: 'saudavel' | 'atencao' | 'risco'
}

export function calcularHealthScore(dados: HealthScoreInput): HealthScoreResult {
  const adocao =
    (dados.assistiu_onboarding ? 5 : 0) +
    (dados.participa_aulas_ao_vivo ? 5 : 0) +
    (dados.usa_crm ? 5 : 0) +
    (dados.responde_leads ? 10 : 0) +
    (dados.usa_script ? 5 : 0) +
    (dados.preenche_planilha ? 5 : 0) +
    (dados.responde_relatorio ? 5 : 0)

  const operacao =
    (dados.campanha_ativa ? 5 : 0) +
    (dados.leads_chegando ? 5 : 0) +
    (dados.taxa_resposta_boa ? 10 : 0) +
    (dados.segue_processo ? 10 : 0)

  const resultado =
    (dados.realizou_vendas ? 10 : 0) +
    (dados.vendas_recorrentes ? 10 : 0) +
    (dados.roi_positivo ? 10 : 0)

  const total = adocao + operacao + resultado
  const classificacao = total >= 80 ? 'saudavel' : total >= 60 ? 'atencao' : 'risco'

  return { adocao, operacao, resultado, total, classificacao }
}

export interface ClienteBase {
  ultimo_contato: string
  sla_estourado?: boolean
  dias_na_etapa?: number
  crm_ativo?: boolean
  dias_sem_venda?: number
  campanha_ativa?: boolean
  leads_semana?: number
  score_total?: number
  usa_script?: boolean
  preenche_planilha?: boolean
}

export function detectarProblema(cliente: ClienteBase) {
  const horas = (Date.now() - new Date(cliente.ultimo_contato).getTime()) / 3600000
  if (horas > 72) return { texto: `Sem contato ha ${Math.floor(horas / 24)} dias`, nivel: 'critica' as const }
  if (horas > 48) return { texto: 'Sem contato +48h', nivel: 'critica' as const }
  if (cliente.sla_estourado) return { texto: `SLA estourado — D${cliente.dias_na_etapa}`, nivel: 'critica' as const }
  if (!cliente.crm_ativo) return { texto: 'CRM nao implementado', nivel: 'alta' as const }
  if ((cliente.dias_sem_venda ?? 0) > 7) return { texto: `Sem venda ha ${cliente.dias_sem_venda} dias`, nivel: 'alta' as const }
  if (cliente.campanha_ativa && (cliente.leads_semana ?? 0) === 0) return { texto: 'Campanha ativa sem lead', nivel: 'alta' as const }
  if ((cliente.score_total ?? 0) >= 80) return { texto: 'Saudavel — oportunidade de upsell', nivel: 'ok' as const }
  return { texto: 'Monitorar evolucao', nivel: 'media' as const }
}

export function gerarProximaAcao(cliente: ClienteBase): string {
  if (!cliente.crm_ativo) return 'Ativar CRM hoje'
  if (cliente.sla_estourado) return 'Call urgente — SLA estourado'
  if ((cliente.dias_sem_venda ?? 0) > 7) return 'Revisar script comercial'
  if (cliente.campanha_ativa && (cliente.leads_semana ?? 0) === 0) return 'Revisar criativos urgente'
  if (!cliente.usa_script) return 'Implementar script de vendas'
  if (!cliente.preenche_planilha) return 'Ativar rotina de planilha'
  if ((cliente.score_total ?? 0) >= 80) return 'Propor upsell ou expansao'
  return 'Agendar reuniao de alinhamento'
}
