import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Integração Meta Ads → tráfego interno da Excalibur (Guilherme/SDR)
// Puxa insights da conta interna e popula:
// - campanhas_trafego (uma linha por campanha ativa)
// - funil_trafego (agregado mensal)

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const META_GRAPH = 'https://graph.facebook.com/v20.0'
const META_TOKEN = (process.env.META_ADS_ACCESS_TOKEN || '').trim()
const META_AD_ACCOUNT = (process.env.META_AD_ACCOUNT_ID || '').trim() // act_XXXXXXXXXX

type MetaCampanha = { id: string; name: string; status: string; objective?: string; created_time?: string }
type MetaInsight = {
  campaign_id?: string
  account_id?: string
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
type MetaListResp<T> = { data: T[]; paging?: { cursors?: { before: string; after: string }; next?: string } }

function metaConfigured() {
  return !!META_TOKEN && !!META_AD_ACCOUNT
}

async function metaGet<T>(path: string): Promise<T> {
  const sep = path.includes('?') ? '&' : '?'
  const url = `${META_GRAPH}/${path}${sep}access_token=${META_TOKEN}`
  const r = await fetch(url, { cache: 'no-store' })
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    throw new Error(`Meta ${path}: ${r.status} ${txt.slice(0, 300)}`)
  }
  return r.json() as Promise<T>
}

function leadsFromActions(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0
  const leadTypes = ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead']
  return actions
    .filter(a => leadTypes.includes(a.action_type))
    .reduce((s, a) => s + Number(a.value || 0), 0)
}

// GET — status da integração + preview dos últimos insights
export async function GET(req: NextRequest) {
  if (!metaConfigured()) {
    return NextResponse.json({
      configurado: false,
      aviso: 'Meta Ads API não configurada.',
      precisa: [
        'META_ADS_ACCESS_TOKEN (long-lived token da conta Excalibur)',
        'META_AD_ACCOUNT_ID (ex: act_123456789 — conta da Excalibur no gerenciador)',
      ],
      docs: 'https://developers.facebook.com/docs/marketing-api/insights/',
      passos: [
        '1. Acesse developers.facebook.com → Create App (Business)',
        '2. Adicione o produto "Marketing API"',
        '3. Solicite as permissões ads_read + ads_management',
        '4. Use o Graph Explorer ou /oauth/access_token pra gerar long-lived token',
        '5. Peça ao Cardoso os 2 valores e adicione no Vercel env + .env.local',
      ],
    })
  }

  const url = new URL(req.url)
  const since = url.searchParams.get('since') || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  const until = url.searchParams.get('until') || new Date().toISOString().split('T')[0]

  try {
    // Account-level insights
    const accountInsights = await metaGet<MetaListResp<MetaInsight>>(
      `${META_AD_ACCOUNT}/insights?level=account&fields=spend,clicks,impressions,ctr,cpc,reach,frequency,actions&time_range={"since":"${since}","until":"${until}"}`
    )
    const ins = accountInsights.data?.[0]

    // Campanhas ativas
    const campanhas = await metaGet<MetaListResp<MetaCampanha>>(
      `${META_AD_ACCOUNT}/campaigns?fields=id,name,status,objective&limit=50`
    )

    return NextResponse.json({
      configurado: true,
      conta: META_AD_ACCOUNT,
      periodo: { since, until },
      resumo_conta: ins ? {
        investimento: Number(ins.spend || 0),
        impressoes: Number(ins.impressions || 0),
        cliques: Number(ins.clicks || 0),
        ctr: Number(ins.ctr || 0),
        cpc: Number(ins.cpc || 0),
        alcance: Number(ins.reach || 0),
        frequencia: Number(ins.frequency || 0),
        leads: leadsFromActions(ins.actions),
      } : null,
      campanhas: (campanhas.data || []).map(c => ({
        id: c.id,
        nome: c.name,
        status: c.status,
        objective: c.objective,
      })),
    })
  } catch (error) {
    return NextResponse.json({
      configurado: true,
      erro: error instanceof Error ? error.message : String(error),
    }, { status: 200 })
  }
}

