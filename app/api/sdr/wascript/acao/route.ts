import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarTexto, modificarEtiquetas, criarNota } from '@/app/lib/wascript'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// POST — executa ação na conta WhatsApp do Trindade via Wascript
// Body: { tipo: 'enviar_texto' | 'criar_nota' | 'modificar_etiqueta', phone, ...payload }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { tipo, phone, message, content, actions } = body

  if (!phone) return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 })

  const t0 = Date.now()
  let resp: { success: boolean; message?: string } = { success: false }
  let erro: string | null = null

  try {
    if (tipo === 'enviar_texto') {
      if (!message) return NextResponse.json({ error: 'message obrigatório' }, { status: 400 })
      resp = await enviarTexto({ phone, message })
    } else if (tipo === 'criar_nota') {
      if (!content) return NextResponse.json({ error: 'content obrigatório' }, { status: 400 })
      resp = await criarNota({ phone, content })
    } else if (tipo === 'modificar_etiqueta') {
      if (!actions) return NextResponse.json({ error: 'actions obrigatório' }, { status: 400 })
      resp = await modificarEtiquetas({ phone, actions })
    } else {
      return NextResponse.json({ error: 'tipo inválido' }, { status: 400 })
    }
  } catch (e) {
    erro = e instanceof Error ? e.message : 'erro desconhecido'
    resp = { success: false, message: erro }
  }

  const duracao = Date.now() - t0

  await sb.from('wascript_api_log').insert({
    endpoint: `/api/${tipo === 'enviar_texto' ? 'enviar-texto' : tipo === 'criar_nota' ? 'criar-nota' : 'modificar-etiquetas'}`,
    metodo: 'POST',
    status_code: resp.success ? 200 : 500,
    duracao_ms: duracao,
    request_payload: body,
    response: resp,
    sucesso: resp.success,
    erro,
  })

  return NextResponse.json({
    ok: resp.success,
    duracao_ms: duracao,
    response: resp,
  })
}

// GET — últimos 20 logs de ações via Wascript (pra painel de diagnóstico)
export async function GET() {
  const { data } = await sb
    .from('wascript_api_log')
    .select('*')
    .order('chamado_em', { ascending: false })
    .limit(20)

  return NextResponse.json({ logs: data || [] })
}
