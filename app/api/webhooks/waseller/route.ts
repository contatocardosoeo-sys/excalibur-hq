import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { avancarEtapa } from '@/app/lib/wascript'
import {
  WASELLER_EVENTO_ETAPA,
  WASELLER_ETIQUETA_ETAPA,
  ETAPA_METRICA,
  SDR_ETAPAS,
} from '@/app/lib/config'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Aliases pra manter a cara do código antigo
const EVENTO_MAP = WASELLER_EVENTO_ETAPA
const ETIQUETA_MAP = WASELLER_ETIQUETA_ETAPA

type WasellerPayload = {
  event?: string
  evento?: string
  type?: string
  lead_id?: string
  id?: string
  numero?: string
  phone?: string
  number?: string
  name?: string
  nome?: string
  company?: string
  clinica?: string
  city?: string
  cidade?: string
  stage?: string
  etapa?: string
  etiqueta?: string
  label?: string
  source?: string
  value?: number
  valor?: number
  lost_reason?: string
  dados_do_evento?: unknown
}

function limparTelefone(tel: string): string {
  return (tel || '').replace(/\D/g, '')
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    url: 'https://excalibur-hq.vercel.app/api/webhooks/waseller',
    auth: 'opcional — header x-waseller-token OU ?token=',
    eventos_suportados: Object.keys(EVENTO_MAP),
    etiquetas_suportadas: Object.keys(ETIQUETA_MAP),
    etapas_sdr: SDR_ETAPAS.map(e => ({
      id: e.id,
      label: e.label,
      emoji: e.emoji,
      ordem: e.ordem,
    })),
  })
}

