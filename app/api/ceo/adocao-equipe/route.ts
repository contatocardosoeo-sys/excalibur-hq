import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const hoje = new Date().toISOString().slice(0, 10)
  const hojeInicio = `${hoje}T00:00:00`
  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const [{ data: sdrHoje }, { data: csHoje }, { data: comHoje }, { data: presenca }] = await Promise.all([
    // SDR lançou hoje? via sdr_metricas_diarias (data = hoje)
    supabase
      .from('sdr_metricas_diarias')
      .select('leads_recebidos, contatos_realizados, agendamentos, data')
      .eq('data', hoje)
      .limit(1),
    // CS registrou contato hoje? via log_atividades_cs
    supabase
      .from('log_atividades_cs')
      .select('id, created_at')
      .gte('created_at', hojeInicio)
      .limit(1),
    // Comercial atualizou pipeline hoje? via pipeline_closer updated_at
    supabase
      .from('pipeline_closer')
      .select('id, updated_at')
      .gte('updated_at', hojeInicio)
      .limit(1),
    // Presenca ativa (ping < 5min)
    supabase
      .from('escritorio_presenca')
      .select('user_nome, user_email, user_role, status, sala_atual, ultimo_ping')
      .gte('ultimo_ping', cincoMinAtras),
  ])

  const sdrExecutou = (sdrHoje && sdrHoje.length > 0) ? sdrHoje[0] : null
  const sdrLancou = !!sdrExecutou && (
    (sdrExecutou.leads_recebidos || 0) > 0 ||
    (sdrExecutou.contatos_realizados || 0) > 0 ||
    (sdrExecutou.agendamentos || 0) > 0
  )
  const csRegistrou = (csHoje && csHoje.length > 0)
  const comMoveu = (comHoje && comHoje.length > 0)

  const findPresenca = (email: string) =>
    (presenca || []).find(p => p.user_email === email) || null

  return NextResponse.json({
    hoje,
    colaboradores: [
      {
        nome: 'Trindade',
        email: 'trindade.excalibur@gmail.com',
        role: 'sdr',
        emoji: '📞',
        executou_hoje: sdrLancou,
        acao_esperada: 'Lançar métricas do dia',
        presenca: findPresenca('trindade.excalibur@gmail.com'),
      },
      {
        nome: 'Guilherme',
        email: 'guilherme.excalibur@gmail.com',
        role: 'closer',
        emoji: '💼',
        executou_hoje: comMoveu,
        acao_esperada: 'Atualizar kanban',
        presenca: findPresenca('guilherme.excalibur@gmail.com'),
      },
      {
        nome: 'Medina',
        email: 'brunomedina.contato@gmail.com',
        role: 'cs',
        emoji: '🎯',
        executou_hoje: csRegistrou,
        acao_esperada: 'Registrar contato com cliente',
        presenca: findPresenca('brunomedina.contato@gmail.com'),
      },
    ],
  })
}
