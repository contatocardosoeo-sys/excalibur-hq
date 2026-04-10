import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Campos editaveis via PATCH (whitelist — evita sobrescrever id/created_at/scores calculados)
const CAMPOS_EDITAVEIS = new Set([
  'nome', 'cnpj', 'email', 'telefone', 'whatsapp', 'instagram', 'responsavel',
  'cidade', 'estado', 'especialidade', 'segmento',
  'plano', 'valor_contrato', 'data_inicio', 'ativo', 'status', 'status_cliente', 'aviso_previo_inicio',
  'cs_responsavel', 'fase', 'subfase', 'status_execucao',
  'num_salas', 'num_crc', 'num_recepcao', 'num_avaliador', 'num_orcamentista', 'profissional_multipapel',
  'faturamento_medio', 'investimento_trafego', 'mrr', 'ticket_medio', 'ticket', 'roi',
  'meta_faturamento', 'meta_leads',
  'adocao_crm', 'adocao_responde_leads', 'adocao_assiste_aulas', 'adocao_planilha', 'adocao_script', 'adocao_reunioes',
  'notas_cs', 'problema_detectado', 'proxima_acao', 'foco',
  'crm_ativo', 'campanha_ativa',
])

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  const [{ data: clinica, error }, { data: jornada }, { data: adocao }, { data: alertas }] = await Promise.all([
    supabase.from('clinicas').select('*').eq('id', id).single(),
    supabase.from('jornada_clinica').select('*').eq('clinica_id', id).maybeSingle(),
    supabase.from('adocao_clinica').select('score, classificacao, semana').eq('clinica_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('alertas_clinica').select('id, tipo, nivel, titulo, descricao, resolvido, created_at').eq('clinica_id', id).eq('resolvido', false),
  ])

  if (error || !clinica) {
    return NextResponse.json({ error: error?.message || 'Cliente nao encontrado' }, { status: 404 })
  }

  // Dias restantes de aviso previo (30 dias a partir de aviso_previo_inicio)
  let aviso_previo_dias_restantes: number | null = null
  if (clinica.aviso_previo_inicio) {
    const inicio = new Date(clinica.aviso_previo_inicio + 'T12:00:00')
    const fim = new Date(inicio)
    fim.setDate(fim.getDate() + 30)
    const diff = Math.ceil((fim.getTime() - Date.now()) / 86400000)
    aviso_previo_dias_restantes = diff
  }

  return NextResponse.json({
    clinica,
    jornada,
    adocao,
    alertas: alertas || [],
    aviso_previo_dias_restantes,
  })
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await req.json()

  const update: Record<string, unknown> = {}
  for (const k of Object.keys(body)) {
    if (CAMPOS_EDITAVEIS.has(k)) {
      update[k] = body[k]
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo editavel enviado' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('clinicas')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ clinica: data })
}

export async function DELETE(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params

  // Cascata manual — deletar registros filhos antes da clinica
  const tabelasFilhas = [
    'tarefas_jornada',
    'jornada_clinica',
    'alertas_clinica',
    'adocao_clinica',
    'funil_diario',
    'log_atividades_cs',
  ]

  for (const tabela of tabelasFilhas) {
    const { error } = await supabase.from(tabela).delete().eq('clinica_id', id)
    if (error && !error.message.toLowerCase().includes('does not exist')) {
      return NextResponse.json({ error: `Erro ao deletar ${tabela}: ${error.message}` }, { status: 500 })
    }
  }

  const { error: errClinica } = await supabase.from('clinicas').delete().eq('id', id)
  if (errClinica) {
    return NextResponse.json({ error: errClinica.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
