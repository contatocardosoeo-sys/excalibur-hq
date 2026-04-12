import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listarEtiquetas, agregarFunilDaWascript, type Etiqueta } from '@/app/lib/wascript'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const SDR_EMAIL = 'trindade.excalibur@gmail.com'

async function logApi(params: {
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

// GET — retorna último snapshot + status da conexão
export async function GET(req: NextRequest) {
  const force = req.nextUrl.searchParams.get('force') === 'true'

  // Último snapshot disponível
  const { data: ultimo } = await sb
    .from('wascript_etiquetas_snapshot')
    .select('*')
    .eq('sdr_email', SDR_EMAIL)
    .order('capturado_em', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Só revalida se forçar OU se último > 5 min
  const agora = Date.now()
  const ageMs = ultimo ? agora - new Date(ultimo.capturado_em).getTime() : Infinity
  const precisaRefresh = force || ageMs > 5 * 60 * 1000

  if (!precisaRefresh && ultimo) {
    return NextResponse.json({
      ok: true,
      cached: true,
      age_seconds: Math.floor(ageMs / 1000),
      snapshot: ultimo,
    })
  }

  // Puxar fresh da API
  const t0 = Date.now()
  try {
    const etiquetas = await listarEtiquetas()
    const duracao = Date.now() - t0
    const funil = agregarFunilDaWascript(etiquetas)
    const totalContatos = etiquetas.reduce((s, e) => s + Number(e.count || 0), 0)

    const { data: novoSnap } = await sb
      .from('wascript_etiquetas_snapshot')
      .insert({
        sdr_email: SDR_EMAIL,
        etiquetas,
        funil,
        total_contatos: totalContatos,
      })
      .select()
      .single()

    await logApi({
      endpoint: '/api/listar-etiquetas',
      metodo: 'GET',
      status_code: 200,
      duracao_ms: duracao,
      response: { total: etiquetas.length, counts: totalContatos },
      sucesso: true,
    })

    return NextResponse.json({
      ok: true,
      cached: false,
      duracao_ms: duracao,
      snapshot: novoSnap,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido'
    await logApi({
      endpoint: '/api/listar-etiquetas',
      metodo: 'GET',
      duracao_ms: Date.now() - t0,
      sucesso: false,
      erro: msg,
    })
    return NextResponse.json({ ok: false, error: msg, snapshot: ultimo || null }, { status: 502 })
  }
}
