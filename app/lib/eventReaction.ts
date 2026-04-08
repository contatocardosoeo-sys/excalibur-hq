import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export interface EventPayload {
  event_name: string
  aggregate_type?: string
  aggregate_id?: string
  clinica_id?: string
  payload_json?: Record<string, unknown>
}

interface ReactionAction {
  tipo: string
  prioridade?: string
  mensagem?: string
  descricao?: string
  valor?: number
  event_name?: string
  workflow?: string
}

interface EventReaction {
  id: string
  event_name: string
  reaction_name: string
  trigger_condition: Record<string, unknown>
  actions: ReactionAction[]
  ativo: boolean
  execucoes: number
}

interface AcaoExecutada {
  acao: string
  status: string
  resultado?: string
  erro?: string
}

export async function processarEventoComReacoes(evento: EventPayload) {
  const inicio = Date.now()

  const { data: reacoes } = await supabase
    .from('event_reactions')
    .select('*')
    .eq('event_name', evento.event_name)
    .eq('ativo', true)

  if (!reacoes || reacoes.length === 0) return []

  const resultados: { reacao: string; acoes: AcaoExecutada[] }[] = []

  for (const reacao of reacoes as EventReaction[]) {
    const acoesExecutadas: AcaoExecutada[] = []

    try {
      // Verificar condição do trigger
      const condicao = reacao.trigger_condition || {}
      const scoreMaximo = condicao.score_maximo as number | undefined
      const payloadScore = (evento.payload_json as Record<string, unknown> | undefined)?.score_total as number | undefined
      if (scoreMaximo && payloadScore && payloadScore > scoreMaximo) {
        continue
      }

      // Executar cada ação da cadeia
      for (const acao of reacao.actions) {
        try {
          const resultado = await executarAcao(acao, evento)
          acoesExecutadas.push({ acao: acao.tipo, status: 'ok', resultado })
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          acoesExecutadas.push({ acao: acao.tipo, status: 'erro', erro: msg })
        }
      }

      // Log da execução
      await supabase.from('event_reaction_logs').insert({
        evento_id: (evento.payload_json as Record<string, unknown> | undefined)?.evento_id || null,
        reaction_name: reacao.reaction_name,
        event_name: evento.event_name,
        clinica_id: evento.clinica_id || null,
        payload_entrada: evento.payload_json || {},
        acoes_executadas: acoesExecutadas,
        status: acoesExecutadas.some(a => a.status === 'erro') ? 'parcial' : 'concluido',
        duracao_ms: Date.now() - inicio
      })

      // Atualizar contador da reação
      await supabase
        .from('event_reactions')
        .update({
          execucoes: (reacao.execucoes || 0) + 1,
          ultima_execucao: new Date().toISOString()
        })
        .eq('id', reacao.id)

      resultados.push({ reacao: reacao.reaction_name, acoes: acoesExecutadas })

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      await supabase.from('event_reaction_logs').insert({
        reaction_name: reacao.reaction_name,
        event_name: evento.event_name,
        clinica_id: evento.clinica_id || null,
        payload_entrada: evento.payload_json || {},
        acoes_executadas: acoesExecutadas,
        status: 'erro',
        erro_mensagem: msg,
        duracao_ms: Date.now() - inicio
      })
    }
  }

  return resultados
}

async function executarAcao(acao: ReactionAction, evento: EventPayload): Promise<string> {
  switch (acao.tipo) {

    case 'criar_alerta':
      await supabase.from('alertas_sistema').insert({
        tipo_alerta: evento.event_name,
        prioridade: acao.prioridade || 'media',
        descricao: acao.mensagem || '',
        acao_sugerida: acao.mensagem || '',
        status: 'aberto',
        responsavel: 'sistema',
      })
      return 'alerta criado'

    case 'criar_tarefa':
      await supabase.from('alertas_sistema').insert({
        tipo_alerta: 'tarefa_automatica',
        prioridade: 'media',
        descricao: acao.descricao || '',
        acao_sugerida: acao.descricao || '',
        status: 'aberto',
        responsavel: 'cs',
      })
      return 'tarefa criada'

    case 'atualizar_score':
      if (evento.aggregate_id) {
        const { data: cliente } = await supabase
          .from('clientes_hq')
          .select('score_total')
          .eq('id', evento.aggregate_id)
          .single()

        if (cliente) {
          const current = (cliente as { score_total: number }).score_total || 50
          const novoScore = Math.min(100, Math.max(0, current + (acao.valor || 0)))
          await supabase
            .from('clientes_hq')
            .update({ score_total: novoScore })
            .eq('id', evento.aggregate_id)
        }
      }
      return `score ajustado em ${acao.valor}`

    case 'emitir_evento':
      await supabase.from('eventos_sistema').insert({
        event_name: acao.event_name,
        aggregate_type: evento.aggregate_type,
        aggregate_id: evento.aggregate_id,
        clinica_id: evento.clinica_id || null,
        source_system: 'event-reaction-engine',
        payload_json: { origem: evento.event_name }
      })
      return `evento ${acao.event_name} emitido`

    case 'notificar_cs':
    case 'notificar_sdr':
    case 'notificar_financeiro':
    case 'notificar_trafego':
      await supabase.from('logs_sistema').insert({
        tipo: 'info',
        acao: `notificacao_${acao.tipo}`,
        payload: { mensagem: acao.mensagem, evento: evento.event_name },
        clinica_id: evento.clinica_id || null
      })
      return `notificacao enviada: ${acao.mensagem}`

    case 'n8n_webhook':
      try {
        await fetch(
          `https://cardosoeo.app.n8n.cloud/webhook/${acao.workflow}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_name: evento.event_name,
              clinica_id: evento.clinica_id,
              aggregate_id: evento.aggregate_id,
              payload: evento.payload_json,
              timestamp: new Date().toISOString()
            })
          }
        )
      } catch {
        // N8N pode estar offline — logar e continuar
      }
      return `n8n webhook disparado: ${acao.workflow}`

    default:
      return `acao desconhecida: ${acao.tipo}`
  }
}
