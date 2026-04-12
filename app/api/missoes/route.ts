import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Missões diárias por role — o que cada pessoa DEVE fazer todo dia
const MISSOES_POR_ROLE: Record<string, Array<{ key: string; label: string; pontos: number }>> = {
  sdr: [
    { key: 'lancar_metricas', label: 'Lançar métricas do dia no /sdr', pontos: 2 },
    { key: 'agendar_reuniao', label: 'Agendar pelo menos 1 reunião', pontos: 3 },
    { key: 'fazer_followup', label: 'Fazer follow-up em 3 leads', pontos: 1 },
  ],
  closer: [
    { key: 'atualizar_kanban', label: 'Atualizar status de 1 proposta no pipeline', pontos: 2 },
    { key: 'registrar_reuniao', label: 'Registrar resultado de 1 reunião', pontos: 3 },
    { key: 'revisar_pipeline', label: 'Revisar propostas esfriando', pontos: 1 },
  ],
  cs: [
    { key: 'contatar_cliente', label: 'Registrar contato com 1 cliente', pontos: 2 },
    { key: 'verificar_jornada', label: 'Verificar clientes em transição de etapa', pontos: 1 },
    { key: 'responder_pendente', label: 'Responder 1 pendência de cliente', pontos: 2 },
  ],
  coo: [
    { key: 'revisar_adocao', label: 'Verificar adoção da equipe no /coo', pontos: 2 },
    { key: 'checar_alertas', label: 'Checar e resolver alertas pendentes', pontos: 2 },
    { key: 'revisar_metricas', label: 'Revisar KPIs do dia', pontos: 1 },
  ],
  head_traffic: [
    { key: 'revisar_cpl', label: 'Verificar CPL das campanhas ativas', pontos: 2 },
    { key: 'atualizar_metricas', label: 'Atualizar métricas de tráfego do dia', pontos: 2 },
    { key: 'reportar_anomalia', label: 'Reportar qualquer anomalia de campanha', pontos: 1 },
  ],
  designer: [
    { key: 'verificar_demandas', label: 'Verificar demandas pendentes no /design', pontos: 1 },
    { key: 'iniciar_demanda', label: 'Iniciar ou entregar 1 demanda', pontos: 3 },
    { key: 'atualizar_status', label: 'Atualizar status das demandas em andamento', pontos: 1 },
  ],
  editor_video: [
    { key: 'verificar_demandas', label: 'Verificar demandas de vídeo pendentes', pontos: 1 },
    { key: 'iniciar_demanda', label: 'Iniciar ou entregar 1 vídeo', pontos: 3 },
    { key: 'atualizar_status', label: 'Atualizar status das edições em andamento', pontos: 1 },
  ],
  admin: [
    { key: 'revisar_dashboard', label: 'Verificar dashboard CEO', pontos: 1 },
    { key: 'decidir_propostas', label: 'Decidir sobre propostas de ajuste pendentes', pontos: 2 },
    { key: 'revisar_equipe', label: 'Verificar adoção e health score da equipe', pontos: 2 },
  ],
  cmo: [
    { key: 'revisar_trafego', label: 'Revisar dashboard de tráfego', pontos: 2 },
    { key: 'atualizar_kanban', label: 'Atualizar pipeline comercial', pontos: 2 },
    { key: 'propor_ajuste', label: 'Propor ajuste de meta se necessário', pontos: 1 },
  ],
}

// GET — missões do dia do user (cria automaticamente se não existem)
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const role = req.nextUrl.searchParams.get('role')
  const todos = req.nextUrl.searchParams.get('todos') === 'true'
  const hoje = new Date().toISOString().slice(0, 10)

  if (todos) {
    const { data } = await sb
      .from('missoes_diarias')
      .select('*')
      .eq('data', hoje)
      .order('user_email')

    // Agrupar por user
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

  if (existente && existente.length > 0) {
    const concluidas = existente.filter(m => m.concluida).length
    const pontos = existente.filter(m => m.concluida).reduce((s, m) => s + Number(m.pontos || 1), 0)
    return NextResponse.json({
      data: hoje,
      missoes: existente,
      total: existente.length,
      concluidas,
      pontos,
      pct: Math.round((concluidas / existente.length) * 100),
    })
  }

  // Criar missões do dia baseado no role
  const r = role || 'admin'
  const templates = MISSOES_POR_ROLE[r] || MISSOES_POR_ROLE.admin
  const novas = templates.map(t => ({
    user_email: email,
    data: hoje,
    missao_key: t.key,
    missao_label: t.label,
    pontos: t.pontos,
    concluida: false,
  }))

  const { data: criadas } = await sb
    .from('missoes_diarias')
    .upsert(novas, { onConflict: 'user_email,data,missao_key' })
    .select()

  return NextResponse.json({
    data: hoje,
    missoes: criadas || novas,
    total: novas.length,
    concluidas: 0,
    pontos: 0,
    pct: 0,
  })
}

// PATCH — marcar missão como concluída
export async function PATCH(req: NextRequest) {
  const { id, concluida } = await req.json()
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const updates: Record<string, unknown> = {
    concluida: concluida !== false,
  }
  if (concluida !== false) updates.concluida_em = new Date().toISOString()

  const { data, error } = await sb
    .from('missoes_diarias')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, missao: data })
}
