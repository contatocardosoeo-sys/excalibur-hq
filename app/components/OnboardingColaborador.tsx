'use client'

import { useEffect, useState } from 'react'

type Secao = { icon: string; titulo: string; conteudo: string }
type TutorialConteudo = {
  emoji: string
  titulo: string
  subtitulo: string
  secoes: Secao[]
  meta_principal: string
  acao_diaria: string
}

// CONTEÚDO POR ROLE
const TUTORIAL: Record<string, TutorialConteudo> = {
  sdr: {
    emoji: '📞',
    titulo: 'Bem-vindo ao Excalibur HQ!',
    subtitulo: 'Aqui você acompanha e registra toda a sua operação de prospecção.',
    secoes: [
      {
        icon: '🎯',
        titulo: 'Sua missão',
        conteudo: 'Prospectar clínicas odontológicas, qualificar leads e agendar reuniões para o Guilherme fechar. Sua meta: 300 leads/mês, 90 agendamentos, 54 comparecimentos e 3 vendas.',
      },
      {
        icon: '📊',
        titulo: 'O que você preenche todo dia',
        conteudo: 'Na aba "Lançar dia": quantidade de leads prospectados, contatos feitos, agendamentos realizados, comparecimentos confirmados, vendas e valor gerado. Faça isso ao final de cada bloco ou no fechamento do dia.',
      },
      {
        icon: '🎯',
        titulo: 'Etapas ACL',
        conteudo: 'Use a aba "Etapas ACL" como guia para cada contato: Recepção → Explicação → Qualificação → Agendamento. Cada etapa tem um script. Siga o processo.',
      },
      {
        icon: '⏰',
        titulo: 'Rotina recomendada',
        conteudo: '09h: Abrir o sistema e ver metas do mês. Ao longo do dia: prospectar e lançar. 18h: Lançar métricas do dia antes de fechar. O Cardoso vê seus números em tempo real.',
      },
    ],
    meta_principal: '300 leads · 90 agendamentos · 54 comparecimentos · 3 vendas',
    acao_diaria: 'Lançar métricas todo dia → aba "Lançar dia"',
  },
  closer: {
    emoji: '💼',
    titulo: 'Bem-vindo ao Excalibur HQ!',
    subtitulo: 'Aqui você gerencia seu pipeline de vendas e as campanhas de tráfego.',
    secoes: [
      {
        icon: '🎯',
        titulo: 'Sua missão (Closer)',
        conteudo: 'Fechar clínicas odontológicas. Meta: 5 fechamentos/mês, 20 reuniões, R$10.000 de MRR gerado. Todo lead que comparece é uma oportunidade sua.',
      },
      {
        icon: '📋',
        titulo: 'Como usar o Kanban',
        conteudo: 'No /comercial você vê o pipeline: "Reunião Agendada" → "Proposta Enviada" → "Fechado" ou "Perdido". Mova o card conforme o lead avança. Não deixe acumular — o CEO monitora isso.',
      },
      {
        icon: '📣',
        titulo: 'Sua missão (CMO)',
        conteudo: 'Gerenciar as campanhas de tráfego pago. No /trafego você vê o funil completo: CPL, CAC, conversões. Quando o CPL estiver acima de R$12, é hora de ajustar.',
      },
      {
        icon: '⏰',
        titulo: 'Rotina recomendada',
        conteudo: 'Todo dia: revisar o kanban e mover leads. Após cada reunião: atualizar o card imediatamente. Semanalmente: revisar métricas de tráfego no /trafego.',
      },
    ],
    meta_principal: '5 fechamentos · 20 reuniões · R$10.000 MRR',
    acao_diaria: 'Mover leads no kanban conforme avançam → /comercial',
  },
  cmo: {
    emoji: '📣',
    titulo: 'Bem-vindo ao Excalibur HQ!',
    subtitulo: 'Aqui você acompanha as campanhas e o funil de tráfego pago.',
    secoes: [
      {
        icon: '📊',
        titulo: 'Sua missão',
        conteudo: 'Gerar leads qualificados para o Trindade prospectar e para o funil de vendas. Meta: 300 leads/mês, CPL abaixo de R$12, CAC abaixo de R$300.',
      },
      {
        icon: '📈',
        titulo: 'O que você monitora',
        conteudo: 'No /trafego: CPL (custo por lead), CAC (custo de aquisição), taxa de agendamento, conversão geral. Se o agendamento cair abaixo de 25%, sistema dispara alerta automático.',
      },
      {
        icon: '⏰',
        titulo: 'Rotina recomendada',
        conteudo: 'Semanalmente: revisar o funil e ajustar campanhas. Diariamente: verificar se leads estão chegando no sistema via Wascript.',
      },
    ],
    meta_principal: '300 leads · CPL < R$12 · CAC < R$300',
    acao_diaria: 'Monitorar funil de tráfego → /trafego',
  },
  cs: {
    emoji: '🎯',
    titulo: 'Bem-vindo ao Excalibur HQ!',
    subtitulo: 'Aqui você acompanha e garante o sucesso de todas as clínicas ativas.',
    secoes: [
      {
        icon: '🎯',
        titulo: 'Sua missão',
        conteudo: 'Garantir que cada clínica percorra a jornada D0-D90 com sucesso: onboarding correto, campanha ativa, leads chegando, cliente executando. Seu trabalho evita o churn.',
      },
      {
        icon: '📅',
        titulo: 'A Jornada D0-D90',
        conteudo: 'Cada clínica tem 22+ tarefas distribuídas em etapas: D0-D7 (ativação), D7-D15 (adoção), D15-D30 (consolidação). Sua função é executar e registrar cada etapa. Acesse /jornada para ver sua carteira.',
      },
      {
        icon: '📞',
        titulo: 'Registrar todo contato',
        conteudo: 'Todo contato com cliente (WhatsApp, ligação, reunião) deve ser registrado no botão "Contato" do cliente. Isso gera o histórico e alimenta o health score. Sem registro = cliente invisível.',
      },
      {
        icon: '✅',
        titulo: 'Concluir tarefas',
        conteudo: 'Na jornada de cada cliente: clique "Iniciar tarefa" quando começar e "Concluir tarefa" quando terminar. As tarefas bloqueantes (🔒) impedem a evolução para a próxima etapa.',
      },
      {
        icon: '📊',
        titulo: 'O Cockpit CS',
        conteudo: 'Sua tela principal (/cs) mostra: clientes em risco, tarefas da semana, alertas críticos. Acesse todo dia. Se um cliente está em risco, você precisa agir em até 24h.',
      },
      {
        icon: '⏰',
        titulo: 'Rotina recomendada',
        conteudo: '09h: Abrir /cs e ver alertas e tarefas da semana. Durante o dia: registrar cada contato na hora. 18h: Garantir que nenhuma tarefa bloqueante ficou pendente sem motivo.',
      },
    ],
    meta_principal: 'Score médio ≥ 80 · Zero churn · Clínicas acompanhadas',
    acao_diaria: 'Registrar contatos + concluir tarefas da jornada → /cs e /jornada',
  },
  financeiro: {
    emoji: '💰',
    titulo: 'Bem-vindo ao Excalibur HQ!',
    subtitulo: 'Aqui você gerencia o financeiro operacional da empresa.',
    secoes: [
      {
        icon: '📥',
        titulo: 'A Receber',
        conteudo: 'No /operacao/financeiro aba "A Receber" você vê todos os recebimentos pendentes e pagos do mês. Marque como pago quando confirmar o recebimento.',
      },
      {
        icon: '📤',
        titulo: 'A Pagar',
        conteudo: 'Na aba "A Pagar" você vê todas as despesas do mês: colaboradores, ferramentas, aluguel, marketing. Marque como pago quando efetuar.',
      },
      {
        icon: '⏰',
        titulo: 'Rotina recomendada',
        conteudo: 'Manhã: conferir recebimentos do dia e atualizar. Tarde: processar pagamentos devidos. Fim do mês: fechar o resumo e revisar o caixa.',
      },
    ],
    meta_principal: 'Caixa positivo · Inadimplência < 5% · Pagamentos em dia',
    acao_diaria: 'Atualizar recebimentos e pagamentos → /operacao/financeiro',
  },
}

