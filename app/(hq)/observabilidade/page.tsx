'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

const SUPABASE_URL = 'https://hluhlsnodndpskrkbjuw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdWhsc25vZG5kcHNrcmtianV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTM1MDg3MCwiZXhwIjoyMDkwOTI2ODcwfQ.3gbnB8elQR1f1FOn5hshpF5Vdn4ZEureW3QHQmrws_o'

interface Evento {
  id: string
  event_name: string
  aggregate_type: string
  clinica_id: string
  actor_type: string
  source_system: string
  payload_json: Record<string, unknown>
  status: string
  created_at: string
}

interface LogEntry {
  id: string
  rota: string
  metodo: string
  acao: string
  tipo: string
  duracao_ms: number
  status_code: number
  created_at: string
}

interface Incidente {
  id: string
  titulo: string
  descricao: string
  severidade: string
  status: string
  created_at: string
  resolved_at: string | null
}

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
  info: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  warn: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400' },
  critical: { bg: 'bg-red-600/20', text: 'text-red-300' },
}

const SEV_COLORS: Record<string, { bg: string; text: string }> = {
  baixa: { bg: 'bg-green-500/20', text: 'text-green-400' },
  media: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  alta: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  critica: { bg: 'bg-red-500/20', text: 'text-red-400' },
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  processed: { bg: 'bg-green-500/20', text: 'text-green-400' },
  failed: { bg: 'bg-red-500/20', text: 'text-red-400' },
  aberto: { bg: 'bg-red-500/20', text: 'text-red-400' },
  investigando: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  resolvido: { bg: 'bg-green-500/20', text: 'text-green-400' },
  fechado: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
}

function tempoRelativo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

async function fetchSupa(table: string, params: string = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}&order=created_at.desc&limit=50`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  })
  return res.ok ? res.json() : []
}

export default function ObservabilidadePage() {
  const [tab, setTab] = useState<'eventos' | 'logs' | 'incidentes'>('eventos')
  const [eventos, setEventos] = useState<Evento[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [incidentes, setIncidentes] = useState<Incidente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [ev, lo, inc] = await Promise.all([
        fetchSupa('eventos_sistema', 'select=*'),
        fetchSupa('logs_sistema', 'select=*'),
        fetchSupa('incidentes', 'select=*'),
      ])
      setEventos(ev)
      setLogs(lo)
      setIncidentes(inc)
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  const totalEventos = eventos.length
  const eventosPending = eventos.filter(e => e.status === 'pending').length
  const totalLogs = logs.length
  const logsError = logs.filter(l => l.tipo === 'error' || l.tipo === 'critical').length
  const incidentesAbertos = incidentes.filter(i => i.status === 'aberto' || i.status === 'investigando').length

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-amber-500">🔭</span> Observabilidade
            </h1>
            <p className="text-gray-400 text-sm mt-1">Eventos, logs e incidentes do sistema</p>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {[
              { label: 'Eventos Total', valor: totalEventos, icon: '⚡', cor: 'text-amber-400' },
              { label: 'Pendentes', valor: eventosPending, icon: '⏳', cor: eventosPending > 10 ? 'text-red-400' : 'text-yellow-400' },
              { label: 'Logs Total', valor: totalLogs, icon: '📋', cor: 'text-blue-400' },
              { label: 'Erros', valor: logsError, icon: '🐛', cor: logsError > 0 ? 'text-red-400' : 'text-green-400' },
              { label: 'Incidentes Abertos', valor: incidentesAbertos, icon: '🚨', cor: incidentesAbertos > 0 ? 'text-red-400' : 'text-green-400' },
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

          {/* Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'eventos' as const, label: 'Eventos', icon: '⚡', count: totalEventos },
              { key: 'logs' as const, label: 'Logs', icon: '📋', count: totalLogs },
              { key: 'incidentes' as const, label: 'Incidentes', icon: '🚨', count: incidentesAbertos },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-2 ${
                  tab === t.key
                    ? 'bg-amber-500 text-gray-950'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {t.icon} {t.label}
                {t.count > 0 && (
                  <span className={`text-xs px-1.5 rounded-full ${tab === t.key ? 'bg-gray-950/20 text-gray-950' : 'bg-gray-700 text-gray-400'}`}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {loading && <div className="text-center text-gray-500 py-8">Carregando...</div>}

          {/* Eventos Tab */}
          {!loading && tab === 'eventos' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="divide-y divide-gray-800">
                {eventos.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum evento registrado ainda</div>}
                {eventos.map((ev) => {
                  const st = STATUS_COLORS[ev.status] || STATUS_COLORS.pending
                  return (
                    <div key={ev.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/50 transition">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge className={`${st.bg} ${st.text} border-0 text-[10px] min-w-[50px] justify-center`}>{ev.status}</Badge>
                        <div className="flex-1">
                          <p className="text-white text-sm font-mono">{ev.event_name}</p>
                          <p className="text-gray-500 text-xs">
                            {ev.aggregate_type && <span className="text-gray-400">{ev.aggregate_type}</span>}
                            {ev.source_system && <span> · {ev.source_system}</span>}
                            {ev.actor_type && <span> · {ev.actor_type}</span>}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs">{tempoRelativo(ev.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Logs Tab */}
          {!loading && tab === 'logs' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="divide-y divide-gray-800">
                {logs.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum log registrado ainda</div>}
                {logs.map((l) => {
                  const tp = TIPO_COLORS[l.tipo] || TIPO_COLORS.info
                  return (
                    <div key={l.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-800/50 transition">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge className={`${tp.bg} ${tp.text} border-0 text-[10px] min-w-[40px] justify-center uppercase`}>{l.tipo}</Badge>
                        <div className="flex-1">
                          <p className="text-white text-sm">{l.acao}</p>
                          <p className="text-gray-500 text-xs font-mono">
                            {l.metodo} {l.rota}
                            {l.duracao_ms ? ` · ${l.duracao_ms}ms` : ''}
                            {l.status_code ? ` · ${l.status_code}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-500 text-xs">{tempoRelativo(l.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Incidentes Tab */}
          {!loading && tab === 'incidentes' && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="divide-y divide-gray-800">
                {incidentes.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum incidente registrado — sistema saudável</div>}
                {incidentes.map((inc) => {
                  const sev = SEV_COLORS[inc.severidade] || SEV_COLORS.media
                  const st = STATUS_COLORS[inc.status] || STATUS_COLORS.aberto
                  return (
                    <div key={inc.id} className="px-5 py-4 hover:bg-gray-800/50 transition">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${sev.bg} ${sev.text} border-0 text-[10px]`}>{inc.severidade}</Badge>
                          <Badge className={`${st.bg} ${st.text} border-0 text-[10px]`}>{inc.status}</Badge>
                          <h3 className="text-white text-sm font-semibold">{inc.titulo}</h3>
                        </div>
                        <span className="text-gray-500 text-xs">{tempoRelativo(inc.created_at)}</span>
                      </div>
                      {inc.descricao && <p className="text-gray-400 text-xs">{inc.descricao}</p>}
                      {inc.resolved_at && <p className="text-green-400 text-xs mt-1">Resolvido {tempoRelativo(inc.resolved_at)}</p>}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
