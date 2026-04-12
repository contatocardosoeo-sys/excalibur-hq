import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  enviarTexto,
  modificarEtiqueta,
  avancarEtapa,
  listarEtiquetas,
  criarNota,
  MSGS,
} from '@/app/lib/wascript'
import { SDR_ETAPAS, ETAPA_ETIQUETA, MSGS_ETAPAS } from '@/app/lib/config'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type CorpoPost = {
  acao:
    | 'enviar_texto'
    | 'enviar_msg_padrao'
    | 'modificar_etiqueta'
    | 'avancar_etapa'
    | 'listar_etiquetas'
    | 'criar_nota'
  telefone?: string
  mensagem?: string
  tipo?: string // etapa (recepcao/explicacao/...) ou legado (confirmacao/lembrete/pos_reuniao/no_show/follow_up)
  labelId?: string
  type?: 'add' | 'remove'
  etapa_anterior?: string | null
  etapa_nova?: string
  nota?: string
}

async function log(params: {
  endpoint: string
  metodo: string
  status_code?: number
  duracao_ms: number
  request_payload?: unknown
  response?: unknown
  sucesso: boolean
  erro?: string
}) {
  try {
    await sb.from('wascript_api_log').insert({
      endpoint: params.endpoint,
      metodo: params.metodo,
      status_code: params.status_code || null,
      duracao_ms: params.duracao_ms,
      request_payload: params.request_payload || null,
      response: params.response || null,
      sucesso: params.sucesso,
      erro: params.erro || null,
    })
  } catch {
    /* */
  }
}

// GET — Health check + descoberta das etiquetas do funil
export async function GET() {
  try {
    const t0 = Date.now()
    const etiquetas = await listarEtiquetas()
    const duracao = Date.now() - t0
    await log({
      endpoint: '/api/wascript (health)',
      metodo: 'GET',
      status_code: 200,
      duracao_ms: duracao,
      response: { total: etiquetas.length },
      sucesso: true,
    })
    // Mapeia cada etapa para o nome real da etiqueta no WhatsApp
    const nomeEtiqPorId: Record<string, string> = {}
    for (const e of etiquetas) {
      nomeEtiqPorId[e.id] = (e.name || '').replace(/[\u200E\u200F]/g, '').trim()
    }

    return NextResponse.json({
      ok: true,
      token_ativo: true,
      total_etiquetas: etiquetas.length,
      etiquetas_raw: etiquetas,
      etapas_funil: SDR_ETAPAS.map(e => {
        const labelId = ETAPA_ETIQUETA[e.id] ?? null
        return {
          id: e.id,
          label: e.label,
          emoji: e.emoji,
          ordem: e.ordem,
          metrica: e.metrica,
          etiqueta_id: labelId,
          etiqueta_nome: labelId ? nomeEtiqPorId[labelId] || null : null,
          mensagem_auto: MSGS_ETAPAS[e.id] || null,
        }
      }),
      duracao_ms: duracao,
    })
  } catch (e) {
    const erro = e instanceof Error ? e.message : 'erro desconhecido'
    return NextResponse.json({ ok: false, token_ativo: false, erro }, { status: 502 })
  }
}

// POST — Ações
export async function POST(req: NextRequest) {
  let body: CorpoPost
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const { acao, telefone, mensagem, tipo, labelId, type, etapa_anterior, etapa_nova, nota } = body
  const t0 = Date.now()
  let resposta: unknown = null
  let sucesso = false
  let erro: string | undefined

  try {
    switch (acao) {
      case 'enviar_texto': {
        if (!telefone || !mensagem) {
          return NextResponse.json({ error: 'telefone e mensagem obrigatórios' }, { status: 400 })
        }
        const d = await enviarTexto(telefone, mensagem)
        resposta = d
        sucesso = !!d.success
        break
      }

      case 'enviar_msg_padrao': {
        if (!telefone) {
          return NextResponse.json({ error: 'telefone obrigatório' }, { status: 400 })
        }
        // tipo pode ser nome de etapa (recepcao/explicacao/...) OU nome legado (confirmacao/lembrete/etc)
        const msg =
          (tipo && MSGS_ETAPAS[tipo]) ||
          (tipo && MSGS[tipo]) ||
          mensagem ||
          MSGS.follow_up
        const d = await enviarTexto(telefone, msg)
        resposta = d
        sucesso = !!d.success
        break
      }

      case 'modificar_etiqueta': {
        if (!telefone || !labelId || !type) {
          return NextResponse.json(
            { error: 'telefone, labelId e type obrigatórios' },
            { status: 400 },
          )
        }
        const d = await modificarEtiqueta(telefone, labelId, type)
        resposta = d
        sucesso = !!d.success
        break
      }

      case 'avancar_etapa': {
        if (!telefone || !etapa_nova) {
          return NextResponse.json(
            { error: 'telefone e etapa_nova obrigatórios' },
            { status: 400 },
          )
        }
        await avancarEtapa(telefone, etapa_anterior || null, etapa_nova)
        // Mensagem automática quando aplicável
        const msgMap: Record<string, string> = {
          agendamento: 'confirmacao',
          comparecimento: 'pos_reuniao',
          perdido: 'follow_up',
          no_show: 'no_show',
        }
        if (msgMap[etapa_nova]) {
          await enviarTexto(telefone, MSGS[msgMap[etapa_nova]])
        }
        resposta = { ok: true, etapa: etapa_nova }
        sucesso = true
        break
      }

      case 'listar_etiquetas': {
        const etiquetas = await listarEtiquetas()
        resposta = { success: true, etiquetas }
        sucesso = true
        break
      }

      case 'criar_nota': {
        if (!telefone || !nota) {
          return NextResponse.json({ error: 'telefone e nota obrigatórios' }, { status: 400 })
        }
        const d = await criarNota(telefone, nota)
        resposta = d
        sucesso = !!d.success
        break
      }

      default:
        return NextResponse.json({ error: 'acao inválida' }, { status: 400 })
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : 'erro desconhecido'
    sucesso = false
    resposta = { success: false, message: erro }
  }

  const duracao = Date.now() - t0

  await log({
    endpoint: `/api/wascript (${acao})`,
    metodo: 'POST',
    status_code: sucesso ? 200 : 500,
    duracao_ms: duracao,
    request_payload: body,
    response: resposta,
    sucesso,
    erro,
  })

  return NextResponse.json(resposta, { status: sucesso ? 200 : 502 })
}
