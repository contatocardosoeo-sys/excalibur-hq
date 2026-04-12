import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Métricas que podem ser ajustadas + tabela/campo onde mora o valor real
const METRICAS_EDITAVEIS: Record<
  string,
  { label: string; categoria: string; tabela: string; coluna: string }
> = {
  ticket_medio: { label: 'Ticket médio (R$)', categoria: 'funil', tabela: 'empresa_config', coluna: 'ticket_medio' },
  cpl_medio: { label: 'CPL médio (R$)', categoria: 'trafego', tabela: 'empresa_config', coluna: 'cpl_medio' },
  taxa_fechamento: { label: 'Taxa de fechamento (%)', categoria: 'comercial', tabela: 'empresa_config', coluna: 'taxa_fechamento' },
  taxa_agendamento: { label: 'Taxa de agendamento (%)', categoria: 'sdr', tabela: 'empresa_config', coluna: 'taxa_agendamento' },
  taxa_comparecimento: { label: 'Taxa de comparecimento (%)', categoria: 'comercial', tabela: 'empresa_config', coluna: 'taxa_comparecimento' },
  taxa_qualificacao: { label: 'Taxa de qualificação (%)', categoria: 'sdr', tabela: 'empresa_config', coluna: 'taxa_qualificacao' },
  sdr_agendamentos_dia: { label: 'Meta agendamentos/dia (SDR)', categoria: 'sdr', tabela: 'empresa_config', coluna: 'sdr_agendamentos_dia' },
  receita_alvo: { label: 'Receita alvo (R$)', categoria: 'funil', tabela: 'empresa_config', coluna: 'receita_alvo' },
  receita_super: { label: 'Supermeta receita (R$)', categoria: 'funil', tabela: 'empresa_config', coluna: 'receita_super' },
  nivel_meta: { label: 'Nível de meta ativo', categoria: 'funil', tabela: 'empresa_config', coluna: 'nivel_meta' },
  cpl_max: { label: 'CPL máximo (R$)', categoria: 'trafego', tabela: 'empresa_config', coluna: 'cpl_max' },
  closer_pct_venda: { label: 'Comissão closer (%)', categoria: 'comercial', tabela: 'config_comissoes', coluna: 'closer_pct_venda' },
  sdr_valor_agendamento: { label: 'Comissão SDR por agendamento (R$)', categoria: 'sdr', tabela: 'config_comissoes', coluna: 'sdr_valor_agendamento' },
}

// GET — listar propostas (filtros: status, categoria, autor)
export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const status = url.searchParams.get('status')
  const categoria = url.searchParams.get('categoria')
  const pendentes = url.searchParams.get('pendentes') === 'true'

  let q = sb.from('propostas_ajuste').select('*').order('created_at', { ascending: false })
  if (pendentes) q = q.in('status', ['pendente', 'debater'])
  else if (status) q = q.eq('status', status)
  if (categoria) q = q.eq('categoria', categoria)

  const { data, error } = await q.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = data || []
  const countPendentes = items.filter(i => i.status === 'pendente' || i.status === 'debater').length

  return NextResponse.json({
    propostas: items,
    total: items.length,
    pendentes: countPendentes,
    metricas_editaveis: METRICAS_EDITAVEIS,
  })
}

// POST — criar nova proposta (Guilherme/CMO propõe)
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { campo, valor_proposto, justificativa, autor_email, autor_nome, autor_role } = body

  if (!campo || valor_proposto === undefined || !justificativa || !autor_email) {
    return NextResponse.json({ error: 'campo, valor_proposto, justificativa, autor_email obrigatórios' }, { status: 400 })
  }

  const meta = METRICAS_EDITAVEIS[campo]
  if (!meta) {
    return NextResponse.json({ error: `campo "${campo}" não é editável` }, { status: 400 })
  }

  // Buscar valor atual da tabela correspondente
  let valorAtual = '?'
  try {
    const { data } = await sb
      .from(meta.tabela)
      .select(meta.coluna)
      .limit(1)
      .single()
    if (data) valorAtual = String((data as unknown as Record<string, unknown>)[meta.coluna])
  } catch {
    /* */
  }

  const { data, error } = await sb
    .from('propostas_ajuste')
    .insert({
      autor_email,
      autor_nome: autor_nome || autor_email.split('@')[0],
      autor_role: autor_role || 'cmo',
      categoria: meta.categoria,
      campo,
      campo_label: meta.label,
      valor_atual: valorAtual,
      valor_proposto: String(valor_proposto),
      justificativa,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, proposta: data })
}

// PATCH — CEO decide (aprovar/rejeitar/debater)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { id, status, motivo_decisao, decidido_por } = body

  if (!id || !status) {
    return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })
  }

  if (!['aprovado', 'rejeitado', 'debater'].includes(status)) {
    return NextResponse.json({ error: 'status deve ser aprovado, rejeitado ou debater' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {
    status,
    decidido_por: decidido_por || 'ceo',
    decidido_em: new Date().toISOString(),
    motivo_decisao: motivo_decisao || null,
    visto_pelo_ceo: true,
  }

  // Se aprovado: aplicar o valor automaticamente na tabela correspondente
  if (status === 'aprovado') {
    const { data: proposta } = await sb
      .from('propostas_ajuste')
      .select('campo, valor_proposto')
      .eq('id', id)
      .single()

    if (proposta) {
      const meta = METRICAS_EDITAVEIS[proposta.campo]
      if (meta) {
        let valorParaAplicar: unknown = proposta.valor_proposto
        // Converter pra numérico se não for texto puro
        if (['nivel_meta'].includes(proposta.campo)) {
          valorParaAplicar = proposta.valor_proposto
        } else {
          valorParaAplicar = Number(proposta.valor_proposto)
        }

        const { error: applyErr } = await sb
          .from(meta.tabela)
          .update({
            [meta.coluna]: valorParaAplicar,
            atualizado_em: new Date().toISOString(),
            atualizado_por: decidido_por || 'ceo',
          })
          .not('id', 'is', null)

        if (!applyErr) {
          updates.aplicado = true
          updates.aplicado_em = new Date().toISOString()
        }
      }
    }
  }

  const { data, error } = await sb
    .from('propostas_ajuste')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, proposta: data })
}
