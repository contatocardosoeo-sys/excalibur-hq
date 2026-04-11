// Lib compartilhada da iniciativa de migração cultural (HQ-only)

import { createClient } from '@supabase/supabase-js'

export const migSb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ISO week string: 2026-W15
export function getSemanaIso(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

// Dias úteis de 1 a 5 (seg-sex); retorna quantos já passaram nesta semana
export function diasUteisDecorridosSemana(hoje: Date = new Date()): number {
  const dia = hoje.getDay() // 0=dom, 1=seg, ..., 6=sab
  if (dia === 0) return 5         // domingo: a semana passada já passou 5 dias úteis
  if (dia === 6) return 5         // sábado: idem
  return dia                      // seg=1, ter=2, ..., sex=5
}

// Passos canônicos da migração (6 passos — cada colaborador precisa completar todos)
export const PASSOS = [
  { key: 'diagnostico',        label: 'Responder diagnóstico (5 perguntas)',       peso: 15, ordem: 1 },
  { key: 'importar_dados',     label: 'Importar seus dados externos',              peso: 20, ordem: 2 },
  { key: 'checkin_7_dias',     label: 'Fazer checkin diário por 7 dias seguidos',  peso: 20, ordem: 3 },
  { key: 'acesso_7_dias',      label: 'Usar o HQ 7 dias úteis consecutivos',       peso: 15, ordem: 4 },
  { key: 'zero_externo_7d',    label: '7 dias sem usar ferramenta externa',        peso: 20, ordem: 5 },
  { key: 'tutorial_equipe',    label: 'Assistir sessão de onboarding com Cardoso', peso: 10, ordem: 6 },
] as const

export type PassoKey = typeof PASSOS[number]['key']

// Calcula score de adoção HQ-only da semana atual do usuário
export async function calcularScoreAdocao(userEmail: string): Promise<{
  score: number
  dias_sem_externo: number
  dias_com_externo: number
  dias_uteis: number
  passos_concluidos: number
  passos_total: number
  bonus: number
}> {
  const semana = getSemanaIso()
  const diasUteis = diasUteisDecorridosSemana()

  // Busca checkins da semana atual
  const { data: checkins } = await migSb
    .from('checkin_diario')
    .select('*')
    .eq('user_email', userEmail)
    .gte('data', (() => {
      const d = new Date()
      d.setDate(d.getDate() - d.getDay() + 1)
      return d.toISOString().split('T')[0]
    })())

  const cs = checkins || []
  const diasSemExterno = cs.filter(c => !c.usou_externo).length
  const diasComExterno = cs.filter(c => c.usou_externo).length

  // Passos concluídos
  const { data: passos } = await migSb
    .from('migracao_passos')
    .select('*')
    .eq('user_email', userEmail)
    .eq('concluido', true)

  const passosConcluidos = (passos || []).length
  const pesoPassos = (passos || []).reduce((s, p) => {
    const def = PASSOS.find(x => x.key === p.passo_key)
    return s + (def?.peso || 0)
  }, 0)

  // Score base: quanto dos passos peso total
  let score = pesoPassos // 0-100 se todos completos

  // Penalidade: cada dia com externo tira 10 pontos
  score -= diasComExterno * 10

  // Bonus: 7 dias seguidos sem externo
  let bonus = 0
  if (diasSemExterno >= 5 && diasComExterno === 0) bonus = 10

  score = Math.max(0, Math.min(100, score + bonus))

  return {
    score,
    dias_sem_externo: diasSemExterno,
    dias_com_externo: diasComExterno,
    dias_uteis: diasUteis,
    passos_concluidos: passosConcluidos,
    passos_total: PASSOS.length,
    bonus,
  }
}

// Marca passo concluído (idempotente)
export async function marcarPassoConcluido(userEmail: string, passoKey: PassoKey, metadata?: Record<string, unknown>) {
  return migSb.from('migracao_passos').upsert({
    user_email: userEmail,
    passo_key: passoKey,
    concluido: true,
    concluido_em: new Date().toISOString(),
    metadata: metadata || null,
  }, { onConflict: 'user_email,passo_key' })
}

// Checklist de passos por role — o que cada um precisa importar
export const CHECKLIST_ROLE: Record<string, { passo: string; label: string; rota: string }[]> = {
  sdr: [
    { passo: 'diagnostico',   label: 'Responder o diagnóstico', rota: '/migracao/diagnostico' },
    { passo: 'importar_leads', label: 'Importar leads que estão no seu WhatsApp/planilha', rota: '/importar/leads' },
    { passo: 'checkin_hoje', label: 'Fazer checkin do dia', rota: '/migracao/checkin' },
    { passo: 'metrica_hoje', label: 'Lançar métricas de hoje em /sdr', rota: '/sdr' },
  ],
  closer: [
    { passo: 'diagnostico',     label: 'Responder o diagnóstico', rota: '/migracao/diagnostico' },
    { passo: 'importar_pipeline', label: 'Importar deals abertos', rota: '/importar/pipeline' },
    { passo: 'checkin_hoje', label: 'Fazer checkin do dia', rota: '/migracao/checkin' },
    { passo: 'kanban', label: 'Atualizar kanban de hoje', rota: '/comercial' },
  ],
  cs: [
    { passo: 'diagnostico', label: 'Responder o diagnóstico', rota: '/migracao/diagnostico' },
    { passo: 'importar_contatos', label: 'Importar histórico de contatos das clínicas', rota: '/importar/contatos-cs' },
    { passo: 'checkin_hoje', label: 'Fazer checkin do dia', rota: '/migracao/checkin' },
    { passo: 'registrar_contatos', label: 'Registrar 3 contatos de hoje', rota: '/cs' },
  ],
  head_traffic: [
    { passo: 'diagnostico', label: 'Responder o diagnóstico', rota: '/migracao/diagnostico' },
    { passo: 'importar_clinicas', label: 'Configurar as 48 clínicas com gestor + metas', rota: '/importar/clinicas-trafego' },
    { passo: 'checkin_hoje', label: 'Fazer checkin do dia', rota: '/migracao/checkin' },
    { passo: 'lancar_metricas', label: 'Lançar métricas de hoje', rota: '/trafego-clientes' },
  ],
  coo: [
    { passo: 'diagnostico', label: 'Responder o diagnóstico', rota: '/migracao/diagnostico' },
    { passo: 'revisar_equipe', label: 'Revisar painel de adoção da equipe', rota: '/coo/migracao' },
    { passo: 'checkin_hoje', label: 'Fazer checkin do dia', rota: '/migracao/checkin' },
  ],
  admin: [
    { passo: 'diagnostico', label: 'Responder o diagnóstico (exemplo pro time)', rota: '/migracao/diagnostico' },
    { passo: 'dar_exemplo', label: 'Responder todas as perguntas do time "use o HQ"', rota: '/ceo' },
    { passo: 'checkin_hoje', label: 'Fazer checkin do dia', rota: '/migracao/checkin' },
  ],
}
