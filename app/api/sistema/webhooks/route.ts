import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type WebhookItem = {
  id: string
  origem: 'asaas' | 'prospecta' | 'wascript'
  event: string | null
  ref_id: string | null
  payload: unknown
  processed: boolean
  error: string | null
  created_at: string
}

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 100), 500)
  const origem = req.nextUrl.searchParams.get('origem') // asaas | prospecta | wascript | null
  const apenasErros = req.nextUrl.searchParams.get('erros') === '1'

  const itens: WebhookItem[] = []

  // 1. asaas_webhooks_log
  if (!origem || origem === 'asaas') {
    try {
      const { data } = await sb
        .from('asaas_webhooks_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      for (const r of (data || [])) {
        itens.push({
          id: r.id,
          origem: 'asaas',
          event: r.event,
          ref_id: r.payment_id,
          payload: r.payload,
          processed: !!r.processed,
          error: r.error || null,
          created_at: r.created_at,
        })
      }
    } catch { /* tabela pode não existir */ }
  }

  // 2. prospecta_webhooks_log (CRM WhatsApp)
  if (!origem || origem === 'prospecta' || origem === 'wascript') {
    try {
      const { data } = await sb
        .from('prospecta_webhooks_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
      for (const r of (data || [])) {
        itens.push({
          id: r.id,
          origem: 'prospecta',
          event: r.evento,
          ref_id: r.numero || r.nome,
          payload: r,
          processed: !!r.processado,
          error: null,
          created_at: r.created_at,
        })
      }
    } catch { /* */ }
  }

  // Sort global por data desc
  itens.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const filtrados = apenasErros
    ? itens.filter(i => !!i.error || !i.processed)
    : itens

  // Estatísticas
  const stats = {
    total: itens.length,
    por_origem: {
      asaas: itens.filter(i => i.origem === 'asaas').length,
      prospecta: itens.filter(i => i.origem === 'prospecta').length,
    },
    processados: itens.filter(i => i.processed).length,
    com_erro: itens.filter(i => !!i.error).length,
    nao_processados: itens.filter(i => !i.processed && !i.error).length,
  }

  return NextResponse.json({
    stats,
    itens: filtrados.slice(0, limit),
  })
}

// POST: reprocessar um webhook
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { id, origem } = body

  if (!id || !origem) {
    return NextResponse.json({ error: 'id e origem obrigatórios' }, { status: 400 })
  }

  // Por enquanto só marca como processado (reprocess real fica pra outra etapa)
  const table = origem === 'asaas' ? 'asaas_webhooks_log' : 'prospecta_webhooks_log'
  const field = origem === 'asaas' ? 'processed' : 'processado'

  const { error } = await sb.from(table).update({ [field]: true }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
