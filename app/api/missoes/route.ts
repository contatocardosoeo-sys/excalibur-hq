import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ═══════════════════════════════════════════════════════════
// MOTOR DE MISSÕES ESCALÁVEIS
// Nível sobe com base em: dias ativo, streak, % de conclusão
// Tom muda conforme desempenho: provocativo/firme/urgente
// ═══════════════════════════════════════════════════════════

type MissaoTemplate = {
  key: string
  label: string
  pontos: number
  nivel_min: number  // só aparece a partir deste nível (1-5)
  bonus?: boolean    // missão bônus (desafio extra)
}

const MISSOES_POR_ROLE: Record<string, MissaoTemplate[]> = {
  sdr: [
    // Nível 1 — primeiros dias (básico)
    { key: 'abrir_sdr', label: 'Abrir o painel SDR e verificar', pontos: 1, nivel_min: 1 },
    { key: 'lancar_metricas', label: 'Lançar as métricas do dia', pontos: 2, nivel_min: 1 },
    // Nível 2 — começou a entender
    { key: 'agendar_1', label: 'Agendar pelo menos 1 reunião', pontos: 3, nivel_min: 2 },
    { key: 'followup_3', label: 'Fazer follow-up em 3 leads', pontos: 2, nivel_min: 2 },
    // Nível 3 — operando
    { key: 'agendar_5', label: 'Agendar 5 reuniões hoje', pontos: 5, nivel_min: 3 },
    { key: 'qualificar_10', label: 'Qualificar 10 leads', pontos: 3, nivel_min: 3 },
    // Nível 4 — acelerando
    { key: 'agendar_10', label: 'Agendar 10 reuniões hoje', pontos: 7, nivel_min: 4 },
    { key: 'meta_leads', label: 'Bater a meta de 50 leads/dia', pontos: 5, nivel_min: 4 },
    // Nível 5 — monstro
    { key: 'agendar_15', label: '🔥 META: 15 agendamentos hoje', pontos: 10, nivel_min: 5 },
    // Bônus
    { key: 'bonus_18', label: '🚀 DESAFIO: 18 agendamentos (+3 bônus)', pontos: 15, nivel_min: 4, bonus: true },
    { key: 'bonus_zero_noshow', label: '💎 PERFEITO: 0 no-show hoje', pontos: 10, nivel_min: 3, bonus: true },
  ],
  closer: [
    { key: 'abrir_comercial', label: 'Abrir o pipeline comercial', pontos: 1, nivel_min: 1 },
    { key: 'atualizar_1', label: 'Atualizar 1 proposta no kanban', pontos: 2, nivel_min: 1 },
    { key: 'registrar_reuniao', label: 'Registrar resultado de 1 reunião', pontos: 3, nivel_min: 2 },
    { key: 'revisar_esfriando', label: 'Revisar propostas esfriando', pontos: 2, nivel_min: 2 },
    { key: 'fechar_1', label: 'Fechar 1 venda hoje', pontos: 7, nivel_min: 3 },
    { key: 'reuniao_3', label: 'Fazer 3 reuniões hoje', pontos: 5, nivel_min: 4 },
    { key: 'fechar_3', label: '🔥 META: 3 fechamentos hoje', pontos: 10, nivel_min: 5 },
    { key: 'bonus_ticket', label: '🚀 DESAFIO: Fechar com ticket > R$3.000', pontos: 15, nivel_min: 4, bonus: true },
  ],
  cs: [
    { key: 'abrir_cs', label: 'Abrir o dashboard CS', pontos: 1, nivel_min: 1 },
    { key: 'contatar_1', label: 'Registrar contato com 1 cliente', pontos: 2, nivel_min: 1 },
    { key: 'verificar_jornada', label: 'Verificar clientes em transição de etapa', pontos: 2, nivel_min: 2 },
    { key: 'contatar_3', label: 'Contatar 3 clientes hoje', pontos: 4, nivel_min: 3 },
    { key: 'resolver_pendencia', label: 'Resolver 1 pendência crítica', pontos: 5, nivel_min: 3 },
    { key: 'contatar_5', label: '🔥 META: 5 contatos hoje', pontos: 7, nivel_min: 4 },
    { key: 'bonus_churn', label: '🚀 DESAFIO: Reverter 1 aviso prévio', pontos: 20, nivel_min: 4, bonus: true },
  ],
  coo: [
    { key: 'revisar_adocao', label: 'Verificar adoção da equipe', pontos: 2, nivel_min: 1 },
    { key: 'checar_alertas', label: 'Checar alertas pendentes', pontos: 2, nivel_min: 1 },
    { key: 'revisar_kpis', label: 'Revisar KPIs do dia', pontos: 2, nivel_min: 2 },
    { key: 'cobrar_pendentes', label: 'Cobrar quem não executou a rotina', pontos: 3, nivel_min: 3 },
    { key: 'bonus_100pct', label: '🚀 DESAFIO: 100% da equipe executou hoje', pontos: 15, nivel_min: 3, bonus: true },
  ],
  head_traffic: [
    { key: 'revisar_cpl', label: 'Verificar CPL das campanhas', pontos: 2, nivel_min: 1 },
    { key: 'atualizar_trafego', label: 'Atualizar métricas de tráfego', pontos: 2, nivel_min: 1 },
    { key: 'otimizar_campanha', label: 'Otimizar 1 campanha', pontos: 4, nivel_min: 3 },
    { key: 'bonus_cpl_baixo', label: '🚀 DESAFIO: CPL abaixo de R$8 hoje', pontos: 10, nivel_min: 4, bonus: true },
  ],
  designer: [
    { key: 'verificar_demandas', label: 'Verificar demandas pendentes', pontos: 1, nivel_min: 1 },
    { key: 'entregar_1', label: 'Entregar 1 demanda', pontos: 3, nivel_min: 1 },
    { key: 'entregar_3', label: '🔥 META: Entregar 3 demandas hoje', pontos: 7, nivel_min: 4 },
    { key: 'bonus_prazo', label: '🚀 DESAFIO: Tudo no prazo esta semana', pontos: 10, nivel_min: 3, bonus: true },
  ],
  editor_video: [
    { key: 'verificar_videos', label: 'Verificar edições pendentes', pontos: 1, nivel_min: 1 },
    { key: 'entregar_1', label: 'Entregar 1 vídeo', pontos: 3, nivel_min: 1 },
    { key: 'entregar_3', label: '🔥 META: Entregar 3 vídeos hoje', pontos: 7, nivel_min: 4 },
    { key: 'bonus_prazo', label: '🚀 DESAFIO: Tudo no prazo esta semana', pontos: 10, nivel_min: 3, bonus: true },
  ],
  admin: [
    { key: 'revisar_dashboard', label: 'Verificar dashboard CEO', pontos: 1, nivel_min: 1 },
    { key: 'decidir_propostas', label: 'Decidir propostas de ajuste', pontos: 3, nivel_min: 2 },
    { key: 'revisar_equipe', label: 'Verificar health score da equipe', pontos: 2, nivel_min: 1 },
  ],
  cmo: [
    { key: 'revisar_trafego', label: 'Revisar dashboard de tráfego', pontos: 2, nivel_min: 1 },
    { key: 'atualizar_kanban', label: 'Atualizar pipeline comercial', pontos: 2, nivel_min: 1 },
    { key: 'propor_ajuste', label: 'Propor ajuste de meta se necessário', pontos: 3, nivel_min: 3 },
  ],
}

