import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

type Alerta = {
  id: string
  cliente_id: string
  cliente_nome: string
  tipo: string
  prioridade: 'critica' | 'alta' | 'media' | 'baixa'
  descricao: string
  acao_sugerida: string
  status: string
  responsavel: string
  created_at: string
}

type ClinicaMin = {
  id: string
  nome: string
  aviso_previo_inicio: string | null
  score_total: number | null
  dias_sem_venda: number | null
  sla_estourado: boolean | null
  cs_responsavel: string | null
  created_at: string | null
  ativo: boolean | null
  data_inicio: string | null
}

// Thresholds de caixa crítico
const CAIXA_CRITICO_ALTO = 20000 // amarelo — caixa baixo
const CAIXA_CRITICO = 10000      // vermelho — caixa crítico
const CAIXA_NEGATIVO = 0         // vermelho profundo — no vermelho

function nivelToPrioridade(nivel: number | null): 'critica' | 'alta' | 'media' | 'baixa' {
  const n = nivel ?? 5
  if (n <= 2) return 'critica'
  if (n <= 4) return 'alta'
  if (n <= 6) return 'media'
  return 'baixa'
}

function gerarAlertasDinamicos(clinicas: ClinicaMin[]): Alerta[] {
  const hoje = Date.now()
  const alertas: Alerta[] = []

  for (const c of clinicas) {
    if (c.ativo === false) continue

    // Regra 1: Aviso prévio ativo (crítico)
    if (c.aviso_previo_inicio) {
      const inicio = new Date(c.aviso_previo_inicio + 'T12:00:00')
      const fim = new Date(inicio)
      fim.setDate(fim.getDate() + 30)
      const dias = Math.ceil((fim.getTime() - hoje) / 86400000)
      alertas.push({
        id: `dyn-aviso-${c.id}`,
        cliente_id: c.id,
        cliente_nome: c.nome,
        tipo: 'aviso_previo',
        prioridade: 'critica',
        descricao: dias > 0
          ? `Cliente em aviso prévio — ${dias} dia${dias > 1 ? 's' : ''} restante${dias > 1 ? 's' : ''} para saída.`
          : 'Aviso prévio expirado. Cliente deve ser desativado ou recuperado.',
        acao_sugerida: 'Reunião imediata de recuperação com CS e COO',
        status: 'aberto',
        responsavel: c.cs_responsavel || 'CS',
        created_at: c.aviso_previo_inicio + 'T12:00:00.000Z',
      })
    }

    // Regra 2: Health score em risco
    if (c.score_total != null && c.score_total < 60) {
      alertas.push({
        id: `dyn-score-${c.id}`,
        cliente_id: c.id,
        cliente_nome: c.nome,
        tipo: 'health_score',
        prioridade: c.score_total < 40 ? 'critica' : 'alta',
        descricao: `Health score em ${c.score_total}/100. Cliente em risco de churn.`,
        acao_sugerida: 'Revisar plano de ação D0-D30 e agendar 1:1 com clínica',
        status: 'aberto',
        responsavel: c.cs_responsavel || 'CS',
        created_at: c.created_at || new Date().toISOString(),
      })
    }

    // Regra 3: Sem vendas há muito tempo
    if (c.dias_sem_venda != null && c.dias_sem_venda > 15) {
      alertas.push({
        id: `dyn-vendas-${c.id}`,
        cliente_id: c.id,
        cliente_nome: c.nome,
        tipo: 'sem_vendas',
        prioridade: c.dias_sem_venda > 30 ? 'alta' : 'media',
        descricao: `Sem vendas há ${c.dias_sem_venda} dias.`,
        acao_sugerida: 'Investigar funil de vendas e qualidade dos leads',
        status: 'aberto',
        responsavel: c.cs_responsavel || 'CS',
        created_at: c.created_at || new Date().toISOString(),
      })
    }

    // Regra 4: SLA estourado
    if (c.sla_estourado) {
      alertas.push({
        id: `dyn-sla-${c.id}`,
        cliente_id: c.id,
        cliente_nome: c.nome,
        tipo: 'sla',
        prioridade: 'alta',
        descricao: 'SLA de atendimento estourado.',
        acao_sugerida: 'Cumprir tarefas atrasadas da jornada D0-D30',
        status: 'aberto',
        responsavel: c.cs_responsavel || 'CS',
        created_at: c.created_at || new Date().toISOString(),
      })
    }
  }

  return alertas
}

