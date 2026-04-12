export interface TourStep {
  id: string
  elementId: string
  title: string
  body: string
  action: string
  actionRequired?: string
  position: 'top' | 'bottom' | 'left' | 'right' | 'center'
}

export const TOUR_CS: TourStep[] = [
  {
    id: 'cs-1', elementId: 'kpi-score-medio', position: 'bottom',
    title: 'Score médio da carteira',
    body: 'Este é o número mais importante do seu dia. Representa a saúde média de todos os seus clientes. Abaixo de 70 = atenção. Abaixo de 50 = emergência.',
    action: 'Observe o número. Está verde, amarelo ou vermelho?',
  },
  {
    id: 'cs-2', elementId: 'kpi-alertas', position: 'bottom',
    title: 'Clientes em risco',
    body: 'Esses clientes precisam de você AGORA. Antes de qualquer outra tarefa, verifique este número. Zero alertas = você está em dia.',
    action: 'Clique para ver quais clientes estão em risco.',
    actionRequired: 'click:#kpi-alertas',
  },
  {
    id: 'cs-3', elementId: 'lista-clientes', position: 'right',
    title: 'Sua carteira de clientes',
    body: 'Cada linha é um cliente ativo. Cor do score: verde (>75) amarelo (50-75) vermelho (<50). A etapa D7/D30/D90 mostra há quanto tempo está com você.',
    action: 'Clique no cliente com o menor score.',
    actionRequired: 'click:.client-row',
  },
  {
    id: 'cs-4', elementId: 'btn-checkin', position: 'top',
    title: 'Check-in — seu ato mais importante',
    body: 'TODA interação com cliente precisa ser registrada aqui. Ligação, WhatsApp, reunião — tudo. Sem registro = o sistema não sabe que você agiu.',
    action: 'Faça seu primeiro check-in agora.',
    actionRequired: 'click:#btn-checkin',
  },
  {
    id: 'cs-5', elementId: 'etapas-jornada', position: 'bottom',
    title: 'Jornada D0 → D90',
    body: 'Cada cliente passa por etapas em dias úteis. D7 = primeira semana. D30 = primeiro mês. D90 = três meses. O sistema avisa quando chegou a hora de cada tarefa.',
    action: 'Veja em qual etapa está cada cliente.',
  },
  {
    id: 'cs-6', elementId: 'sidebar-nav', position: 'right',
    title: 'Suas páginas',
    body: '/cs é sua casa — começa aqui todo dia. /jornada é o mapa visual. /escritorio é comunicação interna. Minha Trilha mostra seu progresso.',
    action: 'Tour concluído! Agora execute sua primeira missão. ⚔️',
  },
]

export const TOUR_SDR: TourStep[] = [
  {
    id: 'sdr-1', elementId: 'kpi-agendamentos-hoje', position: 'bottom',
    title: 'Sua meta do dia',
    body: '12 agendamentos por dia útil. Cada agendamento seu = chance de reunião = chance de venda = receita para todos.',
    action: 'Veja quantos você já fez hoje vs a meta.',
  },
  {
    id: 'sdr-2', elementId: 'etapas-funil', position: 'right',
    title: 'As 10 etapas do funil',
    body: 'Recepção → Explicação → Qualificação → Agendamento → Confirmação → Reagendar → Sem CNPJ → Futuro → Lista Fria → Fora do ICP.',
    action: 'Encontre onde está a maioria dos seus leads.',
  },
  {
    id: 'sdr-3', elementId: 'painel-comissao', position: 'bottom',
    title: 'Sua comissão em tempo real',
    body: 'R$8 por agendamento + R$12 se comparecer + R$40 se fechar. Cada número lançado vira comissão automaticamente.',
    action: 'Veja quanto já acumulou este mês. Tour concluído! ⚔️',
  },
]

export const TOUR_CLOSER: TourStep[] = [
  {
    id: 'com-1', elementId: 'kpi-reunioes', position: 'bottom',
    title: 'Reuniões realizadas',
    body: 'O SDR agenda → comparecem → chegam até você. Sua taxa esperada é 24% de fechamento.',
    action: 'Veja quantas reuniões chegaram esta semana.',
  },
  {
    id: 'com-2', elementId: 'pipeline-kanban', position: 'top',
    title: 'Seu pipeline Kanban',
    body: 'Cada card é um lead. Ao mover para "Fechado/Ganho" → comissão de 5% gerada automaticamente.',
    action: 'Familiarize-se com as colunas do kanban.',
  },
  {
    id: 'com-3', elementId: 'card-comissao', position: 'bottom',
    title: 'Sua comissão acumulada',
    body: '5% sobre a primeira mensalidade. Ticket médio R$2.400 = R$120/venda. Bônus de equipe de até R$1.000.',
    action: 'Tour concluído! Feche sua próxima venda. ⚔️',
  },
]

export const TOURS: Record<string, Record<string, TourStep[]>> = {
  cs: { '/cs': TOUR_CS },
  sdr: { '/sdr': TOUR_SDR },
  closer: { '/comercial': TOUR_CLOSER },
  cmo: { '/comercial': TOUR_CLOSER },
  head_traffic: { '/trafego-clientes': [] },
  designer: { '/design': [] },
  editor_video: { '/design': [] },
  admin: {},
  coo: {},
}

export function getTourSteps(role: string, pagina: string): TourStep[] {
  return TOURS[role]?.[pagina] || []
}
