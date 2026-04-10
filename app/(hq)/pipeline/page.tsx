'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import React from 'react'

interface Problema {
  texto: string
  nivel: 'critica' | 'alta' | 'media' | 'ok'
}

interface ClientePipeline {
  id: string
  nome: string
  fase: string
  subfase: string
  score_total: number
  dias_na_etapa: number
  sla_estourado: boolean
  cs_responsavel: string
  problema: Problema
  proxima_acao: string
}

type PipelineData = Record<string, ClientePipeline[]>

const FASE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  onboarding: { label: 'Onboarding', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  adocao: { label: 'Adocao', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  escala: { label: 'Escala', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
}

function getCardBorder(cliente: ClientePipeline): string {
  if (cliente.sla_estourado) return 'border-red-500'
  if (cliente.score_total >= 80) return 'border-green-500/50'
  if (cliente.score_total >= 60) return 'border-yellow-500/50'
  return 'border-red-500/50'
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-yellow-400'
  return 'text-red-400'
}

function getInitials(nome: string): string {
  return nome.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineData>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/hq/pipeline')
      .then(r => r.json())
      .then(data => { setPipeline(data.pipeline || {}); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const fases = ['onboarding', 'adocao', 'escala']

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-4 md:p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-white text-xl md:text-2xl font-bold truncate">Pipeline D0-D90</h1>
          <p className="text-gray-400 text-sm mt-1">Jornada de sucesso dos clientes</p>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-20">Carregando pipeline...</p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 160px)' }}>
            {fases.map(fase => {
              const config = FASE_CONFIG[fase]
              const clientes = pipeline[fase] || []
              return (
                <div key={fase} className="flex-1 min-w-[340px]">
                  <div className={`${config.bg} border ${config.border} rounded-xl p-3 mb-3 flex items-center justify-between`}>
                    <h2 className={`${config.color} font-bold text-sm`}>{config.label}</h2>
                    <Badge variant="outline" className={`${config.color} border-current text-[10px]`}>
                      {clientes.length}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {clientes.map(cliente => (
                      <div
                        key={cliente.id}
                        className={`bg-gray-900 border-2 ${getCardBorder(cliente)} rounded-xl p-4 transition hover:bg-gray-800/80`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center text-xs font-bold ${config.color}`}>
                            {getInitials(cliente.nome)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-sm font-semibold truncate">{cliente.nome}</p>
                            <p className="text-gray-500 text-[10px]">{cliente.subfase}</p>
                          </div>
                          <Badge variant="outline" className="text-gray-400 border-gray-700 text-[10px]">
                            D{cliente.dias_na_etapa}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold ${getScoreColor(cliente.score_total)}`}>
                            {cliente.score_total}
                          </span>
                          <Progress
                            value={cliente.score_total}
                            className="h-1.5 flex-1 bg-gray-800"
                          />
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {cliente.sla_estourado && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[9px] px-1.5">
                              SLA Estourado
                            </Badge>
                          )}
                          {cliente.problema.nivel === 'critica' && (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[9px] px-1.5">
                              {cliente.problema.texto}
                            </Badge>
                          )}
                          {cliente.problema.nivel === 'alta' && (
                            <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20 text-[9px] px-1.5">
                              {cliente.problema.texto}
                            </Badge>
                          )}
                        </div>

                        <p className="text-amber-400 text-[11px] font-medium mb-2">→ {cliente.proxima_acao}</p>

                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 text-[10px]">CS: {cliente.cs_responsavel}</span>
                        </div>
                      </div>
                    ))}

                    {clientes.length === 0 && (
                      <div className="text-center py-10">
                        <p className="text-gray-600 text-xs">Nenhum cliente nesta fase</p>
                      </div>
                    )}
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