// Gera alerta de caixa quando saldo do mes abaixo de threshold
function gerarAlertaCaixa(caixa: number, recebido: number, totalReceber: number): Alerta | null {
  if (caixa >= CAIXA_CRITICO_ALTO) return null

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
  let prioridade: Alerta['prioridade']
  let descricao: string
  let acao: string

  if (caixa < CAIXA_NEGATIVO) {
    prioridade = 'critica'
    descricao = `Caixa no vermelho (${fmt(caixa)}). Despesas superaram receitas do mês.`
    acao = 'Cortar despesas variáveis imediatamente e acelerar cobrança de inadimplentes'
  } else if (caixa < CAIXA_CRITICO) {
    prioridade = 'critica'
    descricao = `Caixa crítico: apenas ${fmt(caixa)} disponível. Recebido ${fmt(recebido)} de ${fmt(totalReceber)} previstos.`
    acao = 'Priorizar cobrança de recebíveis pendentes e revisar gastos do mês'
  } else {
    prioridade = 'alta'
    descricao = `Caixa baixo: ${fmt(caixa)} disponível. Monitorar fluxo de recebimento.`
    acao = 'Acompanhar recebimentos pendentes e evitar despesas não essenciais'
  }

  return {
    id: 'dyn-caixa-mes',
    cliente_id: '',
    cliente_nome: 'Caixa da empresa',
    tipo: 'caixa_critico',
    prioridade,
    descricao,
    acao_sugerida: acao,
    status: 'aberto',
    responsavel: 'Financeiro',
    created_at: new Date().toISOString(),
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const prioridadeFilter = searchParams.get('prioridade')
    const statusFilter = searchParams.get('status')
    const tipoFilter = searchParams.get('tipo')

    // Range do mes atual pra calculo de caixa
    const now = new Date()
    const mesAtual = now.getMonth() + 1
    const anoAtual = now.getFullYear()
    const inicioMes = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-01`
    const fimMes = mesAtual === 12 ? `${anoAtual + 1}-01-01` : `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`

    const [
      { data: clinicas },
      { data: alertasManuais },
      { data: receber },
      { data: pagar },
    ] = await Promise.all([
      supabase.from('clinicas').select('id, nome, aviso_previo_inicio, score_total, dias_sem_venda, sla_estourado, cs_responsavel, created_at, ativo, data_inicio'),
      supabase.from('alertas_clinica').select('id, clinica_id, tipo, nivel, titulo, descricao, resolvido, created_at').eq('resolvido', false),
      supabase.from('financeiro_receber').select('valor, status').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
      supabase.from('financeiro_pagar').select('valor, status').gte('data_vencimento', inicioMes).lt('data_vencimento', fimMes),
    ])

    const cls = (clinicas as ClinicaMin[]) || []
    const nomeMap = new Map(cls.map(c => [c.id, c.nome]))

    // Calculo de caixa do mes (recebido - pago)
    const r = receber || []
    const p = pagar || []
    const totalReceber = r.reduce((s, i) => s + Number(i.valor), 0)
    const recebido = r.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
    const pago = p.filter(i => i.status === 'pago').reduce((s, i) => s + Number(i.valor), 0)
    const caixa = recebido - pago

    // Manual (persistidos)
    const manuais: Alerta[] = (alertasManuais || []).map(a => ({
      id: a.id,
      cliente_id: a.clinica_id,
      cliente_nome: nomeMap.get(a.clinica_id) || 'Clinica sem nome',
      tipo: a.tipo || 'geral',
      prioridade: nivelToPrioridade(a.nivel),
      descricao: a.descricao || a.titulo || '',
      acao_sugerida: a.titulo || 'Verificar cliente',
      status: 'aberto',
      responsavel: '',
      created_at: a.created_at,
    }))

    // Dinâmicos (calculados em cada request)
    const dinamicos = gerarAlertasDinamicos(cls)

    // Alerta de caixa (global, nao atrelado a clinica)
    const alertaCaixa = gerarAlertaCaixa(caixa, recebido, totalReceber)

    const todos = [...manuais, ...dinamicos, ...(alertaCaixa ? [alertaCaixa] : [])]

    const filtered = todos
      .filter(a => !prioridadeFilter || a.prioridade === prioridadeFilter)
      .filter(a => !statusFilter || a.status === statusFilter)
      .filter(a => !tipoFilter || a.tipo === tipoFilter)
      .sort((a, b) => {
        const ordem: Record<string, number> = { critica: 0, alta: 1, media: 2, baixa: 3 }
        return (ordem[a.prioridade] ?? 9) - (ordem[b.prioridade] ?? 9)
      })

    return NextResponse.json({ alertas: filtered, total: filtered.length })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'id e status sao obrigatorios' }, { status: 400 })
    }

    // Alertas dinâmicos (prefixo 'dyn-') não podem ser mutados — são calculados
    if (id.startsWith('dyn-')) {
      return NextResponse.json({ error: 'Alertas dinâmicos não podem ser alterados. Resolva o problema na clínica (ex: cancelar aviso prévio, melhorar score).' }, { status: 400 })
    }

    const resolvido = status === 'resolvido'
    const updateData: Record<string, unknown> = { resolvido }
    if (resolvido) updateData.resolvido_em = new Date().toISOString()

    const { data, error } = await supabase
      .from('alertas_clinica')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ alerta: data })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
