import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { avancarEtapa, enviarTexto, MSGS } from '@/app/lib/wascript'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type TipoEvento =
  | 'lead'
  | 'agendamento'
  | 'comparecimento'
  | 'venda'
  | 'no_show'
  | 'perdido'

type Body = {
  tipo: TipoEvento
  lead_nome?: string
  telefone?: string
  clinica?: string
  cidade?: string
  etapa_atual?: string      // pra no_show/perdido, a etapa de onde veio
  valor_contrato?: number
  motivo_perda?: string
  waseller_id?: string
  observacao?: string
}

// Mapeia tipo de evento pra etapa canonical do HQ
const TIPO_PARA_ETAPA: Record<TipoEvento, string> = {
  lead: 'lead',
  agendamento: 'agendamento',
  comparecimento: 'comparecimento',
  venda: 'venda',
  no_show: 'lead',      // volta pra lead
  perdido: 'perdido',
}

/**
 * POST /api/sdr/lancar
 * Registra um evento per-lead e dispara ação no WhatsApp em background.
 * Não bloqueia a resposta — Wascript roda em Promise.resolve().then().
 */
export async function POST(req: NextRequest) {
  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { tipo, lead_nome, telefone, clinica, cidade, etapa_atual, valor_contrato, motivo_perda, waseller_id, observacao } = body
  if (!tipo) return NextResponse.json({ error: 'tipo obrigatório' }, { status: 400 })

  const etapaNova = TIPO_PARA_ETAPA[tipo]
  if (!etapaNova) return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })

  const now = new Date().toISOString()
  const timestamps: Record<string, string> = {}
  if (etapaNova === 'lead') timestamps.ts_lead_criado = now
  if (etapaNova === 'agendamento') timestamps.ts_agendado = now
  if (etapaNova === 'comparecimento') timestamps.ts_compareceu = now
  if (etapaNova === 'venda') timestamps.ts_fechado = now
  if (etapaNova === 'perdido') timestamps.ts_perdido = now

  // 1. Upsert em sdr_leads_crm — lookup por telefone primeiro (match com webhook Waseller)
  const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null
  const waseller_key = waseller_id || (telefoneLimpo ? `manual-${telefoneLimpo}` : `manual-${Date.now()}`)
  const payload: Record<string, unknown> = {
    nome: lead_nome || null,
    clinica: clinica || null,
    cidade: cidade || null,
    etapa_atual: tipo,
    etapa_hq: etapaNova,
    valor_contrato: valor_contrato || null,
    motivo_perda: motivo_perda || null,
    fonte: 'hq-manual',
    updated_at: now,
    ...timestamps,
  }

  // Se telefone fornecido, tenta update por telefone; senão insert novo
  if (telefoneLimpo) {
    const { data: existente } = await sb
      .from('sdr_leads_crm')
      .select('id, waseller_id')
      .eq('telefone', telefoneLimpo)
      .maybeSingle()

    if (existente) {
      const { error: updErr } = await sb
        .from('sdr_leads_crm')
        .update(payload)
        .eq('id', existente.id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    } else {
      const { error: insErr } = await sb
        .from('sdr_leads_crm')
        .insert({ ...payload, telefone: telefoneLimpo, waseller_id: waseller_key })
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
    }
  } else {
    const { error: insErr } = await sb
      .from('sdr_leads_crm')
      .insert({ ...payload, waseller_id: waseller_key })
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // 2. Incrementar sdr_metricas_diarias do dia (fonte=hq-manual)
  const hoje = now.slice(0, 10)
  const sdr_email = 'trindade.excalibur@gmail.com'
  const { data: mDia } = await sb
    .from('sdr_metricas_diarias')
    .select('*')
    .eq('data', hoje)
    .eq('sdr_email', sdr_email)
    .maybeSingle()

  const campoPorEtapa: Record<string, string> = {
    lead: 'leads_recebidos',
    agendamento: 'agendamentos',
    comparecimento: 'comparecimentos',
    venda: 'vendas',
  }
  const campo = campoPorEtapa[etapaNova]
  if (campo) {
    if (mDia) {
      const atual = Number((mDia as Record<string, unknown>)[campo] || 0)
      await sb.from('sdr_metricas_diarias').update({ [campo]: atual + 1 }).eq('id', mDia.id as string)
    } else {
      await sb.from('sdr_metricas_diarias').insert({
        data: hoje,
        sdr_email,
        fonte: 'hq-manual',
        [campo]: 1,
      })
    }
  }

  // 3. Criar evento HQ pros marcos
  if (etapaNova === 'agendamento' || etapaNova === 'comparecimento' || etapaNova === 'venda') {
    const titulos: Record<string, string> = {
      agendamento: `📅 Novo agendamento: ${lead_nome || clinica || telefone || 'sem nome'}`,
      comparecimento: `🤝 Reunião realizada: ${lead_nome || clinica || telefone || 'sem nome'}`,
      venda: `💰 Venda fechada: ${lead_nome || clinica || telefone || 'sem nome'}`,
    }
    try {
      await sb.from('eventos').insert({
        tipo: etapaNova,
        titulo: titulos[etapaNova],
        descricao: `${clinica || ''} ${cidade ? `· ${cidade}` : ''} ${observacao || ''}`.trim(),
        criado_por: 'sdr-hq',
      })
    } catch {
      /* */
    }
  }

  // 4. Fire-and-forget WhatsApp via Wascript (não bloqueia a resposta)
  if (telefone) {
    Promise.resolve().then(async () => {
      try {
        const etapaAnterior = etapa_atual || null

        if (tipo === 'agendamento') {
          await avancarEtapa(telefone, etapaAnterior || 'lead', 'agendamento')
          await enviarTexto(telefone, MSGS.confirmacao)
        } else if (tipo === 'comparecimento') {
          await avancarEtapa(telefone, etapaAnterior || 'agendamento', 'comparecimento')
          await enviarTexto(telefone, MSGS.pos_reuniao)
        } else if (tipo === 'venda') {
          await avancarEtapa(telefone, etapaAnterior || 'comparecimento', 'venda')
        } else if (tipo === 'no_show') {
          await avancarEtapa(telefone, 'agendamento', 'lead')
          await enviarTexto(telefone, MSGS.no_show)
        } else if (tipo === 'perdido') {
          await avancarEtapa(telefone, etapaAnterior, 'perdido')
          await enviarTexto(telefone, MSGS.follow_up)
        } else if (tipo === 'lead') {
          await avancarEtapa(telefone, null, 'lead')
        }
      } catch (e) {
        console.error('[WASCRIPT background]', e)
        // Falha do Wascript NÃO derruba o lançamento
      }
    })
  }

  return NextResponse.json({
    ok: true,
    tipo,
    etapa_hq: etapaNova,
    whatsapp_disparado: !!telefone,
    lead: { nome: lead_nome, telefone, clinica },
  })
}
