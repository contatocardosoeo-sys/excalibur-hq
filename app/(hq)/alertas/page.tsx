'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'
import React from 'react'

interface Alerta {
  id: string
  tipo: string
  prioridade: 'critica' | 'alta' | 'media' | 'baixa'
  cliente_nome: string
  cliente_id: string
  descricao: string
  acao_sugerida: string
  status: string
  responsavel: string
  created_at: string
}

const PRIORIDADE_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  critica: { label: 'Critica', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  alta: { label: 'Alta', bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  media: { label: 'Media', bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  baixa: { label: 'Baixa', bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
}

function tempoDesde(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export default function AlertasPage() {
  const router = useRouter()
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [prioridadeFilter, setPrioridadeFilter] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [responsavelFilter, setResponsavelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchAlertas = useCallback(() => {
    const params = new URLSearchParams()
    if (prioridadeFilter) params.set('prioridade', prioridadeFilter)
    if (tipoFilter) params.set('tipo', tipoFilter)
    if (responsavelFilter) params.set('responsavel', responsavelFilter)
    if (statusFilter) params.set('status', statusFilter)

    fetch(`/api/hq/alertas?${params.toString()}`)
      .then(r => r.json())
      .then(data => { setAlertas(data.alertas || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [prioridadeFilter, tipoFilter, responsavelFilter, statusFilter])

  useEffect(() => {
    fetchAlertas()
  }, [fetchAlertas])

  const handleAction = async (id: string, action: 'assumir' | 'resolver' | 'escalar') => {
    const statusMap: Record<string, string> = {
      assumir: 'em_andamento',
      resolver: 'resolvido',
      escalar: 'escalado',
    }

    await fetch('/api/hq/alertas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: statusMap[action] }),
    })

    fetchAlertas()
  }

  const tipoOptions = [...new Set(alertas.map(a => a.tipo).filter(Boolean))]
  const responsavelOptions = [...new Set(alertas.map(a => a.responsavel).filter(Boolean))]

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-auto min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-white text-xl md:text-2xl font-bold truncate">Alertas</h1>
            <p className="text-gray-400 text-sm mt-1">{alertas.length} alertas ativos</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <select
            value={prioridadeFilter}
            onChange={e => setPrioridadeFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todas prioridades</option>
            <option value="critica">Critica</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baixa">Baixa</option>
          </select>
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todos os tipos</option>
            {tipoOptions.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            value={responsavelFilter}
            onChange={e => setResponsavelFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todos responsaveis</option>
            {responsavelOptions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todos status</option>
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="escalado">Escalado</option>
          </select>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-20">Carregando alertas...</p>
        ) : alertas.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500">Nenhum alerta encontrado</p>
            <p className="text-gray-600 text-sm mt-1">Todos os sistemas estao operando normalmente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alertas.map(alerta => {
              const config = PRIORIDADE_CONFIG[alerta.prioridade] || PRIORIDADE_CONFIG.media
              return (
                <div
                  key={alerta.id}
                  onClick={() => alerta.cliente_id && router.push(`/clientes/${alerta.cliente_id}?alerta=${alerta.id}`)}
                  className={`bg-gray-900 border ${config.border} rounded-xl p-5 transition hover:bg-gray-800/50 cursor-pointer`}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-2 shrink-0">
                      <Badge className={`${config.bg} ${config.text} border ${config.border} text-[10px] px-2`}>
                        {config.label}
                      </Badge>
                      <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px] px-2">
                        {alerta.tipo}
                      </Badge>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-white text-sm font-semibold hover:text-amber-400 transition">{alerta.cliente_nome}</span>
                        <span className="text-gray-600 text-[10px]">ha {tempoDesde(alerta.created_at)}</span>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">{alerta.descricao}</p>
                      <p className="text-amber-400 text-xs font-medium">→ {alerta.acao_sugerida}</p>
                      {alerta.responsavel && (
                        <p className="text-gray-500 text-[10px] mt-2">Responsavel: {alerta.responsavel}</p>
                      )}
                    </div>

                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {alerta.status === 'aberto' && (
                        <React.Fragment>
                          <button
                            onClick={e => { e.stopPropagation(); handleAction(alerta.id, 'assumir') }}
                            className="bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:bg-amber-500/30 transition"
                          >
                            Assumir
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleAction(alerta.id, 'escalar') }}
                            className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:bg-red-500/30 transition"
                          >
                            Escalar
                          </button>
                        </React.Fragment>
                      )}
                      {alerta.status === 'em_andamento' && (
                        <button
                          onClick={e => { e.stopPropagation(); handleAction(alerta.id, 'resolver') }}
                          className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg px-3 py-1.5 text-[11px] font-medium hover:bg-green-500/30 transition"
                        >
                          Resolver
                        </button>
                      )}
                      {alerta.status === 'resolvido' && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
                          Resolvido
                        </Badge>
                      )}
                      {alerta.status === 'escalado' && (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                          Escalado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
