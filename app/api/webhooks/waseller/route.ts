import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Mapa de etapa do CRM Waseller → etapa canonical HQ
const ETAPA_MAP: Record<string, string> = {
  novo: 'lead', lead: 'lead', recebido: 'lead', entrada: 'lead',
  contato: 'contato', conversa: 'contato', em_contato: 'contato',
  qualificado: 'qualificado', qualificacao: 'qualificado',
  agendado: 'agendamento', agendamento: 'agendamento', reuniao_marcada: 'agendamento',
  compareceu: 'comparecimento', comparecimento: 'comparecimento', reuniao_realizada: 'comparecimento',
  fechado: 'venda', ganho: 'venda', deal_won: 'venda', venda: 'venda',
  perdido: 'perdido', sem_interesse: 'perdido', nao_qualificado: 'perdido',
}

type WasellerPayload = {
  event?: string
  lead_id?: string
  id?: string
  name?: string
  phone?: string
  company?: string
  city?: string
  stage?: string
  etapa?: string
  source?: string
  value?: number
  lost_reason?: string
}

function mapEtapa(raw: string | undefined): string {
  if (!raw) return 'lead'
  const key = raw.toLowerCase().trim().replace(/\s+/g, '_')
  return ETAPA_MAP[key] || 'lead'
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'waseller-webhook',
    url: '/api/webhooks/waseller',
    auth: 'header x-waseller-token ou ?token=',
    etapas_conhecidas: Object.keys(ETAPA_MAP),
  })
}

export async function POST(req: NextRequest) {
  // 1. Auth
  const tokenEnv = process.env.WASELLER_WEBHOOK_TOKEN
  const tokenHeader = req.headers.get('x-waseller-token') || req.nextUrl.searchParams.get('token')
  if (tokenEnv && tokenHeader !== tokenEnv) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: WasellerPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const evento = body.event || 'unknown'
  const leadId = body.lead_id || body.id || null
  const leadNome = body.name || null
  const etapaRaw = body.stage || body.etapa
  const etapaHq = mapEtapa(etapaRaw)

  // 2. Sempre logar o raw (mesmo sem mapear)
  await sb.from('waseller_webhooks_log').insert({
    evento,
    payload: body,
    lead_id: leadId,
    lead_nome: leadNome,
    etapa_nova: etapaHq,
    processado: false,
  })

  try {
    if (!leadId) {
      return NextResponse.json({ ok: true, warning: 'no lead_id — just logged' })
    }

    // 3. Upsert em sdr_leads_crm
    const now = new Date().toISOString()
    const timestamps: Record<string, string> = {}
    if (etapaHq === 'lead') timestamps.ts_lead_criado = now
    if (etapaHq === 'qualificado') timestamps.ts_qualificado = now
    if (etapaHq === 'agendamento') timestamps.ts_agendado = now
    if (etapaHq === 'comparecimento') timestamps.ts_compareceu = now
    if (etapaHq === 'venda') timestamps.ts_fechado = now
    if (etapaHq === 'perdido') timestamps.ts_perdido = now

    const upsertPayload = {
      waseller_id: leadId,
      nome: leadNome,
      telefone: body.phone || null,
      clinica: body.company || null,
      cidade: body.city || null,
      etapa_atual: etapaRaw || null,
      etapa_hq: etapaHq,
      valor_contrato: body.value || null,
      motivo_perda: body.lost_reason || null,
      fonte: body.source || 'waseller',
      updated_at: now,
      ...timestamps,
    }

    await sb.from('sdr_leads_crm').upsert(upsertPayload, { onConflict: 'waseller_id' })

    // 4. Incrementar métricas do dia (fonte=waseller)
    const hoje = now.slice(0, 10)
    const { data: existente } = await sb
      .from('sdr_metricas_diarias')
      .select('*')
      .eq('data', hoje)
      .eq('fonte', 'waseller')
      .maybeSingle()

    const camposPorEtapa: Record<string, string> = {
      lead: 'leads',
      qualificado: 'qualificados',
      agendamento: 'agendamentos',
      comparecimento: 'comparecimentos',
      venda: 'vendas',
    }
    const campo = camposPorEtapa[etapaHq]

    if (campo) {
      if (existente) {
        const atual = Number((existente as Record<string, unknown>)[campo] || 0)
        await sb
          .from('sdr_metricas_diarias')
          .update({ [campo]: atual + 1, waseller_sync: true })
          .eq('id', existente.id as string)
      } else {
        await sb.from('sdr_metricas_diarias').insert({
          data: hoje,
          fonte: 'waseller',
          waseller_sync: true,
          [campo]: 1,
        })
      }
    }

    // 5. Criar evento HQ em marcos importantes
    if (etapaHq === 'agendamento' || etapaHq === 'venda') {
      const titulo =
        etapaHq === 'agendamento'
          ? `📅 Novo agendamento: ${leadNome || leadId}`
          : `🎉 Venda fechada: ${leadNome || leadId}`
      await sb.from('eventos').insert({
        tipo: etapaHq === 'venda' ? 'venda' : 'agendamento',
        titulo,
        descricao: `Waseller · ${body.company || 'sem clínica'} · ${body.city || ''}`,
        criado_por: 'waseller-webhook',
      }).throwOnError?.()
        .then?.(() => {}, () => {})
    }

    // 6. Marcar log como processado
    await sb
      .from('waseller_webhooks_log')
      .update({ processado: true })
      .eq('lead_id', leadId)
      .eq('evento', evento)
      .eq('processado', false)

    return NextResponse.json({ ok: true, lead: leadNome || leadId, etapa_hq: etapaHq })
  } catch (e) {
    const erro = e instanceof Error ? e.message : 'erro desconhecido'
    // Ainda retorna 200 — NUNCA pausar a fila do CRM
    return NextResponse.json({ ok: true, warning: erro })
  }
}
