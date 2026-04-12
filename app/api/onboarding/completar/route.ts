import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const MISSOES_DIA1: Record<string, Array<{ titulo: string; descricao: string; acao_alvo: string }>> = {
  cs: [
    { titulo: 'Faça seu primeiro check-in', descricao: 'Clique em qualquer cliente e registre um contato', acao_alvo: 'checkin_realizado' },
    { titulo: 'Explore o /cs completo', descricao: 'Conheça os KPIs, filtros e lista de clientes', acao_alvo: 'pagina_visitada' },
  ],
  sdr: [
    { titulo: 'Lance seu primeiro agendamento', descricao: 'Use "Lançar dia" e registre 1 agendamento real', acao_alvo: 'agendamento_lancado' },
    { titulo: 'Confirme a integração Waseller', descricao: 'Verifique se o webhook está recebendo eventos', acao_alvo: 'waseller_confirmado' },
  ],
  closer: [
    { titulo: 'Mova 1 card no pipeline', descricao: 'Arraste um lead para a próxima etapa', acao_alvo: 'card_movido' },
    { titulo: 'Valide seus leads existentes', descricao: 'Confirme que os leads do pipeline são reais', acao_alvo: 'pipeline_validado' },
  ],
  head_traffic: [
    { titulo: 'Identifique as 3 clínicas com pior CPL', descricao: 'Ordene por CPL e anote o problema de cada uma', acao_alvo: 'clinica_analisada' },
  ],
  editor_video: [
    { titulo: 'Configure sua rotina diária', descricao: 'Ajuste os blocos de deep work', acao_alvo: 'rotina_configurada' },
  ],
  designer: [
    { titulo: 'Configure sua rotina de design', descricao: 'Defina seus blocos de foco criativo', acao_alvo: 'rotina_configurada' },
  ],
  coo: [
    { titulo: 'Revise as metas do mês', descricao: 'Confirme se as metas refletem a realidade atual', acao_alvo: 'metas_revisadas' },
  ],
  cmo: [
    { titulo: 'Revise o dashboard de tráfego', descricao: 'Confirme os dados das campanhas', acao_alvo: 'trafego_revisado' },
  ],
  admin: [
    { titulo: 'Revise o dashboard CEO', descricao: 'Verifique todos os KPIs', acao_alvo: 'dashboard_revisado' },
  ],
}

const DESTINO: Record<string, string> = {
  cs: '/cs?tour=1',
  coo: '/coo?tour=1',
  sdr: '/sdr?tour=1',
  closer: '/comercial?tour=1',
  cmo: '/comercial?tour=1',
  head_traffic: '/trafego-clientes?tour=1',
  editor_video: '/design?tour=1',
  designer: '/design?tour=1',
  admin: '/ceo',
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userEmail, role, ferramentas, ferramentas_outro, dificuldades, expectativa } = body

  if (!userEmail) return NextResponse.json({ error: 'userEmail obrigatório' }, { status: 400 })

  await sb.from('usuarios_internos').update({
    onboarding_completo: true,
    onboarding_completado_em: new Date().toISOString(),
    onboarding_dados: { ferramentas, ferramentas_outro, dificuldades, expectativa },
  }).eq('email', userEmail)

  const missoes = MISSOES_DIA1[role || 'admin'] || []
  const hoje = new Date().toISOString().slice(0, 10)
  if (missoes.length > 0) {
    await sb.from('missoes_diarias').insert(
      missoes.map((m, i) => ({
        user_email: userEmail,
        data: hoje,
        missao_key: m.acao_alvo,
        missao_label: m.titulo,
        pontos: 5,
      })),
    )
    // erro de insert (ex: duplicata) é ok — ignorar
  }

  return NextResponse.json({
    ok: true,
    redirect: DESTINO[role || 'admin'] || '/ceo',
  })
}
