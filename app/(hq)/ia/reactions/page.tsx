'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

const SUPABASE_URL = 'https://hluhlsnodndpskrkbjuw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWhsc25vZG5kcHNrcmtianV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM1MDg3MCwiZXhwIjoyMDkwOTI2ODcwfQ.3gbnB8elQR1f1FOn5hshpF5Vdn4ZEureW3QHQmrws_o'

interface ReactionAction {
  tipo: string
  prioridade?: string
  mensagem?: string
  descricao?: string
  valor?: number
  event_name?: string
  workflow?: string
}

interface Reaction {
  id: string
  event_name: string
  reaction_name: string
  trigger_condition: Record<string, unknown>
  actions: ReactionAction[]
  ativo: boolean
  execucoes: number
  ultima_execucao: string | null
  created_at: string
}

interface ReactionLog {
  id: string
  event_name: string
  reaction_name: string
  acoes_executadas: { acao: string; status: string; resultado?: string; erro?: string }[]
  status: string
  duracao_ms: number
  erro_mensagem: string | null
  created_at: string
}

interface TestResult {
  evento: Record<string, unknown>
  reacoes_executadas: { reacao: string; acoes: { acao: string; status: string; resultado?: string }[] }[]
}

const EVENTO_OPTIONS = [
  'lead_created',
  'lead_sem_resposta_24h',
  'venda_closed',
  'score_updated',
  'agendamento_missed',
  'payment_overdue',
  'campanha_underperforming',
  'cliente_onboarding_started',
]

const EVENTO_ICON: Record<string, string> = {
  lead_created: '📥',
  lead_sem_resposta_24h: '⏰',
  venda_closed: '💰',
  score_updated: '📊',
  agendamento_missed: '❌',
  payment_overdue: '💳',
  campanha_underperforming: '📉',
  cliente_onboarding_started: '🚀',
}

const EVENTO_COR: Record<string, { bg: string; text: string }> = {
  lead_created: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  lead_sem_resposta_24h: { bg: 'bg-red-500/20', text: 'text-red-400' },
  venda_closed: { bg: 'bg-green-500/20', text: 'text-green-400' },
  score_updated: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  agendamento_missed: { bg: 'bg-red-500/20', text: 'text-red-400' },
  payment_overdue: { bg: 'bg-red-500/20', text: 'text-red-400' },
  campanha_underperforming: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  cliente_onboarding_started: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
}

const STATUS_COR: Record<string, string> = {
  concluido: 'text-green-400 bg-green-500/20',
  erro: 'text-red-400 bg-red-500/20',
  parcial: 'text-amber-400 bg-amber-500/20',
  rodando: 'text-blue-400 bg-blue-500/20',
}

const ACAO_ICON: Record<string, string> = {
  criar_alerta: '🚨',
  criar_tarefa: '📋',
  atualizar_score: '📊',
  emitir_evento: '⚡',
  notificar_cs: '🎯',
  notificar_sdr: '📞',
  notificar_financeiro: '💰',
  notificar_trafego: '📣',
  n8n_webhook: '🔗',
}

function tempoRel(dateStr: string | null): string {
  if (!dateStr) return 'nunca'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

async function fetchSupa(table: string, params: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  })
  return res.ok ? res.json() : []
}

