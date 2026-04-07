import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface ClienteRow {
  id: string
  nome: string
  fase: string
  subfase: string
  score_total: number
  dias_na_etapa: number
  sla_estourado: boolean
  cs_responsavel: string
  ultimo_contato: string
  crm_ativo: boolean
  dias_sem_venda: number
  campanha_ativa: boolean
  leads_semana: number
  usa_script: boolean
  preenche_planilha: boolean
}

function detectarProblema(cliente: ClienteRow) {
  const horas = (Date.now() - new Date(cliente.ultimo_contato).getTime()) / 3600000
  if (horas > 72) return { texto: `Sem contato ha ${Math.floor(horas / 24)} dias`, nivel: 'critica' as const }
  if (horas > 48) return { texto: 'Sem contato +48h', nivel: 'critica' as const }
  if (cliente.sla_estourado) return { texto: `SLA estourado — D${cliente.dias_na_etapa}`, nivel: 'critica' as const }
  if (!cliente.crm_ativo) return { texto: 'CRM nao implementado', nivel: 'alta' as const }
  if ((cliente.dias_sem_venda ?? 0) > 7) return { texto: `Sem venda ha ${cliente.dias_sem_venda} dias`, nivel: 'alta' as const }
  if (cliente.campanha_ativa && (cliente.leads_semana ?? 0) === 0) return { texto: 'Campanha ativa sem lead', nivel: 'alta' as const }
  if ((cliente.score_total ?? 0) >= 80) return { texto: 'Saudavel — oportunidade de upsell', nivel: 'ok' as const }
  return { texto: 'Monitorar evolucao', nivel: 'media' as const }
}

function gerarProximaAcao(cliente: ClienteRow): string {
  if (!cliente.crm_ativo) return 'Ativar CRM hoje'
  if (cliente.sla_estourado) return 'Call urgente — SLA estourado'
  if ((cliente.dias_sem_venda ?? 0) > 7) return 'Revisar script comercial'
  if (cliente.campanha_ativa && (cliente.leads_semana ?? 0) === 0) return 'Revisar criativos urgente'
  if (!cliente.usa_script) return 'Implementar script de vendas'
  if (!cliente.preenche_planilha) return 'Ativar rotina de planilha'
  if ((cliente.score_total ?? 0) >= 80) return 'Propor upsell ou expansao'
  return 'Agendar reuniao de alinhamento'
}

export async function GET() {
  try {
    const { data: clientes, error } = await supabase
      .from('clientes_hq')
      .select('*')
      .order('score_total', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const pipeline: Record<string, Array<ClienteRow & { problema: ReturnType<typeof detectarProblema>; proxima_acao: string }>> = {
      onboarding: [],
      adocao: [],
      escala: [],
    }

    for (const cliente of (clientes || []) as ClienteRow[]) {
      const problema = detectarProblema(cliente)
      const proxima_acao = gerarProximaAcao(cliente)
      const fase = cliente.fase || 'onboarding'
      if (!pipeline[fase]) pipeline[fase] = []
      pipeline[fase].push({ ...cliente, problema, proxima_acao })
    }

    return NextResponse.json({ pipeline })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