// ═══════════════════════════════════════════════════════════
// MOTOR DE NÍVEL (1-5) baseado em histórico
// ═══════════════════════════════════════════════════════════

async function calcularNivel(email: string): Promise<{
  nivel: number
  streak: number
  diasAtivo: number
  mediaConclPct: number
  mensagem: string
  tom: 'provocativo' | 'firme' | 'urgente' | 'neutro'
}> {
  const hoje = new Date()
  const seteDiasAtras = new Date(hoje.getTime() - 7 * 86400000).toISOString().slice(0, 10)
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 86400000).toISOString().slice(0, 10)

  // Buscar histórico de missões dos últimos 30 dias
  const { data: historico } = await sb
    .from('missoes_diarias')
    .select('data, concluida, pontos')
    .eq('user_email', email)
    .gte('data', trintaDiasAtras)
    .order('data', { ascending: false })

  const items = historico || []
  if (items.length === 0) {
    return { nivel: 1, streak: 0, diasAtivo: 0, mediaConclPct: 0, mensagem: 'Primeiro dia! Vamos começar devagar. 💪', tom: 'neutro' }
  }

  // Dias ativos (com pelo menos 1 missão concluída)
  const diasComConclusao = new Set(items.filter(m => m.concluida).map(m => m.data)).size

  // Missões por dia (pra calcular %)
  const porDia: Record<string, { total: number; concluidas: number }> = {}
  for (const m of items) {
    if (!porDia[m.data]) porDia[m.data] = { total: 0, concluidas: 0 }
    porDia[m.data].total++
    if (m.concluida) porDia[m.data].concluidas++
  }
  const dias = Object.values(porDia)
  const mediaConclPct = dias.length > 0
    ? Math.round(dias.reduce((s, d) => s + (d.total > 0 ? (d.concluidas / d.total) * 100 : 0), 0) / dias.length)
    : 0

  // Streak: dias consecutivos com 100% (de ontem pra trás)
  const datasOrdenadas = Object.keys(porDia).sort().reverse()
  let streak = 0
  for (const d of datasOrdenadas) {
    const p = porDia[d]
    if (p.total > 0 && p.concluidas === p.total) streak++
    else break
  }

  // Ontem bateu meta?
  const ontem = new Date(hoje.getTime() - 86400000).toISOString().slice(0, 10)
  const ontemData = porDia[ontem]
  const onteBateu = ontemData ? ontemData.concluidas === ontemData.total : false
  const onteZerou = ontemData ? ontemData.concluidas === 0 : false

  // Nível baseado em combinação de fatores
  let nivel = 1
  if (diasComConclusao >= 3 && mediaConclPct >= 50) nivel = 2
  if (diasComConclusao >= 7 && mediaConclPct >= 60) nivel = 3
  if (diasComConclusao >= 14 && mediaConclPct >= 75) nivel = 4
  if (diasComConclusao >= 21 && mediaConclPct >= 85 && streak >= 3) nivel = 5

  // Tom + mensagem dinâmica
  let tom: 'provocativo' | 'firme' | 'urgente' | 'neutro' = 'neutro'
  let mensagem = ''

  if (onteZerou) {
    tom = 'urgente'
    mensagem = '⚠️ Ontem ficou zerado. Hoje é dia de recuperar — sem desculpa.'
  } else if (!onteBateu && ontemData) {
    tom = 'firme'
    const faltou = ontemData.total - ontemData.concluidas
    mensagem = `💪 Ontem faltou ${faltou} missão. Hoje completa tudo.`
  } else if (streak >= 5) {
    tom = 'provocativo'
    mensagem = `🔥 ${streak} dias seguidos batendo 100%! Aceita subir a meta?`
  } else if (streak >= 3) {
    tom = 'provocativo'
    mensagem = `🔥 Streak de ${streak} dias! Tá imparável — quer mais?`
  } else if (mediaConclPct >= 85) {
    tom = 'provocativo'
    mensagem = '🚀 Média acima de 85% — tu aguenta mais? Bora subir.'
  } else if (mediaConclPct >= 60) {
    tom = 'firme'
    mensagem = `📈 Média de ${mediaConclPct}% — bom, mas não relaxa. Meta é 100%.`
  } else if (mediaConclPct >= 30) {
    tom = 'urgente'
    mensagem = `⚠️ Média de ${mediaConclPct}% — está abaixo do esperado. Precisa acelerar.`
  } else {
    tom = 'urgente'
    mensagem = '🚨 Quase nenhuma missão concluída. O sistema só funciona se você usar.'
  }

  return { nivel, streak, diasAtivo: diasComConclusao, mediaConclPct, mensagem, tom }
}

