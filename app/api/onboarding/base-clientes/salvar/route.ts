import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    clienteId, preenchidoPor, preenchidoPorNome,
    data_inicio_real, etapa_atual, plano, valor_contrato,
    cidade, estado, whatsapp_responsavel, nome_responsavel,
    foco_principal, score_inicial,
    situacao_atual, maior_desafio, proxima_acao,
    ultimo_contato, canal_preferido,
  } = body

  if (!clienteId) return NextResponse.json({ error: 'clienteId obrigatório' }, { status: 400 })

  // Atualizar clinica
  const updates: Record<string, unknown> = {}
  if (cidade) updates.cidade = cidade
  if (estado) updates.estado = estado
  if (whatsapp_responsavel) updates.whatsapp = whatsapp_responsavel
  if (nome_responsavel) updates.responsavel = nome_responsavel
  if (foco_principal) updates.foco = foco_principal
  if (score_inicial !== undefined) updates.score_total = score_inicial
  if (etapa_atual) updates.fase = etapa_atual
  if (data_inicio_real) updates.data_inicio = data_inicio_real
  if (plano) updates.plano = plano
  if (valor_contrato) updates.valor_contrato = valor_contrato
  if (ultimo_contato) updates.ultimo_contato = ultimo_contato

  if (Object.keys(updates).length > 0) {
    await sb.from('clinicas').update(updates).eq('id', clienteId)
  }

  // Nota de onboarding
  if (situacao_atual || proxima_acao) {
    const nota = `[ONBOARDING ${new Date().toLocaleDateString('pt-BR')}]\nSituação: ${situacao_atual || '-'}\n${maior_desafio ? `Desafio: ${maior_desafio}\n` : ''}Próxima ação: ${proxima_acao || '-'}\nCanal: ${canal_preferido || '-'}`
    const { data: atual } = await sb.from('clinicas').select('notas_cs').eq('id', clienteId).single()
    await sb.from('clinicas').update({
      notas_cs: nota + (atual?.notas_cs ? '\n\n' + atual.notas_cs : ''),
    }).eq('id', clienteId)
  }

  // Marcar base_atualizacao como concluído
  await sb.from('base_atualizacao').upsert({
    cliente_id: clienteId,
    status: 'concluido',
    preenchido_por: preenchidoPor || null,
    preenchido_por_nome: preenchidoPorNome || null,
    preenchido_em: new Date().toISOString(),
    campos_atualizados: Object.keys(updates),
    score_inicial_definido: score_inicial !== undefined,
    observacao_onboarding: `${situacao_atual || ''} | ${proxima_acao || ''}`.trim(),
  }, { onConflict: 'cliente_id' })

  return NextResponse.json({ ok: true })
}
