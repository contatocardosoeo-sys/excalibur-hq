import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function GET() {
  const { data: clientes } = await sb
    .from('clinicas')
    .select('id, nome, cidade, estado, whatsapp, telefone, data_inicio, plano, valor_contrato, responsavel, cs_responsavel, score_total, fase, foco, cnpj, especialidade')
    .eq('ativo', true)
    .order('nome')

  const { data: atualizacoes } = await sb
    .from('base_atualizacao')
    .select('cliente_id, status, preenchido_por, preenchido_por_nome, preenchido_em')

  const mapaAtual: Record<string, { status: string; preenchido_por: string | null; preenchido_por_nome: string | null; preenchido_em: string | null }> = {}
  for (const a of atualizacoes || []) mapaAtual[a.cliente_id] = a

  const formatados = (clientes || []).map(c => ({
    ...c,
    status: mapaAtual[c.id]?.status || 'pendente',
    preenchido_por: mapaAtual[c.id]?.preenchido_por || null,
    preenchido_por_nome: mapaAtual[c.id]?.preenchido_por_nome || null,
    preenchido_em_data: mapaAtual[c.id]?.preenchido_em
      ? new Date(mapaAtual[c.id].preenchido_em!).toLocaleDateString('pt-BR')
      : null,
  }))

  const concluidos = formatados.filter(c => c.status === 'concluido').length
  const total = formatados.length

  await sb.from('base_atualizacao_progresso')
    .update({ concluidos, total, liberado: concluidos >= total && total > 0 })
    .eq('id', 1)

  return NextResponse.json({
    clientes: formatados,
    progresso: {
      total,
      concluidos,
      pendentes: total - concluidos,
      percentual: total > 0 ? Math.round((concluidos / total) * 100) : 0,
      liberado: concluidos >= total && total > 0,
    },
  })
}
