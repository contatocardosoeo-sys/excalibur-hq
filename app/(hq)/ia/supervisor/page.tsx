'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

const SUPABASE_URL = 'https://hluhlsnodndpskrkbjuw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWhsc25vZG5kcHNrcmtianV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM1MDg3MCwiZXhwIjoyMDkwOTI2ODcwfQ.3gbnB8elQR1f1FOn5hshpF5Vdn4ZEureW3QHQmrws_o'

interface Sessao {
  id: string
  agente: string
  output_resumo: string
  output_prioridades: Prioridade[]
  output_alertas: Alerta[]
  tokens_usados: number
  duracao_ms: number
  status: string
  created_at: string
}

interface Prioridade {
  ordem: number
  titulo: string
  descricao: string
  impacto: string
  area: string
}

interface Alerta {
  titulo: string
  descricao: string
  acao: string
}

interface Sugestao {
  id: string
  titulo: string
  descricao: string
  impacto: string
  area: string
  aprovada: boolean
  executada: boolean
  created_at: string
}

interface RunResult {
  resumo: string
  prioridades: Prioridade[]
  alertas: Alerta[]
  recomendacao_ceo: string
  tokens: number
  duracao_ms: number
}

const IMPACTO: Record<string, { bg: string; text: string }> = {
  critico: { bg: 'bg-red-500/20', text: 'text-red-400' },
  alto: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  medio: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  baixo: { bg: 'bg-green-500/20', text: 'text-green-400' },
}

const AREA_ICON: Record<string, string> = {
  cs: '🎯', comercial: '💼', financeiro: '💰', trafego: '📣', operacao: '⚙️', produto: '🛠️',
}

