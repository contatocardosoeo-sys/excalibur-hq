'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Evento = {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  usuario_nome: string | null
  valor: number | null
  camada: string
  roles_visibilidade: string[]
  metadata: Record<string, unknown>
  created_at: string
}

const CAMADA_LABEL: Record<string, string> = {
  todos: '👥 Time todo',
  sdr_closer: '🔗 SDR + Closer',
  closer_cs: '🔗 Closer + CS',
  trafego_sdr: '🔗 Tráfego + SDR',
  ceo_financeiro: '💰 CEO + Fin',
  ceo_setor: '⚠️ CEO + Setor',
  privado: '👤 Privado',
}

const CAMADA_COR: Record<string, string> = {
  todos: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  sdr_closer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  closer_cs: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  trafego_sdr: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  ceo_financeiro: 'bg-green-500/20 text-green-400 border-green-500/30',
  ceo_setor: 'bg-red-500/20 text-red-400 border-red-500/30',
  privado: 'bg-gray-700 text-gray-400 border-gray-600',
}

const EMOJI_TIPO: Record<string, string> = {
  venda_fechada: '🔔', marco_d7: '🏁', marco_d30: '🎖️', nova_clinica_ativa: '🏥',
  meta_mensal_sdr: '🏅', meta_empresa: '🎯', agendamento_meta: '🎯',
  agendamento: '📅', comparecimento: '🤝', reuniao_concluida: '✅',
  cliente_handoff: '🔄', lead_chegou: '📥', lote_leads: '📦',
  pagamento_recebido: '💰', folha_paga: '👥', recorde_mrr: '🚀', meta_mrr: '💎',
  pagamento_atrasado: '⚠️', caixa_critico: '💸',
  gargalo_trafego: '⚠️', cliente_risco: '🚨', sdr_sem_leads: '📭', cac_alto: '📈',
  lead_recebido: '📥', contato_feito: '📞', proposta_enviada: '📋',
  tarefa_concluida: '✅', tarefa_atrasada: '⏰', cpl_otimo: '📉', meta_diaria_sdr: '⚡',
}

function fmt(d: string) {
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtBRL(v: number | null) {
  if (v == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export default function EventosPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)
  const [camadaFilter, setCamadaFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set('limit', '200')
    if (camadaFilter) params.set('camada', camadaFilter)
    if (tipoFilter) params.set('tipo', tipoFilter)
    const res = await fetch(`/api/hq/eventos?${params.toString()}`)
    const data = await res.json()
    setEventos(data.eventos || [])
    setLoading(false)
  }, [camadaFilter, tipoFilter])

  useEffect(() => { load() }, [load])

  // Refresh automático a cada 30s
  useEffect(() => {
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [load])

  const tiposUnicos = Array.from(new Set(eventos.map(e => e.tipo.replace(/_\d+$/, '')))).sort()

  const exportarCSV = () => {
    const bom = '\uFEFF'
    const header = 'Data;Tipo;Titulo;Mensagem;Usuario;Camada;Valor'
    const linhas = eventos.map(e => [
      fmt(e.created_at), e.tipo, e.titulo.replace(/;/g, ','), e.mensagem.replace(/;/g, ','),
      e.usuario_nome || '', e.camada, e.valor ?? ''
    ].join(';'))
    const csv = bom + [header, ...linhas].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eventos-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-auto min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold truncate">⚡ Eventos ao vivo</h1>
            <p className="text-gray-400 text-sm mt-1">Histórico das últimas 200 notificações do sistema — refresh automático 30s</p>
          </div>
          <button onClick={exportarCSV} className="bg-gray-800 text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5 text-xs hover:border-amber-500/30 hover:text-amber-400 transition">
            📥 Exportar CSV
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select
            value={camadaFilter}
            onChange={e => setCamadaFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todas camadas</option>
            {Object.entries(CAMADA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todos os tipos</option>
            {tiposUnicos.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
          </select>
          {(camadaFilter || tipoFilter) && (
            <button onClick={() => { setCamadaFilter(''); setTipoFilter('') }} className="text-gray-400 text-xs border border-gray-700 rounded-lg px-3 py-1 hover:border-amber-500/30">
              Limpar filtros
            </button>
          )}
        </div>

        {/* KPI cards rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 mb-6">
          {Object.entries(CAMADA_LABEL).slice(0, 5).map(([k, v]) => {
            const qtd = eventos.filter(e => e.camada === k).length
            return (
              <div key={k} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">{v.replace(/^[^ ]+ /, '')}</p>
                <p className="text-white text-xl md:text-2xl font-bold truncate">{qtd}</p>
              </div>
            )
          })}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0,1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />)}
          </div>
        ) : eventos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Nenhum evento registrado ainda</p>
            <p className="text-gray-600 text-sm mt-1">Os eventos aparecem aqui assim que forem disparados</p>
          </div>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-950 border-b border-gray-800">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Quando</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Tipo</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Título</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Mensagem</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Usuário</th>
                  <th className="text-left px-4 py-3 text-gray-400 text-xs font-medium">Camada</th>
                  <th className="text-right px-4 py-3 text-gray-400 text-xs font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {eventos.map(e => {
                  const tipoBase = e.tipo.replace(/_\d+$/, '')
                  const emoji = EMOJI_TIPO[tipoBase] || '⚡'
                  return (
                    <tr key={e.id} className="border-b border-gray-800/60 hover:bg-gray-800/30 transition">
                      <td className="px-4 py-2.5 text-gray-500 text-xs font-mono whitespace-nowrap">{fmt(e.created_at)}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs"><span className="text-base mr-1">{emoji}</span>{tipoBase.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-2.5 text-white text-xs font-semibold">{e.titulo}</td>
                      <td className="px-4 py-2.5 text-gray-300 text-xs max-w-md truncate" title={e.mensagem}>{e.mensagem}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{e.usuario_nome || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${CAMADA_COR[e.camada] || 'border-gray-700 text-gray-400'}`}>
                          {CAMADA_LABEL[e.camada] || e.camada}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-amber-400 text-xs font-mono text-right whitespace-nowrap">{fmtBRL(e.valor)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