// GET — missões do dia (escaladas por nível)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const role = req.nextUrl.searchParams.get('role')
  const todos = req.nextUrl.searchParams.get('todos') === 'true'
  const hoje = new Date().toISOString().slice(0, 10)

  if (todos) {
    const { data } = await sb.from('missoes_diarias').select('*').eq('data', hoje).order('user_email')
    const porUser: Record<string, { total: number; concluidas: number; pontos: number }> = {}
    for (const m of data || []) {
      if (!porUser[m.user_email]) porUser[m.user_email] = { total: 0, concluidas: 0, pontos: 0 }
      porUser[m.user_email].total++
      if (m.concluida) {
        porUser[m.user_email].concluidas++
        porUser[m.user_email].pontos += Number(m.pontos || 1)
      }
    }
    return NextResponse.json({ data: hoje, missoes: data || [], resumo_por_user: porUser })
  }

  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 })

  // Verificar se as missões de hoje já foram criadas
  const { data: existente } = await sb
    .from('missoes_diarias')
    .select('*')
    .eq('user_email', email)
    .eq('data', hoje)
    .order('created_at')

  // Calcular nível + contexto
  const stats = await calcularNivel(email)

  if (existente && existente.length > 0) {
    const concluidas = existente.filter(m => m.concluida).length
    const pontos = existente.filter(m => m.concluida).reduce((s, m) => s + Number(m.pontos || 1), 0)
    const totalPontos = existente.reduce((s, m) => s + Number(m.pontos || 1), 0)
    return NextResponse.json({
      data: hoje,
      missoes: existente,
      total: existente.length,
      concluidas,
      pontos,
      total_pontos: totalPontos,
      pct: Math.round((concluidas / existente.length) * 100),
      ...stats,
    })
  }

  // Criar missões baseadas no nível
  const r = role || 'admin'
  const templates = MISSOES_POR_ROLE[r] || MISSOES_POR_ROLE.admin

  // Filtrar por nível: missões normais do nível atual + 1 bônus se nível >= 3
  const normais = templates.filter(t => !t.bonus && t.nivel_min <= stats.nivel)
  const bonus = stats.nivel >= 3
    ? templates.filter(t => t.bonus && t.nivel_min <= stats.nivel).slice(0, 1)
    : []

  const selecionadas = [...normais, ...bonus]

  const novas = selecionadas.map(t => ({
    user_email: email,
    data: hoje,
    missao_key: t.key,
    missao_label: t.bonus ? t.label : t.label,
    pontos: t.pontos,
    concluida: false,
  }))

  const { data: criadas } = await sb
    .from('missoes_diarias')
    .upsert(novas, { onConflict: 'user_email,data,missao_key' })
    .select()

  const totalPontos = novas.reduce((s, n) => s + n.pontos, 0)

  return NextResponse.json({
    data: hoje,
    missoes: criadas || novas,
    total: novas.length,
    concluidas: 0,
    pontos: 0,
    total_pontos: totalPontos,
    pct: 0,
    ...stats,
  })
}

