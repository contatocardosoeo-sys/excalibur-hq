'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import HealthScoreEquipeV2 from '../../../components/HealthScoreEquipeV2'

type Proposta = {
  id: string
  titulo: string
  descricao: string
  evidencia: Record<string, unknown>
  impacto_esperado: string
  roles_impactados: string[]
  status: string
  created_at: string
}

type Padrao = {
  id: string
  user_email: string
  tipo: string
  descricao: string
  frequencia: number
  ultima_vez: string
  resolvido: boolean
}

type Evento = {
  id: string
  user_email: string
  user_nome: string
  tipo: string
  pagina: string
  acao: string
  created_at: string
}

const fmtData = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export default function AdminInteligencia() {
  const [tab, setTab] = useState<'propostas' | 'padroes' | 'eventos'>('propostas')
  const [propostas, setPropostas] = useState<Proposta[]>([])
  const [padroes, setPadroes] = useState<Padrao[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const [p, pd, ev] = await Promise.all([
        fetch('/api/inteligencia/propostas').then(r => r.json()).catch(() => ({ propostas: [] })),
        fetch('/api/inteligencia/padroes').then(r => r.json()).catch(() => ({ padroes: [] })),
        fetch('/api/comportamento/evento?limit=30').then(r => r.json()).catch(() => ({ eventos: [] })),
      ])
      setPropostas(p.propostas || [])
      setPadroes(pd.padroes || [])
      setEventos(ev.eventos || [])
      setLoading(false)
    })()
  }, [])

  const decidir = async (id: string, status: 'aprovada' | 'rejeitada') => {
    await fetch('/api/inteligencia/propostas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status, aprovada_por: 'ceo' }),
    })
    setPropostas(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const TABS = [
    { key: 'propostas' as const, label: '💡 Propostas', count: propostas.filter(p => p.status === 'pendente').length },
    { key: 'padroes' as const, label: '🔍 Padrões', count: padroes.filter(p => !p.resolvido).length },
    { key: 'eventos' as const, label: '📊 Eventos', count: eventos.length },
  ]

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="mb-6">
          <h1 className="text-white text-xl md:text-2xl font-bold">🧠 Inteligência do Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">
            Observação comportamental · padrões detectados · propostas de melhoria · health score
          </p>
        </div>

        <HealthScoreEquipeV2 />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                minHeight: 40,
                padding: '8px 16px',
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                background: tab === t.key ? '#f59e0b' : '#1f2937',
                color: tab === t.key ? '#030712' : '#9ca3af',
                border: tab === t.key ? '1px solid #f59e0b' : '1px solid #374151',
              }}
            >
              {t.label} {t.count > 0 && <span style={{ marginLeft: 4, background: '#030712', color: '#f59e0b', padding: '1px 6px', borderRadius: 8, fontSize: 10 }}>{t.count}</span>}
            </button>
          ))}
        </div>

        {loading && <div className="text-gray-500 text-sm">Carregando...</div>}

        {/* Tab Propostas */}
        {tab === 'propostas' && !loading && (
          <div className="space-y-3">
            {propostas.length === 0 && <p className="text-gray-500 text-sm">Nenhuma proposta de melhoria gerada ainda.</p>}
            {propostas.map(p => (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white text-sm font-bold">{p.titulo}</h3>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                    p.status === 'pendente' ? 'bg-yellow-900/50 text-yellow-400' :
                    p.status === 'aprovada' ? 'bg-green-900/50 text-green-400' :
                    'bg-gray-800 text-gray-500'
                  }`}>{p.status}</span>
                </div>
                <p className="text-gray-400 text-xs mb-2">{p.descricao}</p>
                <p className="text-gray-500 text-[10px] mb-3">Impacto: {p.impacto_esperado} · Roles: {p.roles_impactados?.join(', ')}</p>
                {p.status === 'pendente' && (
                  <div className="flex gap-2">
                    <button onClick={() => decidir(p.id, 'aprovada')} className="bg-green-500 text-gray-950 font-bold text-xs rounded-lg px-4 py-2 min-h-[36px]">✅ Aprovar</button>
                    <button onClick={() => decidir(p.id, 'rejeitada')} className="bg-gray-800 text-red-400 text-xs rounded-lg px-4 py-2 min-h-[36px] border border-red-500/30">❌ Rejeitar</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab Padrões */}
        {tab === 'padroes' && !loading && (
          <div className="space-y-2">
            {padroes.length === 0 && <p className="text-gray-500 text-sm">Nenhum padrão comportamental detectado ainda.</p>}
            {padroes.map(p => (
              <div key={p.id} className={`bg-gray-900 border rounded-xl p-3 ${p.resolvido ? 'border-green-800/30' : 'border-red-800/30'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs text-gray-300 font-bold">{p.tipo}</span>
                    <span className="text-[10px] text-gray-600 ml-2">{p.user_email} · {p.frequencia}x</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{fmtData(p.ultima_vez)}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">{p.descricao}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab Eventos */}
        {tab === 'eventos' && !loading && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="text-left text-[10px] uppercase text-gray-500 border-b border-gray-800">
                  <th className="py-2">Quando</th>
                  <th className="py-2">Quem</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Página</th>
                  <th className="py-2">Ação</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {eventos.map(e => (
                  <tr key={e.id} className="border-b border-gray-800/60">
                    <td className="py-2 text-gray-500">{fmtData(e.created_at)}</td>
                    <td className="py-2">{e.user_nome || e.user_email?.split('@')[0]}</td>
                    <td className="py-2">{e.tipo}</td>
                    <td className="py-2 text-gray-500">{e.pagina}</td>
                    <td className="py-2">{e.acao || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
