import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Scaffold da integração Meta Ads API.
// Ainda não conectado — aguardando token de longo prazo do Cardoso.
// Quando plugar, substitui 100% da planilha manual da Jéssica.

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const META_GRAPH = 'https://graph.facebook.com/v20.0'
const META_TOKEN = process.env.META_ADS_ACCESS_TOKEN || ''
const META_AD_ACCOUNT = process.env.META_AD_ACCOUNT_ID || '' // formato: act_XXXXXXXXXX

function metaConfigured() {
  return !!META_TOKEN && !!META_AD_ACCOUNT
}

type MetaInsight = {
  account_id: string
  account_name?: string
  spend: string
  clicks: string
  impressions: string
  ctr: string
  cpc: string
  reach?: string
  frequency?: string
  actions?: Array<{ action_type: string; value: string }>
  date_start: string
  date_stop: string
}

type MetaResponse = {
  data: MetaInsight[]
  paging?: { cursors: { before: string; after: string }; next?: string }
}

async function fetchInsights(dataInicio: string, dataFim: string): Promise<MetaInsight[]> {
  const url = `${META_GRAPH}/${META_AD_ACCOUNT}/insights?` + new URLSearchParams({
    level: 'account',
    fields: 'account_id,account_name,spend,clicks,impressions,ctr,cpc,reach,frequency,actions',
    time_range: JSON.stringify({ since: dataInicio, until: dataFim }),
    access_token: META_TOKEN,
  }).toString()

  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) throw new Error(`Meta API ${r.status}: ${await r.text()}`)
  const d = await r.json() as MetaResponse
  return d.data || []
}

export async function GET(req: NextRequest) {
  if (!metaConfigured()) {
    return NextResponse.json({
      configurado: false,
      aviso: 'Meta Ads API não configurada. Pedir ao Cardoso: META_ADS_ACCESS_TOKEN (longo prazo) + META_AD_ACCOUNT_ID (formato act_XXX).',
      docs: 'https://developers.facebook.com/docs/marketing-api/insights/',
      passos: [
        '1. Criar app no developers.facebook.com',
        '2. Solicitar permissão ads_read e ads_management',
        '3. Gerar access token de longo prazo via /oauth/access_token',
        '4. Salvar em .env.local e Vercel env',
      ],
    })
  }

  const url = new URL(req.url)
  const hoje = new Date()
  const dInicio = url.searchParams.get('since') || new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const dFim = url.searchParams.get('until') || hoje.toISOString().split('T')[0]

  try {
    const insights = await fetchInsights(dInicio, dFim)
    return NextResponse.json({
      configurado: true,
      periodo: { inicio: dInicio, fim: dFim },
      total: insights.length,
      insights,
    })
  } catch (error) {
    return NextResponse.json({
      configurado: true,
      erro: error instanceof Error ? error.message : String(error),
    }, { status: 200 })
  }
}

// POST: sincronizar insights do mês atual nas tabelas trafego_metricas
export async function POST(req: NextRequest) {
  if (!metaConfigured()) {
    return NextResponse.json({ ok: false, aviso: 'Meta Ads API não configurada' })
  }

  const hoje = new Date()
  const dInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0]
  const dFim = hoje.toISOString().split('T')[0]

  try {
    const insights = await fetchInsights(dInicio, dFim)
    let gravados = 0

    for (const ins of insights) {
      const leads = Number(ins.actions?.find(a => a.action_type === 'lead')?.value || 0)
      const spend = Number(ins.spend || 0)
      const clicks = Number(ins.clicks || 0)
      const impressions = Number(ins.impressions || 0)
      const cpl = leads > 0 ? spend / leads : 0

      // Tentar vincular a uma clínica pelo account_name → trafego_clinica
      const { data: vinc } = await sb
        .from('trafego_clinica')
        .select('clinica_id, gestor_id')
        .ilike('observacoes', `%${ins.account_id}%`)
        .maybeSingle()

      if (vinc) {
        await sb.from('trafego_metricas').upsert({
          clinica_id: vinc.clinica_id,
          gestor_id: vinc.gestor_id,
          data: ins.date_stop,
          leads,
          investimento: spend,
          cpl,
          cpc: Number(ins.cpc || 0),
          ctr: Number(ins.ctr || 0),
          impressoes: impressions,
          cliques: clicks,
          alcance: Number(ins.reach || 0),
          frequencia: Number(ins.frequency || 0),
        }, { onConflict: 'clinica_id,data' })
        gravados++
      }
    }

    return NextResponse.json({
      ok: true,
      insights_totais: insights.length,
      gravados_no_banco: gravados,
      periodo: `${dInicio} → ${dFim}`,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      erro: error instanceof Error ? error.message : String(error),
    })
  }
}