// PATCH — marcar missão como concluída (com tracking de tempo)
export async function PATCH(req: NextRequest) {
  const { id, concluida } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  // Buscar missão pra calcular tempo
  const { data: missaoAtual } = await sb
    .from('missoes_diarias')
    .select('user_email, horario_inicio, created_at')
    .eq('id', id)
    .single()

  const agora = new Date()
  const updates: Record<string, unknown> = {
    concluida: concluida !== false,
  }

  if (concluida !== false) {
    updates.concluida_em = agora.toISOString()
    // Calcular tempo gasto desde início (ou desde criação se não tiver horario_inicio)
    const inicio = missaoAtual?.horario_inicio || missaoAtual?.created_at
    if (inicio) {
      updates.tempo_gasto_ms = agora.getTime() - new Date(inicio).getTime()
    }
  } else {
    // Desfazendo — marcar início de novo
    updates.horario_inicio = agora.toISOString()
    updates.tempo_gasto_ms = null
  }

  const { data, error } = await sb
    .from('missoes_diarias')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Recalcular health score em background
  if (missaoAtual?.user_email && concluida !== false) {
    Promise.resolve().then(async () => {
      try {
        const email = missaoAtual.user_email
        const trintaDiasAtras = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

        const { data: hist } = await sb
          .from('missoes_diarias')
          .select('concluida, pontos, tempo_gasto_ms, data')
          .eq('user_email', email)
          .gte('data', trintaDiasAtras)

        const items = hist || []
        const totalMissoes = items.length
        const concluidas = items.filter(m => m.concluida)
        const taxaConclusao = totalMissoes > 0 ? Math.round((concluidas.length / totalMissoes) * 100) : 0
        const pontosAcum = concluidas.reduce((s, m) => s + Number(m.pontos || 1), 0)

        // Tempo médio (só das que têm tempo registrado)
        const comTempo = concluidas.filter(m => m.tempo_gasto_ms && m.tempo_gasto_ms > 0)
        const tempoMedio = comTempo.length > 0
          ? Math.round(comTempo.reduce((s, m) => s + m.tempo_gasto_ms, 0) / comTempo.length)
          : null

        // Calcular nível
        const stats = await calcularNivel(email)

        // 5 dimensões do health score baseadas em produtividade:
        // Execução = taxa de conclusão (0-100)
        const execucao = taxaConclusao
        // Ritmo = baseado no streak e dias ativos
        const ritmo = Math.min(100, stats.diasAtivo * 5 + stats.streak * 10)
        // Aprendizado = nível de missões (20pts por nível)
        const aprendizado = Math.min(100, stats.nivel * 20)
        // Qualidade = pontos por missão (indica que faz as difíceis)
        const pontoPorMissao = concluidas.length > 0 ? pontosAcum / concluidas.length : 0
        const qualidade = Math.min(100, Math.round(pontoPorMissao * 20))
        // Feedback = baseado em velocidade (tempo médio bom = rápido)
        const feedbackScore = tempoMedio
          ? tempoMedio < 300000 ? 90 : tempoMedio < 600000 ? 70 : tempoMedio < 1800000 ? 50 : 30
          : 50

        const scoreTotal = Math.round((execucao + ritmo + aprendizado + qualidade + feedbackScore) / 5)
        const nivelLabel = scoreTotal >= 85 ? 'excelente' : scoreTotal >= 65 ? 'bom' : scoreTotal >= 40 ? 'regular' : scoreTotal >= 20 ? 'alerta' : 'critico'

        // Tendência: comparar com semana anterior
        const seteDiasAtras = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
        const quatorzeDiasAtras = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
        const semanaAtual = items.filter(m => m.data >= seteDiasAtras)
        const semanaAnterior = items.filter(m => m.data >= quatorzeDiasAtras && m.data < seteDiasAtras)
        const taxaAtual = semanaAtual.length > 0 ? semanaAtual.filter(m => m.concluida).length / semanaAtual.length : 0
        const taxaAnterior = semanaAnterior.length > 0 ? semanaAnterior.filter(m => m.concluida).length / semanaAnterior.length : 0
        const tendencia = taxaAtual > taxaAnterior + 0.1 ? 'subindo' : taxaAtual < taxaAnterior - 0.1 ? 'caindo' : 'estavel'

        await sb.from('colaborador_health_score').upsert({
          user_email: email,
          score_total: scoreTotal,
          execucao,
          ritmo,
          aprendizado,
          qualidade,
          feedback_score: feedbackScore,
          nivel: nivelLabel,
          tendencia,
          tempo_medio_missao_ms: tempoMedio,
          missoes_concluidas_30d: concluidas.length,
          missoes_total_30d: totalMissoes,
          taxa_conclusao_pct: taxaConclusao,
          pontos_acumulados: pontosAcum,
          nivel_missoes: stats.nivel,
          streak_atual: stats.streak,
          ultimo_acesso: agora.toISOString(),
          dias_sem_acesso: 0,
          calculado_em: agora.toISOString(),
        }, { onConflict: 'user_email' })
      } catch {
        /* */
      }
    })
  }

  return NextResponse.json({ success: true, missao: data })
}
