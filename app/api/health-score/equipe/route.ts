import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verificarAcesso, ROLES_COMERCIAL } from '@/app/lib/api-auth'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const EMOJI_ROLE: Record<string, string> = {
  admin: '👑', ceo: '👑', coo: '🧠', closer: '💼', sdr: '📲',
  cs: '🎯', cmo: '📣', head_traffic: '📣', designer: '🎨',
  editor_video: '🎬', financeiro: '💰',
}

function calcNivel(score: number): string {
  if (score >= 85) return 'excelente'
  if (score >= 65) return 'bom'
  if (score >= 40) return 'regular'
  if (score >= 20) return 'alerta'
  return 'critico'
}

function corNivel(nivel: string): string {
  if (nivel === 'excelente') return '#22c55e'
  if (nivel === 'bom') return '#4ade80'
  if (nivel === 'regular') return '#fbbf24'
  if (nivel === 'alerta') return '#f97316'
  return '#ef4444'
}

export async function GET() {
  // Buscar todos os users ativos + seus health scores
  const { data: users } = await sb
    .from('usuarios_internos')
    .select('nome, email, role, roles')
    .eq('ativo', true)

  const { data: scores } = await sb
    .from('colaborador_health_score')
    .select('*')

  const scoreMap = new Map((scores || []).map(s => [s.user_email, s]))

  // Calcular health score básico pra quem não tem
  const hoje = new Date()
  const equipe = (users || []).map(u => {
    const role = (u.roles && u.roles.length > 0) ? u.roles[0] : u.role
    const hs = scoreMap.get(u.email)

    // Se não tem score calculado, criar um básico baseado em atividade recente
    const score = hs?.score_total ?? 0
    const nivel = calcNivel(score)

    const diasSemAcesso = hs?.ultimo_acesso
      ? Math.floor((hoje.getTime() - new Date(hs.ultimo_acesso).getTime()) / 86400000)
      : 999

    return {
      nome: u.nome,
      email: u.email,
      role,
      emoji: EMOJI_ROLE[role] || '👤',
      score_total: score,
      execucao: hs?.execucao ?? 0,
      ritmo: hs?.ritmo ?? 0,
      aprendizado: hs?.aprendizado ?? 0,
      qualidade: hs?.qualidade ?? 0,
      feedback_score: hs?.feedback_score ?? 0,
      nivel,
      cor: corNivel(nivel),
      tendencia: hs?.tendencia || 'estavel',
      dias_sem_acesso: Math.min(diasSemAcesso, 999),
      ultimo_acesso: hs?.ultimo_acesso || null,
      alerta_inatividade: diasSemAcesso >= 2,
      alerta_tendencia: hs?.tendencia === 'caindo',
    }
  })

  equipe.sort((a, b) => b.score_total - a.score_total)

  const media = equipe.length > 0
    ? Math.round(equipe.reduce((s, e) => s + e.score_total, 0) / equipe.length)
    : 0

  return NextResponse.json({
    equipe,
    total: equipe.length,
    media_score: media,
    nivel_empresa: calcNivel(media),
    alertas: equipe.filter(e => e.alerta_inatividade || e.alerta_tendencia).length,
  })
}
