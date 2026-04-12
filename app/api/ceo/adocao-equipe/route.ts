import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calcularHealthTodos } from '@/app/lib/health-score'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EMOJI_POR_ROLE: Record<string, string> = {
  admin: '👑',
  ceo: '👑',
  coo: '🧠',
  closer: '💼',
  sdr: '📲',
  cs: '🎯',
  cmo: '📣',
  head_traffic: '📣',
  designer: '🎨',
  editor_video: '🎬',
  financeiro: '💰',
}

const ACAO_POR_ROLE: Record<string, string> = {
  admin: 'Revisar dashboards e alertas',
  ceo: 'Revisar dashboards e alertas',
  coo: 'Fazer checkin e revisar equipe',
  closer: 'Atualizar kanban comercial',
  sdr: 'Lançar métricas do dia',
  cs: 'Registrar contato com clientes',
  cmo: 'Revisar campanhas',
  head_traffic: 'Revisar CPL e campanhas ativas',
  designer: 'Entregar demandas do dia',
  editor_video: 'Entregar vídeos do dia',
  financeiro: 'Revisar contas a receber/pagar',
}

export async function GET() {
  const hoje = new Date().toISOString().slice(0, 10)
  const cincoMinAtras = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  // 1. Toda equipe ativa do usuarios_internos (fonte de verdade)
  const { data: usuarios } = await supabase
    .from('usuarios_internos')
    .select('nome, email, role, roles, avatar_url')
    .eq('ativo', true)

  // 2. Health score por colaborador (já sabe quem executou hoje)
  const health = await calcularHealthTodos().catch(() => [])
  const healthMap = new Map(health.map(h => [h.email, h]))

  // 3. Presença ativa no escritório online
  const { data: presenca } = await supabase
    .from('escritorio_presenca')
    .select('user_nome, user_email, user_role, status, sala_atual, ultimo_ping')
    .gte('ultimo_ping', cincoMinAtras)

  const findPresenca = (email: string) =>
    (presenca || []).find(p => p.user_email === email) || null

  // Helper: escolhe a role principal do usuário (prefere a primeira de roles[])
  const rolePrincipal = (u: { role: string; roles?: string[] | null }): string => {
    if (u.roles && u.roles.length > 0) return u.roles[0]
    return u.role
  }

  const colaboradores = (usuarios || []).map(u => {
    const role = rolePrincipal(u as { role: string; roles?: string[] | null })
    const h = healthMap.get(u.email)
    return {
      nome: u.nome,
      email: u.email,
      role,
      roles: u.roles || [u.role],
      avatar_url: u.avatar_url || null,
      emoji: EMOJI_POR_ROLE[role] || '👤',
      executou_hoje: h?.executou_hoje ?? false,
      score: h?.score ?? null,
      nivel: h?.nivel ?? null,
      dias_ativo_7d: h?.dias_ativo_7d ?? 0,
      acao_esperada: ACAO_POR_ROLE[role] || 'Executar rotina do dia',
      presenca: findPresenca(u.email),
    }
  })

  // Ordem: executou_hoje primeiro, depois por role (admin/coo no topo)
  const roleOrdem = ['admin', 'ceo', 'coo', 'closer', 'sdr', 'cs', 'cmo', 'head_traffic', 'financeiro', 'designer', 'editor_video']
  colaboradores.sort((a, b) => {
    const oa = roleOrdem.indexOf(a.role)
    const ob = roleOrdem.indexOf(b.role)
    return (oa === -1 ? 99 : oa) - (ob === -1 ? 99 : ob)
  })

  const executaram = colaboradores.filter(c => c.executou_hoje).length
  const total = colaboradores.length
  const media_score = total > 0
    ? Math.round(colaboradores.reduce((s, c) => s + (c.score || 0), 0) / total)
    : 0

  return NextResponse.json({
    hoje,
    total,
    executaram,
    pct: total > 0 ? Math.round((executaram / total) * 100) : 0,
    media_score,
    colaboradores,
  })
}