type Dica = { icon: string; dica: string; link: string }
const CHECK_DICAS: Record<string, Dica[]> = {
  sdr: [
    { icon: '📊', dica: 'Lançar métricas: editar formulário na tela inicial do /sdr', link: '/sdr' },
    { icon: '🎯', dica: 'Ver metas do mês: os 5 cards no topo do /sdr', link: '/sdr' },
    { icon: '📅', dica: 'Histórico de lançamentos: aba Histórico', link: '/sdr' },
  ],
  closer: [
    { icon: '📋', dica: 'Mover lead no kanban: botão "Avançar" no card', link: '/comercial' },
    { icon: '🎯', dica: 'Ver suas metas: cards no topo do /comercial', link: '/comercial' },
    { icon: '📣', dica: 'Monitorar CPL e CAC: /trafego', link: '/trafego' },
  ],
  cmo: [
    { icon: '📈', dica: 'Acompanhar funil de tráfego: /trafego', link: '/trafego' },
    { icon: '📊', dica: 'Ver CPL, CAC e conversões', link: '/trafego' },
  ],
  cs: [
    { icon: '📞', dica: 'Registrar contato: /cs → botão Contato ao lado do cliente', link: '/cs' },
    { icon: '✅', dica: 'Concluir tarefa: /jornada → clínica → Iniciar → Concluir', link: '/jornada' },
    { icon: '🚨', dica: 'Ver clientes em risco: /cs → aba Ações', link: '/cs' },
    { icon: '📅', dica: 'Ver tarefas da semana: /cs/calendario', link: '/cs/calendario' },
  ],
  financeiro: [
    { icon: '📥', dica: 'Marcar recebido: /operacao/financeiro → aba A Receber', link: '/operacao/financeiro' },
    { icon: '📤', dica: 'Marcar pago: /operacao/financeiro → aba A Pagar', link: '/operacao/financeiro' },
  ],
}

