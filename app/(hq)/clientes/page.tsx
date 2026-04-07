'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import React from 'react'

interface Problema {
  texto: string
  nivel: 'critica' | 'alta' | 'media' | 'ok'
}

interface ClienteHQ {
  id: string
  nome: string
  fase: string
  subfase: string
  score_total: number
  dias_na_etapa: number
  sla_estourado: boolean
  cs_responsavel: string
  ultimo_contato: string
  status: string
  problema: Problema
  proxima_acao: string
}

const FASE_BADGE: Record<string, string> = {
  onboarding: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  adocao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  escala: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const PROBLEMA_COR: Record<string, string> = {
  critica: 'text-red-400',
  alta: 'text-orange-400',
  media: 'text-yellow-400',
  ok: 'text-green-400',
}

function getInitials(nome: string): string {
  return nome.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<ClienteHQ[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [faseFilter, setFaseFilter] = useState('')
  const [csFilter, setCsFilter] = useState('')

  useEffect(() => {
    const params = new URLSearchParams()
    if (faseFilter) params.set('fase', faseFilter)
    if (csFilter) params.set('cs', csFilter)

    fetch(`/api/hq/clientes?${params.toString()}`)
      .then(r => r.json())
      .then(data => { setClientes(data.clientes || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [faseFilter, csFilter])

  const csOptions = [...new Set(clientes.map(c => c.cs_responsavel).filter(Boolean))]

  const filtered = clientes.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Clientes</h1>
            <p className="text-gray-400 text-sm mt-1">{filtered.length} clientes encontrados</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 w-64"
          />
          <select
            value={faseFilter}
            onChange={e => setFaseFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todas as fases</option>
            <option value="onboarding">Onboarding</option>
            <option value="adocao">Adocao</option>
            <option value="escala">Escala</option>
          </select>
          <select
            value={csFilter}
            onChange={e => setCsFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500/50"
          >
            <option value="">Todos os CS</option>
            {csOptions.map(cs => (
              <option key={cs} value={cs}>{cs}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-gray-500 text-center py-20">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-20">Nenhum cliente encontrado</p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 text-xs">Nome</TableHead>
                  <TableHead className="text-gray-400 text-xs">Fase</TableHead>
                  <TableHead className="text-gray-400 text-xs">Score</TableHead>
                  <TableHead className="text-gray-400 text-xs">CS</TableHead>
                  <TableHead className="text-gray-400 text-xs">Ultimo Contato</TableHead>
                  <TableHead className="text-gray-400 text-xs">Proxima Acao</TableHead>
                  <TableHead className="text-gray-400 text-xs">Problema</TableHead>
                  <TableHead className="text-gray-400 text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cliente => (
                  <TableRow key={cliente.id} className="border-gray-800 hover:bg-gray-800/50 transition">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-400">
                          {getInitials(cliente.nome)}
                        </div>
                        <span className="text-white text-sm font-medium">{cliente.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${FASE_BADGE[cliente.fase] || FASE_BADGE.onboarding} text-[10px] px-2`}>
                        {cliente.fase}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-mono w-7">{cliente.score_total}</span>
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${getScoreColor(cliente.score_total)}`}
                            style={{ width: `${cliente.score_total}%` }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm">{cliente.cs_responsavel}</TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {cliente.ultimo_contato
                        ? new Date(cliente.ultimo_contato).toLocaleDateString('pt-BR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="text-amber-400 text-xs">{cliente.proxima_acao}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs ${PROBLEMA_COR[cliente.problema.nivel] || 'text-gray-400'}`}>
                        {cliente.problema.texto}
                      </span>
                    </TableCell>
                    <TableCell>
                      {cliente.sla_estourado ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">SLA Estourado</Badge>
                      ) : cliente.status === 'ativo' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">Ativo</Badge>
                      ) : (
                        <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[10px]">{cliente.status || 'Inativo'}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
