import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
})

export async function rodarAgenteSupervisor() {
  const inicio = Date.now()

  // 1. COLETAR DADOS
  const [
    { data: clientes },
    { data: alertas },
    { data: eventos },
    { data: leads },
    { data: logs },
    { data: incidentes }
  ] = await Promise.all([
    supabase.from('clientes_hq')
      .select('nome, score_total, fase, status_execucao, ultimo_contato, dias_sem_venda')
      .order('score_total', { ascending: true })
      .limit(20),
    supabase.from('alertas_sistema')
      .select('tipo, prioridade, titulo, descricao, status, created_at')
      .eq('status', 'pendente')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('eventos_sistema')
      .select('event_name, created_at, status')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase.from('leads')
      .select('etapa, lead_score, procedimento, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.from('logs_sistema')
      .select('tipo, rota, acao, created_at')
      .eq('tipo', 'error')
      .order('created_at', { ascending: false })
      .limit(10),
    supabase.from('incidentes')
      .select('titulo, severidade, status, created_at')
      .in('status', ['aberto', 'investigando'])
      .limit(5),
  ])

  // 2. MONTAR CONTEXTO
  const clientesEmRisco = (clientes || []).filter((c: Record<string, unknown>) => (c.score_total as number) < 60)
  const clientesAtencao = (clientes || []).filter((c: Record<string, unknown>) => {
    const score = c.score_total as number
    return score >= 60 && score < 80
  })

  const leadsData = leads || []
  const etapasCount: Record<string, number> = {}
  leadsData.forEach((l: Record<string, unknown>) => {
    const etapa = l.etapa as string
    etapasCount[etapa] = (etapasCount[etapa] || 0) + 1
  })

  const contexto = {
    data: new Date().toLocaleDateString('pt-BR'),
    hora: new Date().toLocaleTimeString('pt-BR'),
    clientes: {
      total: clientes?.length || 0,
      em_risco: clientesEmRisco.length,
      atencao: clientesAtencao.length,
      saudaveis: (clientes || []).filter((c: Record<string, unknown>) => (c.score_total as number) >= 80).length,
      top_risco: clientesEmRisco.slice(0, 5).map((c: Record<string, unknown>) => ({
        nome: c.nome,
        score: c.score_total,
        fase: c.fase,
        dias_sem_venda: c.dias_sem_venda
      }))
    },
    alertas: {
      total: alertas?.length || 0,
      criticos: (alertas || []).filter((a: Record<string, unknown>) => a.prioridade === 'critica').length,
      lista: (alertas || []).slice(0, 5).map((a: Record<string, unknown>) => ({
        tipo: a.tipo,
        titulo: a.titulo,
        prioridade: a.prioridade
      }))
    },
    leads: {
      total: leadsData.length,
      quentes: leadsData.filter((l: Record<string, unknown>) => (l.lead_score as number) >= 70).length,
      frios: leadsData.filter((l: Record<string, unknown>) => (l.lead_score as number) < 40).length,
      por_etapa: etapasCount
    },
    eventos_recentes: (eventos || []).slice(0, 10).map((e: Record<string, unknown>) => e.event_name),
    erros_sistema: (logs || []).length,
    incidentes_abertos: (incidentes || []).map((i: Record<string, unknown>) => ({
      titulo: i.titulo,
      severidade: i.severidade
    }))
  }

  // 3. CHAMAR CLAUDE API
  const prompt = `Você é o Agente Supervisor do Excalibur OS — sistema operacional para clínicas odontológicas.

Analise os dados abaixo e gere um relatório executivo para o CEO.

REGRAS:
- Seja direto e prático, sem enrolação
- Foque no que precisa de ação AGORA
- Priorize por impacto no faturamento
- Use linguagem executiva, não técnica

Dados do sistema em ${contexto.data} às ${contexto.hora}:
${JSON.stringify(contexto, null, 2)}

Responda APENAS com JSON válido (sem markdown, sem \`\`\`):
{
  "resumo": "3-5 frases do resumo executivo do dia",
  "prioridades": [
    {"ordem": 1, "titulo": "título curto", "descricao": "o que fazer", "impacto": "critico", "area": "cs"},
    {"ordem": 2, "titulo": "título curto", "descricao": "o que fazer", "impacto": "alto", "area": "comercial"},
    {"ordem": 3, "titulo": "título curto", "descricao": "o que fazer", "impacto": "medio", "area": "operacao"}
  ],
  "alertas_criticos": [
    {"titulo": "alerta", "descricao": "detalhe", "acao": "o que fazer agora"}
  ],
  "recomendacao_ceo": "recomendação estratégica para o CEO"
}`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }]
  })

  const outputText = response.content[0].type === 'text' ? response.content[0].text : '{}'

  interface Prioridade {
    ordem: number
    titulo: string
    descricao: string
    impacto: string
    area: string
  }

  interface AlertaCritico {
    titulo: string
    descricao: string
    acao: string
  }

  interface SupervisorOutput {
    resumo: string
    prioridades: Prioridade[]
    alertas_criticos: AlertaCritico[]
    recomendacao_ceo: string
  }

  let outputParsed: SupervisorOutput = { resumo: '', prioridades: [], alertas_criticos: [], recomendacao_ceo: '' }
  try {
    const jsonMatch = outputText.match(/\{[\s\S]*\}/)
    if (jsonMatch) outputParsed = JSON.parse(jsonMatch[0])
  } catch {
    outputParsed = { resumo: outputText, prioridades: [], alertas_criticos: [], recomendacao_ceo: '' }
  }

  const duracao = Date.now() - inicio
  const tokens = response.usage.input_tokens + response.usage.output_tokens

  // 4. SALVAR SESSÃO
  const { data: sessao } = await supabase
    .from('sessoes_ia')
    .insert({
      agente: 'supervisor',
      input_context: contexto,
      output_resumo: outputParsed.resumo,
      output_prioridades: outputParsed.prioridades || [],
      output_alertas: outputParsed.alertas_criticos || [],
      tokens_usados: tokens,
      duracao_ms: duracao,
      status: 'concluido'
    })
    .select()
    .single()

  // 5. SALVAR SUGESTÕES
  if (sessao && outputParsed.prioridades?.length > 0) {
    const sugestoes = outputParsed.prioridades.map((p) => ({
      sessao_id: sessao.id,
      agente: 'supervisor',
      tipo: 'prioridade',
      titulo: p.titulo,
      descricao: p.descricao,
      impacto: p.impacto,
      area: p.area,
      acao_sugerida: p.descricao
    }))
    await supabase.from('sugestoes_ia').insert(sugestoes)
  }

  return {
    sessao_id: sessao?.id,
    resumo: outputParsed.resumo,
    prioridades: outputParsed.prioridades || [],
    alertas: outputParsed.alertas_criticos || [],
    recomendacao_ceo: outputParsed.recomendacao_ceo,
    tokens,
    duracao_ms: duracao
  }
}
