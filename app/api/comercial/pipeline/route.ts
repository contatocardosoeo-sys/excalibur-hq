import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { COMERCIAL_METAS } from '../../../lib/config'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'guilherme.excalibur@gmail.com'
  const now = new Date()
  const mes = now.getMonth() + 1
  const ano = now.getFullYear()

  const [{ data: pipeline }, { data: metas }, { data: funilMensal }] = await Promise.all([
    supabase.from('pipeline_closer').select('*').order('created_at', { ascending: false }),
    supabase.from('metas_closer').select('*').eq('closer_email', email).eq('mes', mes).eq('ano', ano).maybeSingle(),
    supabase.from('funil_trafego').select('*').eq('mes', mes).eq('ano', ano).maybeSingle(),
  ])

  const items = pipeline || []

  // Reunioes do mes = todas que ja agendaram/avancaram (status reuniao_agendada/proposta/fechado)
  let reunioesSemana = items.filter(p => ['reuniao_agendada', 'proposta_enviada', 'fechado'].includes(p.status)).length
  let propostasEnviadas = items.filter(p => p.status === 'proposta_enviada').length
  let fechamentos = items.filter(p => p.status === 'fechado').length
  let mrrMes = items.filter(p => p.status === 'fechado').reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)

  // Fallback: se pipeline_closer esta vazio, usar funil_trafego (Guilherme preenche manualmente)
  if (items.length === 0 && funilMensal) {
    reunioesSemana = funilMensal.reunioes_realizadas || 0
    fechamentos = funilMensal.fechamentos || 0
    mrrMes = Number(funilMensal.faturamento) || 0
  }

  const totalReunioes = Math.max(reunioesSemana, items.length)

  // Metas do config (fonte única) — não mais da tabela metas_closer
  const metaReunioes = COMERCIAL_METAS.reunioes_mes
  const metaFechamentos = COMERCIAL_METAS.fechamentos_mes
  const metaMrr = COMERCIAL_METAS.mrr_meta
  const comissaoPct = COMERCIAL_METAS.comissao_pct * 100
  const comissaoValor = mrrMes * COMERCIAL_METAS.comissao_pct
  void metas // banco mantido como log mas não usado

  return NextResponse.json({
    pipeline: items,
    kpis: { reunioesSemana, propostasEnviadas, fechamentos, mrrMes },
    metas: {
      reunioes: { atual: totalReunioes, meta: metaReunioes },
      fechamentos: { atual: fechamentos, meta: metaFechamentos },
      mrr: { atual: mrrMes, meta: metaMrr },
      comissao_pct: comissaoPct,
      comissao_valor: comissaoValor,
      reunioes_dia: COMERCIAL_METAS.reunioes_dia,
      fechamentos_dia: COMERCIAL_METAS.fechamentos_dia,
      reunioes_semana: COMERCIAL_METAS.reunioes_semana,
      fechamentos_semana: COMERCIAL_METAS.fechamentos_semana,
    },
    fonte_metas: 'config.ts (funil alvo R$90k)',
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase.from('pipeline_closer').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, data })
}

// Fallback quando o card não tem closer_id preenchido
const CLOSER_DEFAULT_EMAIL = 'guilherme.excalibur@gmail.com'
const CLOSER_DEFAULT_NOME = 'Guilherme'

export async function PATCH(req: NextRequest) {
  const { id, ...updates } = await req.json()

  // Estado anterior + closer dono do card
  const { data: anterior } = await supabase
    .from('pipeline_closer')
    .select('status, nome_clinica, mrr_proposto, closer_id')
    .eq('id', id)
    .maybeSingle()

  const { data, error } = await supabase
    .from('pipeline_closer')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Se moveu para "fechado" agora, dispara comissão
  const virouFechado = updates.status === 'fechado' && anterior?.status !== 'fechado'
  if (virouFechado) {
    try {
      // Resolver qual closer leva a comissão: preferência pro closer_id do card
      let closerEmail = CLOSER_DEFAULT_EMAIL
      let closerNome = CLOSER_DEFAULT_NOME
      const closerId = (data?.closer_id || anterior?.closer_id) as string | null | undefined
      if (closerId) {
        const { data: u } = await supabase
          .from('usuarios_internos')
          .select('email, nome')
          .eq('id', closerId)
          .maybeSingle()
        if (u?.email) {
          closerEmail = u.email
          closerNome = u.nome || closerEmail
        }
      }

      const ticket = Number(data.mrr_proposto || 2400)
      const hoje = new Date().toISOString().slice(0, 10)
      const mes = new Date().getMonth() + 1
      const ano = new Date().getFullYear()

      await supabase.from('comissoes').insert([
        // Closer 5% da primeira mensalidade (dinâmico via closer_id)
        {
          colaborador_email: closerEmail,
          colaborador_nome: closerNome,
          role: 'closer',
          tipo: 'venda',
          valor: Math.round(ticket * 0.05),
          mes,
          ano,
          data_evento: hoje,
          pipeline_card_id: id,
          lead_nome: data.nome_clinica || anterior?.nome_clinica || null,
          ticket_venda: ticket,
          observacao: 'pipeline fechado',
        },
        // SDR bônus R$40
        {
          colaborador_email: 'trindade.excalibur@gmail.com',
          colaborador_nome: 'Trindade',
          role: 'sdr',
          tipo: 'venda',
          valor: 40,
          mes,
          ano,
          data_evento: hoje,
          pipeline_card_id: id,
          lead_nome: data.nome_clinica || anterior?.nome_clinica || null,
          ticket_venda: ticket,
          observacao: 'bônus fechamento via pipeline',
        },
      ])
    } catch {
      /* não bloqueia o update */
    }
  }

  return NextResponse.json({ success: true, data, comissao_gerada: virouFechado })
}