// POST — sync efetivo: popula campanhas_trafego + funil_trafego
export async function POST(req: NextRequest) {
  if (!metaConfigured()) {
    return NextResponse.json({
      ok: false,
      aviso: 'Meta Ads API não configurada. Veja GET /api/trafego/meta-sync pra instruções.',
    })
  }

  try {
    const url = new URL(req.url)
    const hoje = new Date()
    const mes = Number(url.searchParams.get('mes') || hoje.getMonth() + 1)
    const ano = Number(url.searchParams.get('ano') || hoje.getFullYear())
    const since = `${ano}-${String(mes).padStart(2, '0')}-01`
    const fimDia = new Date(ano, mes, 0).getDate()
    const until = `${ano}-${String(mes).padStart(2, '0')}-${String(fimDia).padStart(2, '0')}`

    // 1. Insights por campanha
    const campInsights = await metaGet<MetaListResp<MetaInsight>>(
      `${META_AD_ACCOUNT}/insights?level=campaign&fields=campaign_id,spend,clicks,impressions,ctr,cpc,reach,actions&time_range={"since":"${since}","until":"${until}"}&limit=100`
    )

    // 2. Detalhes das campanhas (nome, status)
    const campanhasResp = await metaGet<MetaListResp<MetaCampanha>>(
      `${META_AD_ACCOUNT}/campaigns?fields=id,name,status,objective&limit=100`
    )
    const campanhaMap = Object.fromEntries((campanhasResp.data || []).map(c => [c.id, c]))

    // 3. Upsert em campanhas_trafego
    let novas = 0
    let atualizadas = 0
    let totalInvest = 0
    let totalLeads = 0

    for (const ins of (campInsights.data || [])) {
      const campId = ins.campaign_id
      if (!campId) continue
      const meta = campanhaMap[campId]
      const spend = Number(ins.spend || 0)
      const leads = leadsFromActions(ins.actions)
      const cpl = leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0

      totalInvest += spend
      totalLeads += leads

      // Check se já existe (por nome + inicio do mes)
      const { data: existing } = await sb
        .from('campanhas_trafego')
        .select('id')
        .eq('nome', meta?.name || `Campanha ${campId}`)
        .eq('inicio', since)
        .maybeSingle()

      const row = {
        nome: meta?.name || `Campanha ${campId}`,
        canal: 'Meta Ads',
        investimento: spend,
        leads,
        cpl,
        status: meta?.status === 'ACTIVE' ? 'ativa' : 'pausada',
        inicio: since,
        fim: until,
      }

      if (existing) {
        await sb.from('campanhas_trafego').update(row).eq('id', existing.id)
        atualizadas++
      } else {
        await sb.from('campanhas_trafego').insert(row)
        novas++
      }
    }

    // 4. Atualizar/criar linha de funil_trafego do mês
    // Só atualiza investimento e leads — os campos de agendamento/reunião/fechamento
    // continuam vindo do SDR/Closer (não vêm do Meta)
    const { data: funilExistente } = await sb
      .from('funil_trafego')
      .select('id, agendamentos, reunioes_realizadas, reunioes_qualificadas, fechamentos, faturamento')
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle()

    if (funilExistente) {
      await sb.from('funil_trafego').update({
        investimento_total: totalInvest,
        leads: totalLeads,
        updated_at: new Date().toISOString(),
      }).eq('id', funilExistente.id)
    } else {
      await sb.from('funil_trafego').insert({
        mes, ano,
        investimento_total: totalInvest,
        leads: totalLeads,
        agendamentos: 0,
        reunioes_realizadas: 0,
        reunioes_qualificadas: 0,
        fechamentos: 0,
        faturamento: 0,
      })
    }

    return NextResponse.json({
      ok: true,
      periodo: { mes, ano, since, until },
      campanhas: {
        novas,
        atualizadas,
        total: novas + atualizadas,
      },
      totais: {
        investimento: totalInvest,
        leads: totalLeads,
        cpl_medio: totalLeads > 0 ? Math.round((totalInvest / totalLeads) * 100) / 100 : 0,
      },
      funil_atualizado: !!funilExistente,
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      erro: error instanceof Error ? error.message : String(error),
    }, { status: 200 })
  }
}