function tempoRel(dateStr: string): string {
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

export default function SupervisorPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    const [sess, sug] = await Promise.all([
      fetchSupa('sessoes_ia', 'select=*&order=created_at.desc&limit=20'),
      fetchSupa('sugestoes_ia', 'select=*&order=created_at.desc&limit=30'),
    ])
    setSessoes(sess)
    setSugestoes(sug)
    setLoading(false)
  }

  async function rodarSupervisor() {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch('/api/ia/supervisor', { method: 'POST' })
      const json = await res.json()
      if (json.success) {
        setRunResult(json.data)
        await loadData()
      } else {
        alert('Erro: ' + json.error)
      }
    } catch (err) {
      alert('Erro ao rodar supervisor: ' + (err instanceof Error ? err.message : String(err)))
    }
    setRunning(false)
  }

  async function aprovarSugestao(id: string) {
    await fetch(`${SUPABASE_URL}/rest/v1/sugestoes_ia?id=eq.${id}`, {
      method: 'PATCH',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ aprovada: true })
    })
    await loadData()
  }

  const sessoesHoje = sessoes.filter(s => new Date(s.created_at).toDateString() === new Date().toDateString()).length
  const tokensTotal = sessoes.reduce((s, sess) => s + sess.tokens_usados, 0)
  const sugestoesTotal = sugestoes.length
  const aprovadas = sugestoes.filter(s => s.aprovada).length
  const ultima = sessoes[0]

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <span className="text-amber-500">🧠</span> Agente Supervisor
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Monitoramento inteligente da operação
                {ultima && <span className="ml-2 text-gray-600">· Último run: {tempoRel(ultima.created_at)}</span>}
              </p>
            </div>
            <button
              onClick={rodarSupervisor}
              disabled={running}
              className="px-5 py-2.5 bg-amber-500 text-gray-950 rounded-xl text-sm font-bold hover:bg-amber-400 disabled:opacity-50 transition flex items-center gap-2"
            >
              {running ? (
                <><span className="animate-spin">⚡</span> Analisando sistema...</>
              ) : (
                <>🧠 Rodar Agora</>
              )}
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Sessões Hoje', valor: sessoesHoje, icon: '🧠', cor: 'text-amber-400' },
              { label: 'Tokens Consumidos', valor: tokensTotal.toLocaleString(), icon: '⚡', cor: 'text-blue-400' },
              { label: 'Sugestões Geradas', valor: sugestoesTotal, icon: '💡', cor: 'text-purple-400' },
              { label: 'Aprovadas', valor: aprovadas, icon: '✅', cor: 'text-green-400' },
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

          {/* Run Result (novo) */}
          {runResult && (
            <div className="space-y-4">
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <h2 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">⚡ Resumo Executivo</h2>
                <p className="text-white text-sm leading-relaxed">{runResult.resumo}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {runResult.prioridades.map((p, i) => {
                  const imp = IMPACTO[p.impacto] || IMPACTO.medio
                  return (
                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-amber-500 font-bold text-lg">#{p.ordem}</span>
                        <Badge className={`${imp.bg} ${imp.text} border-0 text-[10px]`}>{p.impacto}</Badge>
                        {p.area && <span className="text-xs text-gray-500">{AREA_ICON[p.area] || ''} {p.area}</span>}
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">{p.titulo}</h3>
                      <p className="text-gray-400 text-xs">{p.descricao}</p>
                    </div>
                  )
                })}
              </div>

              {runResult.alertas.length > 0 && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-5">
                  <h2 className="text-red-400 font-bold text-sm mb-3">⚠️ Alertas Críticos</h2>
                  {runResult.alertas.map((a, i) => (
                    <div key={i} className="flex items-start gap-3 mb-2 last:mb-0">
                      <span className="text-red-400 text-sm mt-0.5">●</span>
                      <div>
                        <p className="text-white text-sm font-medium">{a.titulo}</p>
                        <p className="text-gray-400 text-xs">{a.descricao}</p>
                        {a.acao && <p className="text-amber-400 text-xs mt-1">→ {a.acao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {runResult.recomendacao_ceo && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                  <h2 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">👑 Recomendação para o CEO</h2>
                  <p className="text-white text-sm leading-relaxed">{runResult.recomendacao_ceo}</p>
                </div>
              )}

              <p className="text-gray-600 text-xs text-right">
                {runResult.tokens} tokens · {runResult.duracao_ms}ms
              </p>
            </div>
          )}

          {/* Última Análise (do histórico) */}
          {!runResult && ultima && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <span className="text-amber-500">📋</span> Última Análise
                </h2>
                <span className="text-gray-500 text-xs">{tempoRel(ultima.created_at)} · {ultima.tokens_usados} tokens</span>
              </div>
              <p className="text-gray-300 text-sm mb-4">{ultima.output_resumo}</p>
              {ultima.output_prioridades.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {ultima.output_prioridades.map((p: Prioridade, i: number) => {
                    const imp = IMPACTO[p.impacto] || IMPACTO.medio
                    return (
                      <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-amber-500 font-bold text-sm">#{p.ordem}</span>
                          <Badge className={`${imp.bg} ${imp.text} border-0 text-[9px]`}>{p.impacto}</Badge>
                        </div>
                        <p className="text-white text-xs font-medium">{p.titulo}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sugestões Abertas */}
          {sugestoes.filter(s => !s.aprovada).length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="p-5 border-b border-gray-800">
                <h2 className="text-white font-semibold flex items-center gap-2">
                  <span className="text-amber-500">💡</span> Sugestões Pendentes
                </h2>
              </div>
              <div className="divide-y divide-gray-800">
                {sugestoes.filter(s => !s.aprovada).slice(0, 10).map((s) => {
                  const imp = IMPACTO[s.impacto] || IMPACTO.medio
                  return (
                    <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge className={`${imp.bg} ${imp.text} border-0 text-[10px]`}>{s.impacto}</Badge>
                        <div>
                          <p className="text-white text-sm">{s.titulo}</p>
                          <p className="text-gray-500 text-xs">{s.descricao}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => aprovarSugestao(s.id)}
                        className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition"
                      >
                        ✅ Aprovar
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Histórico */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl">
            <div className="p-5 border-b border-gray-800">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <span className="text-amber-500">📜</span> Histórico de Sessões
              </h2>
            </div>
            <div className="divide-y divide-gray-800">
              {loading && <div className="p-8 text-center text-gray-500">Carregando...</div>}
              {!loading && sessoes.length === 0 && (
                <div className="p-8 text-center text-gray-500">Nenhuma sessão ainda — clique "Rodar Agora"</div>
              )}
              {sessoes.map((s) => (
                <div key={s.id} className="px-5 py-3 hover:bg-gray-800/50 transition">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">{s.status}</Badge>
                      <span className="text-gray-400 text-xs">{s.tokens_usados} tokens · {s.duracao_ms}ms</span>
                    </div>
                    <span className="text-gray-500 text-xs">{tempoRel(s.created_at)}</span>
                  </div>
                  <p className="text-white text-sm truncate">{s.output_resumo || 'Sem resumo'}</p>
                  <div className="flex gap-1 mt-1">
                    {s.output_prioridades.map((p: Prioridade, i: number) => {
                      const imp = IMPACTO[p.impacto] || IMPACTO.medio
                      return <Badge key={i} className={`${imp.bg} ${imp.text} border-0 text-[9px]`}>{p.titulo}</Badge>
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