export async function POST(req: NextRequest) {
  // 1. Auth (opcional — mas validamos se o env estiver setado)
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

  const evento = (body.event || body.evento || body.type || '').toLowerCase().trim().replace(/\s+/g, '_')
  const telefoneRaw = body.numero || body.phone || body.number || ''
  const telefone = limparTelefone(telefoneRaw)
  const nome = body.name || body.nome || 'Lead'
  const clinica = body.company || body.clinica || null
  const cidade = body.city || body.cidade || null
  const etiquetaRaw = (body.etiqueta || body.label || '').toLowerCase().trim()
  const stageRaw = (body.stage || body.etapa || '').toLowerCase().trim()
  const valor = body.value || body.valor || null

  // Sempre logar o payload cru (mesmo se não mapear)
  const { data: logInserido } = await sb
    .from('waseller_webhooks_log')
    .insert({
      evento,
      payload: body as unknown as object,
      lead_id: telefone || body.lead_id || body.id || null,
      lead_nome: nome,
      etapa_nova: null,
      processado: false,
    })
    .select('id')
    .maybeSingle()

  // 2. Determinar etapa HQ
  let etapaHQ: string | null = EVENTO_MAP[evento] || null
  if (!etapaHQ && evento === 'etiqueta' && etiquetaRaw) {
    etapaHQ = ETIQUETA_MAP[etiquetaRaw] || null
  }
  if (!etapaHQ && stageRaw) {
    etapaHQ = EVENTO_MAP[stageRaw] || null
  }

  if (!etapaHQ || !telefone) {
    // Salvar log com aviso mas sempre retornar 200
    if (logInserido) {
      await sb
        .from('waseller_webhooks_log')
        .update({ erro: `evento não mapeado (evento=${evento}, etiqueta=${etiquetaRaw})` })
        .eq('id', logInserido.id)
    }
    return NextResponse.json({ ok: true, aviso: 'evento não mapeado', evento, etiqueta: etiquetaRaw })
  }

  try {
    // 3. Buscar etapa anterior pelo telefone
    const { data: leadExistente } = await sb
      .from('sdr_leads_crm')
      .select('id, etapa_hq, waseller_id')
      .eq('telefone', telefone)
      .maybeSingle()

    const etapaAnterior = leadExistente?.etapa_hq || null

    // 4. Upsert lead CRM espelhado
    const agora = new Date().toISOString()
    // Cada etapa tem sua própria coluna ts_<etapa> em sdr_leads_crm
    const tsField = `ts_${etapaHQ}`

    const upsertPayload: Record<string, unknown> = {
      telefone,
      waseller_id: leadExistente?.waseller_id || body.lead_id || body.id || `waseller-${telefone}`,
      nome,
      clinica,
      cidade,
      etapa_atual: evento,
      etapa_hq: etapaHQ,
      valor_contrato: valor,
      motivo_perda: body.lost_reason || null,
      fonte: 'waseller',
      updated_at: agora,
    }
    if (tsField) upsertPayload[tsField] = agora

    if (leadExistente) {
      await sb.from('sdr_leads_crm').update(upsertPayload).eq('id', leadExistente.id)
    } else {
      await sb.from('sdr_leads_crm').insert(upsertPayload)
    }

    // 5. Incrementar métrica do dia (fonte=waseller, evita double-count com manual)
    const hoje = agora.slice(0, 10)
    // Campo da métrica vem do config (ETAPA_METRICA tem as 10 etapas reais)
    const campo = ETAPA_METRICA[etapaHQ] || null

    if (campo) {
      const { data: mHoje } = await sb
        .from('sdr_metricas_diarias')
        .select('*')
        .eq('data', hoje)
        .eq('fonte', 'waseller')
        .maybeSingle()

      if (mHoje) {
        const atual = Number((mHoje as Record<string, unknown>)[campo] || 0)
        await sb
          .from('sdr_metricas_diarias')
          .update({ [campo]: atual + 1, waseller_sync: true })
          .eq('id', mHoje.id as string)
      } else {
        await sb.from('sdr_metricas_diarias').insert({
          data: hoje,
          sdr_email: 'trindade.excalibur@gmail.com',
          fonte: 'waseller',
          waseller_sync: true,
          [campo]: 1,
        })
      }
    }

    // 6. Criar evento HQ nos marcos importantes (tabela real: eventos_hq)
    const marcosRelevantes: Record<string, string> = {
      recepcao: `📥 Novo lead (Waseller): ${nome}`,
      qualificacao: `✅ Lead qualificado (Waseller): ${nome}`,
      agendamento: `📅 Novo agendamento (Waseller): ${nome}`,
      confirmacao: `🔔 Reunião confirmada (Waseller): ${nome}`,
      reagendar: `🔄 No-show — reagendando (Waseller): ${nome}`,
    }
    if (marcosRelevantes[etapaHQ]) {
      try {
        await sb.from('eventos_hq').insert({
          tipo: etapaHQ,
          titulo: marcosRelevantes[etapaHQ],
          descricao: `${clinica || ''} ${cidade ? `· ${cidade}` : ''}`.trim(),
          criado_por: 'waseller-webhook',
        })
      } catch {
        /* */
      }
    }

    // 7. Disparar comissões SDR (fire-and-forget)
    // - agendamento → SDR R$8 (reunião marcada)
    // - confirmacao → SDR R$12 (reunião confirmada/realizada)
    const mesEvt = new Date(agora).getMonth() + 1
    const anoEvt = new Date(agora).getFullYear()

    if (etapaHQ === 'agendamento') {
      Promise.resolve().then(async () => {
        try {
          await sb.from('comissoes').insert({
            colaborador_email: 'trindade.excalibur@gmail.com',
            colaborador_nome: 'Trindade',
            role: 'sdr',
            tipo: 'agendamento',
            valor: 8,
            mes: mesEvt,
            ano: anoEvt,
            data_evento: hoje,
            lead_nome: nome,
            observacao: 'webhook Waseller',
          })
        } catch {
          /* */
        }
      })
    }
    // (comissão "comparecimento" R$12 só é gerada quando o closer marca no pipeline)

    // 8. Espelhar etiqueta no WhatsApp via Wascript (remove anterior + aplica nova)
    if (telefone && etapaAnterior !== etapaHQ) {
      Promise.resolve().then(async () => {
        try {
          await avancarEtapa(telefone, etapaAnterior, etapaHQ!)
        } catch (e) {
          console.error('[waseller→wascript avancar]', e)
        }
      })
    }

    // 9. ⚠️ HQ é PASSIVO — NÃO envia mensagem automática.
    // O Waseller já tem 58 fluxos configurados com áudios humanizados e cadências.
    // Envio manual só via UI do /sdr quando Trindade decidir clicar em um botão.

    // 10. Marcar log como processado
    if (logInserido) {
      await sb
        .from('waseller_webhooks_log')
        .update({ processado: true, etapa_nova: etapaHQ })
        .eq('id', logInserido.id)
    }

    return NextResponse.json({
      ok: true,
      evento,
      etapa_hq: etapaHQ,
      etapa_anterior: etapaAnterior,
      lead: nome,
      telefone,
      whatsapp_disparado: !!telefone && etapaAnterior !== etapaHQ,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    if (logInserido) {
      await sb.from('waseller_webhooks_log').update({ erro: msg }).eq('id', logInserido.id)
    }
    // SEMPRE retornar 200 — nunca travar a fila do Waseller
    return NextResponse.json({ ok: true, warning: msg })
  }
}
