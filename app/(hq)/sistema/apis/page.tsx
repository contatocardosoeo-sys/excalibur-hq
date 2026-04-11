'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'

type RotaInfo = {
  rota: string
  arquivo: string
  metodos: string[]
  segura_ping: boolean
  suporta_GET: boolean
}

type PingResult = {
  rota: string
  status: number
  ok: boolean
  latencia_ms: number
  tamanho_bytes?: number
  erro?: string
}

type Payload = {
  resumo: {
    total: number
    por_metodo: { GET: number; POST: number; PATCH: number; DELETE: number }
    com_ping_seguro: number
  }
  lista: RotaInfo[]
  ping?: PingResult[]
  ping_rodado_em?: string
}

export default function SistemaApisPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [pingando, setPingando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [metodoFiltro, setMetodoFiltro] = useState('')

  const carregar = async (comPing = false) => {
    if (comPing) setPingando(true)
    else setLoading(true)
    try {
      const r = await fetch(`/api/sistema/apis${comPing ? '?ping=1' : ''}`).then(r => r.json())
      setData(r)
    } catch { /* */ }
    setLoading(false)
    setPingando(false)
  }

  useEffect(() => { carregar() }, [])

  const pingMap: Record<string, PingResult> = Object.fromEntries((data?.ping || []).map(p => [p.rota, p]))

  const lista = (data?.lista || []).filter(r => {
    if (filtro && !r.rota.toLowerCase().includes(filtro.toLowerCase())) return false
    if (metodoFiltro && !r.metodos.includes(metodoFiltro)) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="mb-6">
          <h1 className="text-white text-2xl md:text-3xl font-bold">🔌 Inventário de APIs</h1>
          <p className="text-gray-400 text-sm mt-1">Todas as rotas descobertas em <code className="bg-gray-800 px-1 rounded">app/api</code>. Healthcheck admin-only.</p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando...</div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">Total</div>
                <div className="text-white text-2xl font-bold mt-1">{data.resumo.total}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">GET</div>
                <div className="text-blue-400 text-2xl font-bold mt-1">{data.resumo.por_metodo.GET}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">POST</div>
                <div className="text-green-400 text-2xl font-bold mt-1">{data.resumo.por_metodo.POST}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">PATCH</div>
                <div className="text-amber-400 text-2xl font-bold mt-1">{data.resumo.por_metodo.PATCH}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">Ping seguras</div>
                <div className="text-emerald-400 text-2xl font-bold mt-1">{data.resumo.com_ping_seguro}</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <input
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
                placeholder="Filtrar rotas..."
                className="flex-1 min-w-[200px] bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
              />
              <select value={metodoFiltro} onChange={e => setMetodoFiltro(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="">Todos métodos</option>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
              <button
                onClick={() => carregar(true)}
                disabled={pingando}
                className="bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg px-4 py-2 text-xs font-bold min-h-[40px] disabled:opacity-60"
              >
                {pingando ? '⏳ Pingando...' : '⚡ Health check em tudo'}
              </button>
              {data.ping_rodado_em && (
                <span className="text-[10px] text-gray-500">
                  Rodado: {new Date(data.ping_rodado_em).toLocaleTimeString('pt-BR')}
                </span>
              )}
            </div>

            {/* Tabela */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/40">
                    <tr className="text-left text-[10px] uppercase text-gray-500">
                      <th className="p-3">Rota</th>
                      <th className="p-3">Métodos</th>
                      <th className="p-3 text-center">Ping</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Latência</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map(r => {
                      const p = pingMap[r.rota]
                      return (
                        <tr key={r.rota} className="border-t border-gray-800 hover:bg-gray-800/30">
                          <td className="p-3 font-mono text-white">{r.rota}</td>
                          <td className="p-3">
                            <div className="flex gap-1 flex-wrap">
                              {r.metodos.map(m => (
                                <span key={m} className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  m === 'GET' ? 'bg-blue-500/20 text-blue-400' :
                                  m === 'POST' ? 'bg-green-500/20 text-green-400' :
                                  m === 'PATCH' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-red-500/20 text-red-400'
                                }`}>{m}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {r.segura_ping ? <span className="text-emerald-400">✓</span> : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="p-3 text-center">
                            {p ? (
                              p.ok ? <span className="text-green-400 font-bold">{p.status} OK</span> : <span className="text-red-400 font-bold" title={p.erro}>{p.status || 'ERR'}</span>
                            ) : <span className="text-gray-700">—</span>}
                          </td>
                          <td className="p-3 text-right">
                            {p ? (
                              <span className={`font-mono ${p.latencia_ms < 500 ? 'text-green-400' : p.latencia_ms < 1500 ? 'text-amber-400' : 'text-red-400'}`}>
                                {p.latencia_ms}ms
                              </span>
                            ) : <span className="text-gray-700">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-3 border-t border-gray-800 text-[10px] text-gray-500">
                {lista.length} rotas exibidas de {data.resumo.total} · Healthcheck só roda nas {data.resumo.com_ping_seguro} marcadas como "segura pra ping"
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-red-400">Erro ao carregar</div>
        )}
      </div>
    </div>
  )
}