export default function ReactionsPage() {
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [logs, setLogs] = useState<ReactionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(EVENTO_OPTIONS[0])
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [r, l] = await Promise.all([
      fetchSupa('event_reactions', 'select=*&order=created_at.asc'),
      fetchSupa('event_reaction_logs', 'select=*&order=created_at.desc&limit=30'),
    ])
    setReactions(r)
    setLogs(l)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function toggleReaction(id: string, ativo: boolean) {
    await fetch(`${SUPABASE_URL}/rest/v1/event_reactions?id=eq.${id}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ ativo: !ativo })
    })
    await loadData()
  }

  async function dispararTeste() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_name: selectedEvent,
          source_system: 'teste-manual',
          payload_json: { teste: true, disparado_por: 'reactions-page' }
        })
      })
      const json = await res.json()
      if (json.success) {
        setTestResult(json)
        await loadData()
      } else {
        alert('Erro: ' + json.error)
      }
    } catch (err) {
      alert('Erro: ' + (err instanceof Error ? err.message : String(err)))
    }
    setTesting(false)
  }

  // KPIs
  const reacaoAtivas = reactions.filter(r => r.ativo).length
  const hoje = new Date().toDateString()
  const execucoesHoje = logs.filter(l => new Date(l.created_at).toDateString() === hoje).length
  const acoesHoje = logs.filter(l => new Date(l.created_at).toDateString() === hoje)
    .reduce((sum, l) => sum + (l.acoes_executadas?.length || 0), 0)
  const totalLogs = logs.length
  const sucessoLogs = logs.filter(l => l.status === 'concluido').length
  const taxaSucesso = totalLogs > 0 ? Math.round((sucessoLogs / totalLogs) * 100) : 100

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 md:p-6 min-w-0">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-amber-500">⚡</span> Event Reactions
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Cadeias automaticas de acao por evento
                <span className="ml-2 text-gray-600">· {reacaoAtivas} reacoes ativas</span>
              </p>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs px-3 py-1">
              {reactions.length} reacoes configuradas
            </Badge>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: 'Reacoes Ativas', valor: reacaoAtivas, icon: '⚡', cor: 'text-amber-400' },
              { label: 'Execucoes Hoje', valor: execucoesHoje, icon: '🔄', cor: 'text-blue-400' },
              { label: 'Acoes Disparadas Hoje', valor: acoesHoje, icon: '🎯', cor: 'text-purple-400' },
              { label: 'Taxa de Sucesso', valor: `${taxaSucesso}%`, icon: '✅', cor: 'text-green-400' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">{kpi.label}</span>
                  <span className="text-lg">{kpi.icon}</span>
                </div>
                <p className={`text-2xl font-bold ${kpi.cor}`}>{kpi.valor}</p>
              </div>
            ))}
          </div>

          {/* Simular Evento */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <h2 className="text-white font-semibold flex items-center gap-2 mb-4">
              <span className="text-amber-500">🧪</span> Simular Evento
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedEvent}
                onChange={(e) => setSelectedEvent(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-4 py-2.5 flex-1 focus:outline-none focus:border-amber-500"
              >
                {EVENTO_OPTIONS.map((ev) => (
                  <option key={ev} value={ev}>
                    {EVENTO_ICON[ev] || '⚡'} {ev}
                  </option>
                ))}
              </select>
              <button
                onClick={dispararTeste}
                disabled={testing}
                className="px-5 py-2.5 bg-amber-500 text-gray-950 rounded-xl text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition flex items-center gap-2 shrink-0"
              >
                {testing ? (
                  <><span className="animate-spin">⚡</span> Disparando...</>
                ) : (
                  <>⚡ Disparar Evento de Teste</>
                )}
              </button>
            </div>

            {/* Resultado do teste */}
            {testResult && (
              <div className="mt-4 space-y-3">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <p className="text-green-400 font-semibold text-sm mb-2">Evento disparado com sucesso</p>
                  <p className="text-gray-400 text-xs">ID: {String((testResult.evento as Record<string, unknown>).id || 'N/A')}</p>
                </div>
                {testResult.reacoes_executadas.map((r, i) => (
                  <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                    <p className="text-amber-400 font-semibold text-sm mb-2">Reacao: {r.reacao}</p>
                    <div className="space-y-1">
                      {r.acoes.map((a, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <span>{a.status === 'ok' ? '✅' : '❌'}</span>
                          <span className="text-gray-400">{ACAO_ICON[a.acao] || '⚙️'} {a.acao}</span>
                          <span className="text-gray-500">→ {a.resultado || a.acao}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reacoes Configuradas */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="text-amber-500">⚙️</span> Reacoes Configuradas
              </h2>
            </div>
            <div className="divide-y divide-gray-800">
              {loading && <div className="p-8 text-center text-gray-500">Carregando...</div>}
              {reactions.map((r) => {
                const evCor = EVENTO_COR[r.event_name] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }
                const isExpanded = expandedId === r.id
                return (
                  <div key={r.id}>
                    <div
                      className="px-5 py-4 flex items-center justify-between hover:bg-gray-800/30 transition cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-lg">{EVENTO_ICON[r.event_name] || '⚡'}</span>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge className={`${evCor.bg} ${evCor.text} border-0 text-[10px]`}>
                              {r.event_name}
                            </Badge>
                            <span className="text-white text-sm font-medium">{r.reaction_name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{r.actions.length} acoes na cadeia</span>
                            <span>·</span>
                            <span>{r.execucoes} execucoes</span>
                            <span>·</span>
                            <span>Ultima: {tempoRel(r.ultima_execucao)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleReaction(r.id, r.ativo) }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                            r.ativo
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                              : 'bg-gray-700/50 text-gray-500 hover:bg-gray-700'
                          }`}
                        >
                          {r.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                        <span className="text-gray-600 text-xs">{isExpanded ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-0">
                        <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">Cadeia de acoes:</p>
                          {r.actions.map((a, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <span className="text-amber-500 font-bold text-xs w-5">{i + 1}.</span>
                              <span>{ACAO_ICON[a.tipo] || '⚙️'}</span>
                              <span className="text-white">{a.tipo}</span>
                              {a.mensagem && <span className="text-gray-500 text-xs">— {a.mensagem}</span>}
                              {a.descricao && <span className="text-gray-500 text-xs">— {a.descricao}</span>}
                              {a.workflow && <span className="text-gray-500 text-xs">→ {a.workflow}</span>}
                              {a.event_name && <span className="text-gray-500 text-xs">→ {a.event_name}</span>}
                              {a.valor !== undefined && <span className="text-gray-500 text-xs">({a.valor > 0 ? '+' : ''}{a.valor})</span>}
                            </div>
                          ))}
                          {Object.keys(r.trigger_condition).length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-700">
                              <p className="text-gray-500 text-xs">Condicao: {JSON.stringify(r.trigger_condition)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Log de Execucoes */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="text-amber-500">📜</span> Log de Execucoes Recentes
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left px-5 py-3 font-medium">Data</th>
                    <th className="text-left px-5 py-3 font-medium">Evento</th>
                    <th className="text-left px-5 py-3 font-medium">Reacao</th>
                    <th className="text-left px-5 py-3 font-medium">Acoes</th>
                    <th className="text-left px-5 py-3 font-medium">Status</th>
                    <th className="text-right px-5 py-3 font-medium">Duracao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {logs.length === 0 && !loading && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                        Nenhuma execucao ainda — dispare um evento de teste acima
                      </td>
                    </tr>
                  )}
                  {logs.map((log) => {
                    const evCor = EVENTO_COR[log.event_name] || { bg: 'bg-gray-500/20', text: 'text-gray-400' }
                    return (
                      <tr key={log.id} className="hover:bg-gray-800/30 transition">
                        <td className="px-5 py-3 text-gray-400 text-xs">{tempoRel(log.created_at)}</td>
                        <td className="px-5 py-3">
                          <Badge className={`${evCor.bg} ${evCor.text} border-0 text-[10px]`}>
                            {EVENTO_ICON[log.event_name] || '⚡'} {log.event_name}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-white text-xs">{log.reaction_name}</td>
                        <td className="px-5 py-3">
                          <div className="flex gap-1">
                            {log.acoes_executadas?.map((a, i) => (
                              <span key={i} title={`${a.acao}: ${a.resultado || a.erro || ''}`}>
                                {a.status === 'ok' ? '✅' : '❌'}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <Badge className={`${STATUS_COR[log.status] || 'text-gray-400 bg-gray-500/20'} border-0 text-[10px]`}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-right text-gray-500 text-xs">{log.duracao_ms}ms</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