interface OnboardingState {
  show: boolean
  estado: 'tutorial' | 'check' | 'ativo'
  visitas?: number
}

export default function OnboardingColaborador({
  userEmail,
  userRole,
  userName,
}: {
  userEmail: string
  userRole: string
  userName: string
}) {
  const [state, setState] = useState<OnboardingState | null>(null)
  const [step, setStep] = useState(0)
  const [ajuda, setAjuda] = useState(false)
  const [fechando, setFechando] = useState(false)

  // Role normalizado pra buscar o conteudo
  const roleKey = ['admin', 'coo'].includes(userRole) ? null :
    userRole === 'closer' ? 'closer' :
    userRole === 'cmo' ? 'cmo' :
    userRole === 'sdr' ? 'sdr' :
    userRole === 'cs' ? 'cs' :
    userRole === 'financeiro' ? 'financeiro' : null

  useEffect(() => {
    if (!userEmail || !userRole || !roleKey) return
    fetch(`/api/onboarding-colaborador?email=${encodeURIComponent(userEmail)}&role=${userRole}`)
      .then(r => r.json())
      .then((d: OnboardingState) => setState(d))
      .catch(() => setState({ show: false, estado: 'ativo' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail, userRole])

  // Admin/COO nunca veem
  if (!roleKey) return null

  const conteudo = TUTORIAL[roleKey]
  const dicas = CHECK_DICAS[roleKey] || []

  if (!state?.show || !conteudo) return null

  const marcar = async (acao: string) => {
    await fetch('/api/onboarding-colaborador', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail, acao }),
    })
  }

  const fechar = async (acao: string) => {
    setFechando(true)
    await marcar(acao)
    // Marca em sessionStorage E localStorage para AcaoHoje não aparecer junto
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('onboarding_tutorial_visto', 'true')
      sessionStorage.setItem('tutorial_visto', 'true')
      if (roleKey) sessionStorage.setItem(`onboarding_${roleKey}_visto`, 'true')
      localStorage.setItem('onboarding_tutorial_visto', 'true')
    }
    setTimeout(() => setState({ show: false, estado: 'ativo' }), 350)
  }

  // ─────────────────────────────────────────
  // ESTADO 1: TUTORIAL COMPLETO
  // ─────────────────────────────────────────
  if (state.estado === 'tutorial') {
    const totalSteps = conteudo.secoes.length
    const isLast = step === totalSteps - 1
    const primeiroNome = userName?.split(' ')[0] || ''
    const tituloComNome = primeiroNome ? `${conteudo.titulo.replace('!', '')}, ${primeiroNome}!` : conteudo.titulo

    return (
      <div
        className={`fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-all duration-300 ${fechando ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="onboarding-modal bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-900/40 to-gray-900 px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-gray-800 flex-shrink-0">
            <div className="flex items-start gap-3 mb-1">
              <span className="text-3xl md:text-4xl">{conteudo.emoji}</span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base md:text-lg font-bold text-white leading-tight">{tituloComNome}</h2>
                <p className="text-xs md:text-sm text-gray-400 mt-1">{conteudo.subtitulo}</p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-4 flex items-center gap-2">
              {conteudo.secoes.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= step ? 'bg-amber-500' : 'bg-gray-700'}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-gray-500 mt-1">{step + 1} de {totalSteps}</p>
          </div>

          {/* Conteudo da secao atual */}
          <div className="px-5 md:px-6 py-5 overflow-y-auto">
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{conteudo.secoes[step].icon}</span>
              <div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {conteudo.secoes[step].titulo}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {conteudo.secoes[step].conteudo}
                </p>
              </div>
            </div>

            {/* Meta e acao diaria — no ultimo step */}
            {isLast && (
              <div className="mt-5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mb-2">🎯 Suas metas</p>
                <p className="text-sm text-white font-medium">{conteudo.meta_principal}</p>
                <p className="text-xs text-gray-400 mt-2">📌 Ação diária: {conteudo.acao_diaria}</p>
              </div>
            )}
          </div>

          {/* Botoes de navegacao */}
          <div className="px-5 md:px-6 pb-4 flex gap-2 md:gap-3 flex-shrink-0">
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm font-medium hover:border-gray-600 hover:text-gray-300 transition min-h-[44px]"
              >
                ← Anterior
              </button>
            )}
            {!isLast ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 text-sm font-bold hover:bg-amber-400 transition min-h-[44px]"
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={() => fechar('tutorial_visto')}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 text-sm font-bold hover:bg-amber-400 transition min-h-[44px]"
              >
                Entendido, vamos lá! ⚔️
              </button>
            )}
          </div>

          {/* Pular */}
          <div className="text-center pb-4 flex-shrink-0">
            <button
              onClick={() => fechar('tutorial_visto')}
              className="text-xs text-gray-600 hover:text-gray-400 transition"
            >
              Pular tutorial
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────
  // ESTADO 2: CHECK RÁPIDO
  // ─────────────────────────────────────────
  if (state.estado === 'check') {
    const primeiroNome = userName?.split(' ')[0] || 'colaborador'

    return (
      <div
        className={`fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 ${fechando ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="onboarding-modal bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {!ajuda ? (
            <>
              <div className="px-6 pt-6 pb-4 text-center">
                <div className="text-4xl mb-3">👋</div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Olá de novo, {primeiroNome}!
                </h3>
                <p className="text-sm text-gray-400">
                  Como está sendo o uso do sistema? Você se adaptou bem?
                </p>
              </div>
              <div className="px-6 pb-6 flex flex-col gap-3">
                <button
                  onClick={() => fechar('check_ok')}
                  className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-bold text-sm transition min-h-[44px]"
                >
                  ✅ Estou ótimo, entendi tudo!
                </button>
                <button
                  onClick={() => setAjuda(true)}
                  className="w-full py-3 rounded-xl border border-gray-700 hover:border-amber-500/50 text-gray-300 hover:text-amber-400 font-medium text-sm transition min-h-[44px]"
                >
                  🙋 Tenho algumas dúvidas ainda
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="px-6 pt-6 pb-2">
                <h3 className="text-base font-bold text-white mb-1">Dicas rápidas {conteudo.emoji}</h3>
                <p className="text-xs text-gray-500 mb-4">As ações mais importantes do seu dia</p>
                <div className="flex flex-col gap-3">
                  {dicas.map((d, i) => (
                    <a
                      key={i}
                      href={d.link}
                      onClick={() => fechar('check_ok')}
                      className="flex items-start gap-3 p-3 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 hover:border-amber-500/30 transition group min-h-[56px]"
                    >
                      <span className="text-xl">{d.icon}</span>
                      <span className="text-sm text-gray-300 group-hover:text-white transition">{d.dica}</span>
                    </a>
                  ))}
                </div>
              </div>
              <div className="px-6 py-4">
                <button
                  onClick={() => fechar('check_ok')}
                  className="w-full py-2.5 rounded-xl bg-amber-500 text-gray-950 font-bold text-sm hover:bg-amber-400 transition min-h-[44px]"
                >
                  Obrigado, entendi! ⚔️
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return null
}
