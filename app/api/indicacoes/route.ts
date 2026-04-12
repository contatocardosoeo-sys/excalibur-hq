import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ═══════════════════════════════════════════════════════════
// GATILHOS INTELIGENTES — detecta "momento ideal" pra pedir indicação
// ═══════════════════════════════════════════════════════════

type ClienteParaIndicacao = {
  id: string
  nome: string
  score_total: number | null
  data_inicio: string | null
  ultimo_contato: string | null
  fase: string | null
  aviso_previo_inicio: string | null
  sla_estourado: boolean | null
  dias_uteis: number
  momento_ideal: boolean
  motivo: string
}

function calcularDiasUteis(dataInicio: string | null): number {
  if (!dataInicio) return 0
  const inicio = new Date(dataInicio)
  const hoje = new Date()
  let count = 0
  const cur = new Date(inicio)
  while (cur <= hoje) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Janelas de ouro na jornada
const JANELAS_INDICACAO = [
  { min: 5, max: 10, label: 'D7 — Primeiro resultado', peso: 3 },
  { min: 25, max: 35, label: 'D30 — Primeiro mês completo', peso: 5 },
  { min: 55, max: 65, label: 'D60 — Power user', peso: 4 },
  { min: 85, max: 95, label: 'D90 — Sênior / Case', peso: 3 },
]

// GET — lista indicações do mês + clientes em momento ideal + metas
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || 'brunomedina.contato@gmail.com'
  const mesParam = Number(req.nextUrl.searchParams.get('mes')) || new Date().getMonth() + 1
  const anoParam = Number(req.nextUrl.searchParams.get('ano')) || new Date().getFullYear()

  // 1. Config
  const { data: cfg } = await sb.from('config_indicacoes').select('*').eq('id', 1).single()
  const config = cfg || {
    valor_solicitacao: 50, valor_conversao: 100, valor_retencao: 200,
    bonus_meta_qtd: 5, bonus_meta_valor: 300,
    meta_solicitacoes_mes: 5, meta_conversoes_mes: 2,
    score_minimo_pedir: 70, dias_entre_pedidos: 30,
  }

  // 2. Indicações do mês
  const { data: indicacoes } = await sb
    .from('indicacoes')
    .select('*')
    .eq('cs_email', email)
    .eq('mes', mesParam)
    .eq('ano', anoParam)
    .order('created_at', { ascending: false })

  const items = indicacoes || []
  const solicitadas = items.length
  const recebidas = items.filter(i => i.status !== 'solicitada').length
  const convertidas = items.filter(i => ['fechou', 'reteve_3m'].includes(i.status)).length
  const comissaoTotal = items.reduce((s, i) => s + Number(i.comissao_total || 0), 0)
  const batiMeta = solicitadas >= Number(config.meta_solicitacoes_mes)

  // 3. Clientes em momento ideal pra indicação
  const { data: clinicas } = await sb
    .from('clinicas')
    .select('id, nome, score_total, data_inicio, ultimo_contato, fase, aviso_previo_inicio, sla_estourado')
    .eq('ativo', true)

  // Últimas indicações pedidas (pra respeitar cooldown)
  const { data: ultimasPedidas } = await sb
    .from('indicacoes')
    .select('cliente_id, ts_solicitada')
    .eq('cs_email', email)
    .order('ts_solicitada', { ascending: false })

  const ultimoPedidoPorCliente = new Map(
    (ultimasPedidas || []).map(i => [i.cliente_id, new Date(i.ts_solicitada).getTime()]),
  )
  const agora = Date.now()
  const cooldownMs = Number(config.dias_entre_pedidos) * 86400000

  const clientesAnalisados: ClienteParaIndicacao[] = (clinicas || []).map(c => {
    const diasUteis = calcularDiasUteis(c.data_inicio)
    const score = Number(c.score_total || 0)
    const ultimoContato = c.ultimo_contato ? new Date(c.ultimo_contato).getTime() : 0
    const contatoRecente = agora - ultimoContato < 3 * 86400000

    // Checks
    const scoreOk = score >= Number(config.score_minimo_pedir)
    const semAviso = !c.aviso_previo_inicio
    const semSLA = !c.sla_estourado
    const ultimoPedido = ultimoPedidoPorCliente.get(c.id) || 0
    const cooldownOk = agora - ultimoPedido > cooldownMs

    // Está na janela de ouro?
    const janela = JANELAS_INDICACAO.find(j => diasUteis >= j.min && diasUteis <= j.max)

    const momento_ideal = !!(janela && scoreOk && semAviso && semSLA && cooldownOk && contatoRecente)

    let motivo = ''
    if (momento_ideal) {
      motivo = `${janela!.label} · Score ${score} · Contato recente`
    } else if (janela && !scoreOk) {
      motivo = `Janela certa mas score baixo (${score} < ${config.score_minimo_pedir})`
    } else if (!cooldownOk) {
      motivo = `Indicação pedida recentemente — aguardar cooldown`
    }

    return {
      id: c.id,
      nome: c.nome,
      score_total: score,
      data_inicio: c.data_inicio,
      ultimo_contato: c.ultimo_contato,
      fase: c.fase,
      aviso_previo_inicio: c.aviso_previo_inicio,
      sla_estourado: c.sla_estourado,
      dias_uteis: diasUteis,
      momento_ideal,
      motivo,
    }
  })

  const momentoIdeal = clientesAnalisados.filter(c => c.momento_ideal).sort((a, b) => (b.score_total || 0) - (a.score_total || 0))

  return NextResponse.json({
    mes: mesParam,
    ano: anoParam,
    indicacoes: items,
    resumo: {
      solicitadas,
      recebidas,
      convertidas,
      comissao_total: comissaoTotal,
      meta_solicitacoes: Number(config.meta_solicitacoes_mes),
      meta_conversoes: Number(config.meta_conversoes_mes),
      bateu_meta: batiMeta,
      bonus_meta: batiMeta ? Number(config.bonus_meta_valor) : 0,
    },
    momento_ideal: momentoIdeal,
    total_clientes_ideal: momentoIdeal.length,
    config,
  })
}

