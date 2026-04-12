import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit } from '@/app/lib/rate-limit'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Emails padrão do setor comercial (quem recebe comissão)
const CLOSER_EMAIL = 'guilherme.excalibur@gmail.com'
const CLOSER_NOME = 'Guilherme'
const SDR_EMAIL = 'trindade.excalibur@gmail.com'
const SDR_NOME = 'Trindade'

type CfgComissoes = {
  id: string
  closer_pct_venda: number
  sdr_valor_agendamento: number
  sdr_bonus_comparecimento: number
  sdr_bonus_venda: number
  bonus_equipe_patamar1_fech: number
  bonus_equipe_patamar1_closer: number
  bonus_equipe_patamar1_sdr: number
  bonus_equipe_patamar2_fech: number
  bonus_equipe_patamar2_closer: number
  bonus_equipe_patamar2_sdr: number
}

async function carregarConfig(): Promise<CfgComissoes> {
  const { data } = await sb.from('config_comissoes').select('*').order('atualizado_em', { ascending: false }).limit(1).single()
  return {
    ...data,
    closer_pct_venda: Number(data.closer_pct_venda),
    sdr_valor_agendamento: Number(data.sdr_valor_agendamento),
    sdr_bonus_comparecimento: Number(data.sdr_bonus_comparecimento),
    sdr_bonus_venda: Number(data.sdr_bonus_venda),
    bonus_equipe_patamar1_closer: Number(data.bonus_equipe_patamar1_closer),
    bonus_equipe_patamar1_sdr: Number(data.bonus_equipe_patamar1_sdr),
    bonus_equipe_patamar2_closer: Number(data.bonus_equipe_patamar2_closer),
    bonus_equipe_patamar2_sdr: Number(data.bonus_equipe_patamar2_sdr),
  } as CfgComissoes
}

type NovaComissao = {
  colaborador_email: string
  colaborador_nome: string
  role: 'closer' | 'sdr'
  tipo: 'agendamento' | 'comparecimento' | 'venda'
  valor: number
  mes: number
  ano: number
  data_evento: string
  lead_nome: string | null
  pipeline_card_id: string | null
  ticket_venda: number | null
}

async function verificarBonusEquipe(mes: number, ano: number, cfg: CfgComissoes) {
  const { count } = await sb
    .from('comissoes')
    .select('id', { count: 'exact', head: true })
    .eq('tipo', 'venda')
    .eq('role', 'closer')
    .eq('mes', mes)
    .eq('ano', ano)

  const fechamentos = count || 0

  if (fechamentos >= cfg.bonus_equipe_patamar1_fech) {
    await sb.from('bonus_equipe').upsert(
      {
        mes,
        ano,
        patamar: 1,
        fechamentos_mes: fechamentos,
        total_bonus: cfg.bonus_equipe_patamar1_closer + cfg.bonus_equipe_patamar1_sdr,
        distribuicao: {
          closer: cfg.bonus_equipe_patamar1_closer,
          sdr: cfg.bonus_equipe_patamar1_sdr,
        },
      },
      { onConflict: 'mes,ano,patamar' },
    )
  }

  if (fechamentos >= cfg.bonus_equipe_patamar2_fech) {
    await sb.from('bonus_equipe').upsert(
      {
        mes,
        ano,
        patamar: 2,
        fechamentos_mes: fechamentos,
        total_bonus: cfg.bonus_equipe_patamar2_closer + cfg.bonus_equipe_patamar2_sdr,
        distribuicao: {
          closer: cfg.bonus_equipe_patamar2_closer,
          sdr: cfg.bonus_equipe_patamar2_sdr,
        },
      },
      { onConflict: 'mes,ano,patamar' },
    )
  }

  return fechamentos
}

export async function POST(req: NextRequest) {
  // Rate limit: 20 req/min (prevenir comissões falsas)
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  const blocked = checkRateLimit(`comissao-calc-${ip}`, 20, 60_000)
  if (blocked) return blocked as unknown as NextResponse

  let body: {
    tipo: 'agendamento' | 'comparecimento' | 'venda'
    ticket?: number
    lead_nome?: string
    pipeline_card_id?: string
    data_evento?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const cfg = await carregarConfig()
  const data = body.data_evento || new Date().toISOString().slice(0, 10)
  const d = new Date(data + 'T12:00:00')
  const mes = d.getMonth() + 1
  const ano = d.getFullYear()
  const lead = body.lead_nome || null
  const card = body.pipeline_card_id || null
  const ticket = body.ticket || null

  const comissoes: NovaComissao[] = []

  if (body.tipo === 'agendamento') {
    comissoes.push({
      colaborador_email: SDR_EMAIL,
      colaborador_nome: SDR_NOME,
      role: 'sdr',
      tipo: 'agendamento',
      valor: cfg.sdr_valor_agendamento,
      mes,
      ano,
      data_evento: data,
      lead_nome: lead,
      pipeline_card_id: card,
      ticket_venda: null,
    })
  }

  if (body.tipo === 'comparecimento') {
    comissoes.push({
      colaborador_email: SDR_EMAIL,
      colaborador_nome: SDR_NOME,
      role: 'sdr',
      tipo: 'comparecimento',
      valor: cfg.sdr_bonus_comparecimento,
      mes,
      ano,
      data_evento: data,
      lead_nome: lead,
      pipeline_card_id: card,
      ticket_venda: null,
    })
  }

  if (body.tipo === 'venda') {
    const t = ticket || 2400
    comissoes.push({
      colaborador_email: CLOSER_EMAIL,
      colaborador_nome: CLOSER_NOME,
      role: 'closer',
      tipo: 'venda',
      valor: Math.round(t * cfg.closer_pct_venda),
      mes,
      ano,
      data_evento: data,
      lead_nome: lead,
      pipeline_card_id: card,
      ticket_venda: t,
    })
    comissoes.push({
      colaborador_email: SDR_EMAIL,
      colaborador_nome: SDR_NOME,
      role: 'sdr',
      tipo: 'venda',
      valor: cfg.sdr_bonus_venda,
      mes,
      ano,
      data_evento: data,
      lead_nome: lead,
      pipeline_card_id: card,
      ticket_venda: t,
    })
  }

  if (comissoes.length === 0) {
    return NextResponse.json({ error: 'tipo inválido: esperado agendamento|comparecimento|venda' }, { status: 400 })
  }

  const { data: inserted, error } = await sb.from('comissoes').insert(comissoes).select()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Depois de fechar venda, checar bônus de equipe
  let fechamentosMes = 0
  if (body.tipo === 'venda') {
    fechamentosMes = await verificarBonusEquipe(mes, ano, cfg)
  }

  return NextResponse.json({
    ok: true,
    comissoes: inserted,
    total: comissoes.reduce((s, c) => s + c.valor, 0),
    fechamentos_mes: fechamentosMes,
  })
}
