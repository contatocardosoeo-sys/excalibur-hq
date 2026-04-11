'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'

type WebhookItem = {
  id: string
  origem: 'asaas' | 'prospecta' | 'wascript'
  event: string | null
  ref_id: string | null
  payload: unknown
  processed: boolean
  error: string | null
  created_at: string
}

type Payload = {
  stats: {
    total: number
    por_origem: Record<string, number>
    processados: number
    com_erro: number
    nao_processados: number
  }
  itens: WebhookItem[]
}

const ORIGEM_EMOJI: Record<string, string> = { asaas: '💰', prospecta: '📱', wascript: '💬' }
const ORIGEM_COR: Record<string, string> = {
  asaas: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40',
  prospecta: 'bg-blue-500/10 text-blue-400 border-blue-500/40',
  wascript: 'bg-amber-500/10 text-amber-400 border-amber-500/40',
}

export default function SistemaWebhooksPage() {
  const [data, setData] = useState<Payload | null>(null)
  const [loading, setLoading] = useState(true)
  const [origem, setOrigem] = useState('')
  const [apenasErros, setApenasErros] = useState(false)
  const [selecionado, setSelecionado] = useState<WebhookItem | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const carregar = async () => {
    try {
      const params = new URLSearchParams()
      if (origem) params.set('origem', origem)
      if (apenasErros) params.set('erros', '1')
      params.set('limit', '200')
      const r = await fetch(`/api/sistema/webhooks?${params}`).then(r => r.json())
      setData(r)
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [origem, apenasErros])

  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(carregar, 5000)
    return () => clearInterval(iv)
  }, [autoRefresh, origem, apenasErros])

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-white text-2xl md:text-3xl font-bold">📡 Webhooks recebidos</h1>
            <p className="text-gray-400 text-sm mt-1">Feed ao vivo de todos os webhooks entrando no sistema</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="accent-amber-500" />
            Auto-refresh (5s)
            {autoRefresh && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-1" />}
          </label>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando...</div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">Total</div>
                <div className="text-white text-2xl font-bold mt-1">{data.stats.total}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">💰 Asaas</div>
                <div className="text-emerald-400 text-2xl font-bold mt-1">{data.stats.por_origem.asaas || 0}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">📱 Prospecta</div>
                <div className="text-blue-400 text-2xl font-bold mt-1">{data.stats.por_origem.prospecta || 0}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">✅ Processados</div>
                <div className="text-green-400 text-2xl font-bold mt-1">{data.stats.processados}</div>
              </div>
              <div className={`bg-gray-900 border rounded-xl p-4 ${data.stats.com_erro > 0 ? 'border-red-800/60' : 'border-gray-800'}`}>
                <div className="text-[10px] uppercase text-gray-500 font-semibold">❌ Erros</div>
                <div className={`text-2xl font-bold mt-1 ${data.stats.com_erro > 0 ? 'text-red-400' : 'text-gray-500'}`}>{data.stats.com_erro}</div>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-4 items-center">
              <select value={origem} onChange={e => setOrigem(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white">
                <option value="">Todas origens</option>
                <option value="asaas">💰 Asaas</option>
                <option value="prospecta">📱 Prospecta</option>
              </select>
              <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer bg-gray-800 border border-gray-700 rounded-lg px-3 py-2">
                <input type="checkbox" checked={apenasErros} onChange={e => setApenasErros(e.target.checked)} className="accent-red-500" />
                Só erros
              </label>
              <button onClick={carregar} className="bg-gray-800 hover:bg-gray-700 text-white rounded-lg px-4 py-2 text-xs font-bold min-h-[40px]">
                🔄 Atualizar
              </button>
            </div>

            {/* Lista */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="p-3 border-b border-gray-800 text-xs text-gray-400 font-semibold">
                  {data.itens.length} webhooks
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {data.itens.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 text-sm">Nenhum webhook recebido ainda</div>
                  ) : (
                    data.itens.map(item => (
                      <button
                        key={`${item.origem}-${item.id}`}
                        onClick={() => setSelecionado(item)}
                        className={`w-full text-left p-3 border-b border-gray-800 hover:bg-gray-800/50 transition ${selecionado?.id === item.id ? 'bg-amber-500/5 border-l-2 border-l-amber-500' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${ORIGEM_COR[item.origem]}`}>
                              {ORIGEM_EMOJI[item.origem]} {item.origem.toUpperCase()}
                            </span>
                            <span className="text-white text-xs font-mono truncate">{item.event || '—'}</span>
                          </div>
                          {item.error ? (
                            <span className="text-red-400 text-xs">❌</span>
                          ) : item.processed ? (
                            <span className="text-green-400 text-xs">✓</span>
                          ) : (
                            <span className="text-amber-400 text-xs">⏳</span>
                          )}
                        </div>
                        {item.ref_id && (
                          <div className="text-[10px] text-gray-500 font-mono truncate">{item.ref_id}</div>
                        )}
                        <div className="text-[9px] text-gray-600">{new Date(item.created_at).toLocaleString('pt-BR')}</div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Detalhes */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sticky top-4 self-start max-h-[calc(100vh-80px)] overflow-y-auto">
                {selecionado ? (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold text-sm">Detalhes</h3>
                      <button onClick={() => setSelecionado(null)} className="text-gray-500 hover:text-white">✕</button>
                    </div>
                    <div className="space-y-2 text-xs">
                      <div><span className="text-gray-500">ID:</span> <span className="text-white font-mono">{selecionado.id}</span></div>
                      <div><span className="text-gray-500">Origem:</span> <span className="text-white">{selecionado.origem}</span></div>
                      <div><span className="text-gray-500">Evento:</span> <span className="text-white">{selecionado.event}</span></div>
                      <div><span className="text-gray-500">Ref:</span> <span className="text-white font-mono">{selecionado.ref_id}</span></div>
                      <div><span className="text-gray-500">Processado:</span> <span className={selecionado.processed ? 'text-green-400' : 'text-amber-400'}>{selecionado.processed ? 'sim' : 'pendente'}</span></div>
                      <div><span className="text-gray-500">Quando:</span> <span className="text-white">{new Date(selecionado.created_at).toLocaleString('pt-BR')}</span></div>
                      {selecionado.error && (
                        <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400">
                          <div className="font-bold text-[10px] uppercase mb-1">Erro</div>
                          <div className="font-mono text-[11px]">{selecionado.error}</div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className="text-[10px] uppercase text-gray-500 font-bold mb-2">Payload</div>
                      <pre className="bg-black/40 border border-gray-800 rounded-lg p-3 text-[10px] text-gray-300 font-mono overflow-auto max-h-96">
{JSON.stringify(selecionado.payload, null, 2)}
                      </pre>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-600 text-sm">
                    Clique num webhook pra ver detalhes
                  </div>
                )}
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