// POST — registrar nova solicitação de indicação
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { cs_email, cs_nome, cliente_id, cliente_nome, indicado_nome, indicado_telefone, indicado_clinica, indicado_cidade } = body

  if (!cs_email || !cliente_nome) {
    return NextResponse.json({ error: 'cs_email e cliente_nome obrigatórios' }, { status: 400 })
  }

  const { data: cfg } = await sb.from('config_indicacoes').select('*').eq('id', 1).single()
  const valorSolicitacao = Number(cfg?.valor_solicitacao || 50)

  // Buscar score e etapa do cliente
  let clienteScore = 0
  let clienteEtapa = ''
  if (cliente_id) {
    const { data: cl } = await sb.from('clinicas').select('score_total, fase, data_inicio').eq('id', cliente_id).single()
    if (cl) {
      clienteScore = Number(cl.score_total || 0)
      const du = calcularDiasUteis(cl.data_inicio)
      clienteEtapa = du >= 90 ? 'D90' : du >= 60 ? 'D60' : du >= 30 ? 'D30' : du >= 7 ? 'D7' : 'D0'
    }
  }

  const agora = new Date()
  const mes = agora.getMonth() + 1
  const ano = agora.getFullYear()

  // Status depende se já recebeu o nome do indicado
  const status = indicado_nome ? 'recebida' : 'solicitada'

  const { data, error } = await sb.from('indicacoes').insert({
    cs_email,
    cs_nome: cs_nome || 'CS',
    cliente_id: cliente_id || null,
    cliente_nome,
    cliente_etapa_jornada: clienteEtapa,
    cliente_score: clienteScore,
    indicado_nome: indicado_nome || null,
    indicado_telefone: indicado_telefone || null,
    indicado_clinica: indicado_clinica || null,
    indicado_cidade: indicado_cidade || null,
    status,
    ts_solicitada: agora.toISOString(),
    ts_recebida: indicado_nome ? agora.toISOString() : null,
    comissao_solicitacao: valorSolicitacao,
    comissao_total: valorSolicitacao,
    mes,
    ano,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gerar comissão pro Medina
  await sb.from('comissoes').insert({
    colaborador_email: cs_email,
    colaborador_nome: cs_nome || 'CS',
    role: 'cs',
    tipo: 'indicacao_solicitada',
    valor: valorSolicitacao,
    mes,
    ano,
    data_evento: agora.toISOString().slice(0, 10),
    lead_nome: `Indicação de ${cliente_nome}`,
    observacao: indicado_nome ? `Indicou: ${indicado_nome}` : 'Solicitação registrada',
  })

  return NextResponse.json({ success: true, indicacao: data })
}

// PATCH — avançar status da indicação (contatada → agendada → fechou → reteve_3m)
export async function PATCH(req: NextRequest) {
  const { id, status, indicado_nome, indicado_telefone, indicado_clinica, motivo_perda } = await req.json()
  if (!id || !status) return NextResponse.json({ error: 'id e status obrigatórios' }, { status: 400 })

  const { data: cfg } = await sb.from('config_indicacoes').select('*').eq('id', 1).single()
  const agora = new Date().toISOString()

  const updates: Record<string, unknown> = { status }
  if (indicado_nome) updates.indicado_nome = indicado_nome
  if (indicado_telefone) updates.indicado_telefone = indicado_telefone
  if (indicado_clinica) updates.indicado_clinica = indicado_clinica

  const tsMap: Record<string, string> = {
    recebida: 'ts_recebida', contatada: 'ts_contatada', agendada: 'ts_agendada',
    fechou: 'ts_fechou', reteve_3m: 'ts_reteve', perdida: 'ts_perdida',
  }
  if (tsMap[status]) updates[tsMap[status]] = agora
  if (status === 'perdida' && motivo_perda) updates.motivo_perda = motivo_perda

  // Comissão de conversão
  if (status === 'fechou') {
    updates.comissao_conversao = Number(cfg?.valor_conversao || 100)
  }
  if (status === 'reteve_3m') {
    updates.comissao_retencao = Number(cfg?.valor_retencao || 200)
  }

  // Recalcular total
  const { data: atual } = await sb.from('indicacoes').select('comissao_solicitacao, comissao_conversao, comissao_retencao').eq('id', id).single()
  if (atual) {
    const sol = Number(atual.comissao_solicitacao || 0)
    const conv = status === 'fechou' ? Number(cfg?.valor_conversao || 100) : Number(atual.comissao_conversao || 0)
    const ret = status === 'reteve_3m' ? Number(cfg?.valor_retencao || 200) : Number(atual.comissao_retencao || 0)
    updates.comissao_total = sol + conv + ret
  }

  const { data, error } = await sb.from('indicacoes').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Gerar comissão se conversão ou retenção
  if (status === 'fechou' || status === 'reteve_3m') {
    const tipo = status === 'fechou' ? 'indicacao_conversao' : 'indicacao_retencao'
    const valor = status === 'fechou' ? Number(cfg?.valor_conversao || 100) : Number(cfg?.valor_retencao || 200)
    await sb.from('comissoes').insert({
      colaborador_email: data.cs_email,
      colaborador_nome: data.cs_nome,
      role: 'cs',
      tipo,
      valor,
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      data_evento: agora.slice(0, 10),
      lead_nome: `Indicação: ${data.indicado_nome || data.cliente_nome}`,
      observacao: `De: ${data.cliente_nome}`,
    })
  }

  return NextResponse.json({ success: true, indicacao: data })
}
