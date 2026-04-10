'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import Skeleton from '../../components/Skeleton'
import EmptyState from '../../components/EmptyState'
import { supabase } from '../../lib/supabase'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'

interface ClienteCompleto {
  id: string
  nome: string
  etapa: string
  dias_na_plataforma: number
  score: number
  classificacao: string
  alertas_ativos: number
  faturamento_mes: number
  cs_responsavel: string
  aviso_previo_dias: number | null
}

interface ListaData {
  clinicas: { id: string; nome: string; aviso_previo_inicio?: string | null }[]
  jornada: { clinica_id: string; etapa: string; dias_na_plataforma: number; cs_responsavel: string }[]
  adocao: { clinica_id: string; score: number; classificacao: string }[]
  alertas: { clinica_id: string }[]
  funil: { clinica_id: string; faturamento: number }[]
}

function calcAvisoDias(inicio: string | null | undefined): number | null {
  if (!inicio) return null
  const fim = new Date(inicio + 'T12:00:00')
  fim.setDate(fim.getDate() + 30)
  return Math.ceil((fim.getTime() - Date.now()) / 86400000)
}

function getInitials(nome: string): string {
  return nome.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400'
  if (score >= 60) return 'text-amber-400'
  return 'text-red-400'
}

function getScoreBg(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

export default function ClientesPage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<ClienteCompleto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [scoreFilter, setScoreFilter] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        const { data: u } = await supabase.from('usuarios_internos').select('roles, role').eq('email', session.user.email).single()
        const roles: string[] = (u?.roles && Array.isArray(u.roles) && u.roles.length > 0) ? u.roles : [u?.role || '']
        setIsAdmin(roles.includes('admin'))
      }
    })()
  }, [])

  const load = useCallback(async () => {
    setLoading(true)

    const res = await fetch('/api/cs/lista')
    const data: ListaData = await res.json()

    const clinicasList = data.clinicas || []
    const jornadaData = data.jornada || []
    const adocaoData = data.adocao || []
    const alertasData = data.alertas || []
    const funilData = data.funil || []

    const result: ClienteCompleto[] = clinicasList.map(c => {
      const jornada = jornadaData.find(j => j.clinica_id === c.id)
      const adocao = adocaoData.find(a => a.clinica_id === c.id)
      const alertasCount = alertasData.filter(a => a.clinica_id === c.id).length
      const fat = funilData.filter(f => f.clinica_id === c.id).reduce((s, d) => s + Number(d.faturamento || 0), 0)

      return {
        id: c.id,
        nome: c.nome,
        etapa: jornada?.etapa ?? 'N/A',
        dias_na_plataforma: jornada?.dias_na_plataforma ?? 0,
        score: adocao?.score ?? 0,
        classificacao: adocao?.classificacao ?? 'RISCO',
        alertas_ativos: alertasCount,
        faturamento_mes: fat,
        cs_responsavel: jornada?.cs_responsavel ?? '-',
        aviso_previo_dias: calcAvisoDias(c.aviso_previo_inicio),
      }
    })

    // Ordenar: risco primeiro, depois atencao, depois saudavel
    result.sort((a, b) => {
      if (a.score < 60 && b.score >= 60) return -1
      if (b.score < 60 && a.score >= 60) return 1
      if (a.alertas_ativos > b.alertas_ativos) return -1
      if (b.alertas_ativos > a.alertas_ativos) return 1
      return a.score - b.score
    })

    setClientes(result)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const deletarCliente = async (e: React.MouseEvent, id: string, nome: string) => {
    e.stopPropagation()
    if (!confirm(`Deletar permanentemente a clinica "${nome}"? Todos os dados relacionados (jornada, tarefas, alertas, funil) serao apagados.`)) return
    setDeletando(id)
    const res = await fetch(`/api/clientes/${id}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Erro ao deletar: ' + (err.error || 'desconhecido'))
    }
    setDeletando(null)
  }

  const filtered = clientes.filter(c => {
    if (search && !c.nome.toLowerCase().includes(search.toLowerCase())) return false
    if (scoreFilter === 'saudavel' && c.score < 80) return false
    if (scoreFilter === 'atencao' && (c.score < 60 || c.score >= 80)) return false
    if (scoreFilter === 'risco' && c.score >= 60) return false
    if (scoreFilter === 'aviso_previo' && c.aviso_previo_dias == null) return false
    return true
  })

  const totalSaudavel = clientes.filter(c => c.score >= 80).length
  const totalAtencao = clientes.filter(c => c.score >= 60 && c.score < 80).length
  const totalRisco = clientes.filter(c => c.score < 60).length
  const totalAvisoPrevio = clientes.filter(c => c.aviso_previo_dias != null).length

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">Clientes</h1>
            <p className="text-gray-400 text-sm mt-1">Visao de todas as clinicas com dados reais</p>
          </div>
          <button onClick={() => {
            const bom = '\uFEFF'
            const csv = bom + ['Nome;Etapa;Dias;Score;Alertas;Faturamento;CS', ...clientes.map(c => [c.nome, c.etapa, c.dias_na_plataforma, c.score, c.alertas_ativos, c.faturamento_mes, c.cs_responsavel].join(';'))].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'clientes.csv'; a.click(); URL.revokeObjectURL(url)
          }} className="bg-gray-800 text-gray-400 border border-gray-700 rounded-lg px-3 py-1.5 text-xs cursor-pointer hover:border-gray-600">📥 CSV</button>
        </div>

        {/* KPIs rapidos */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <p className="text-gray-500 text-[10px] uppercase">Total Ativas</p>
            <p className="text-white text-2xl font-bold">{clientes.length}</p>
          </div>
          <div className="bg-gray-900 border border-green-900/30 rounded-xl p-4 text-center cursor-pointer" onClick={() => setScoreFilter(scoreFilter === 'saudavel' ? '' : 'saudavel')}>
            <p className="text-gray-500 text-[10px] uppercase">Saudaveis (≥80)</p>
            <p className="text-green-400 text-2xl font-bold">{totalSaudavel}</p>
          </div>
          <div className="bg-gray-900 border border-amber-900/30 rounded-xl p-4 text-center cursor-pointer" onClick={() => setScoreFilter(scoreFilter === 'atencao' ? '' : 'atencao')}>
            <p className="text-gray-500 text-[10px] uppercase">Atencao (60-79)</p>
            <p className="text-amber-400 text-2xl font-bold">{totalAtencao}</p>
          </div>
          <div className="bg-gray-900 border border-red-900/30 rounded-xl p-4 text-center cursor-pointer" onClick={() => setScoreFilter(scoreFilter === 'risco' ? '' : 'risco')}>
            <p className="text-gray-500 text-[10px] uppercase">Risco (&lt;60)</p>
            <p className="text-red-400 text-2xl font-bold">{totalRisco}</p>
          </div>
          <div className={`bg-gray-900 border border-red-900/40 rounded-xl p-4 text-center cursor-pointer ${totalAvisoPrevio > 0 ? 'animate-pulse' : ''}`} onClick={() => setScoreFilter(scoreFilter === 'aviso_previo' ? '' : 'aviso_previo')}>
            <p className="text-gray-500 text-[10px] uppercase">⚠️ Aviso Prévio</p>
            <p className="text-red-400 text-2xl font-bold">{totalAvisoPrevio}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50 w-64"
          />
          {scoreFilter && (
            <button onClick={() => setScoreFilter('')} className="text-gray-400 text-xs border border-gray-700 rounded-lg px-3 py-1 hover:border-amber-500/30">
              Limpar filtro: {scoreFilter}
            </button>
          )}
        </div>

        {loading ? (
          <Skeleton variant="rect" height={60} count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon="🏥" title="Nenhum cliente encontrado" description="Ajuste os filtros ou cadastre novos clientes em /onboarding/novo" />
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400 text-xs">Nome</TableHead>
                  <TableHead className="text-gray-400 text-xs">Etapa D0-D90</TableHead>
                  <TableHead className="text-gray-400 text-xs">Dias</TableHead>
                  <TableHead className="text-gray-400 text-xs">Health Score</TableHead>
                  <TableHead className="text-gray-400 text-xs">Aviso prévio</TableHead>
                  <TableHead className="text-gray-400 text-xs">Alertas</TableHead>
                  <TableHead className="text-gray-400 text-xs">Faturamento Mes</TableHead>
                  <TableHead className="text-gray-400 text-xs">CS</TableHead>
                  <TableHead className="text-gray-400 text-xs text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id} onClick={() => router.push(`/clientes/${c.id}`)} className="border-gray-800 hover:bg-gray-800/50 transition cursor-pointer">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold text-amber-400">
                          {getInitials(c.nome)}
                        </div>
                        <span className="text-white text-sm font-medium hover:text-amber-400 transition">{c.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] px-2 ${
                        c.etapa.includes('D0') || c.etapa.includes('D1') || c.etapa.includes('D2') || c.etapa.includes('D3') || c.etapa.includes('D5')
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                          : c.etapa.includes('D7') || c.etapa.includes('D15')
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : c.etapa.includes('D30') || c.etapa.includes('D45') || c.etapa.includes('D60') || c.etapa.includes('D90')
                          ? 'bg-green-500/20 text-green-400 border-green-500/30'
                          : c.etapa === 'RISCO' || c.etapa === 'CRITICO' || c.etapa === 'CHURN'
                          ? 'bg-red-500/20 text-red-400 border-red-500/30'
                          : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                      }`}>
                        {c.etapa.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 text-sm font-mono">{c.dias_na_plataforma}d</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold font-mono w-7 ${getScoreColor(c.score)}`}>{c.score}</span>
                        <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreBg(c.score)}`} style={{ width: `${c.score}%` }} />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {c.aviso_previo_dias != null ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] animate-pulse">
                          ⚠️ {c.aviso_previo_dias > 0 ? `${c.aviso_previo_dias}d` : 'expirado'}
                        </Badge>
                      ) : (
                        <span className="text-gray-700 text-[10px]">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {c.alertas_ativos > 0 ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">
                          {c.alertas_ativos} alerta{c.alertas_ativos > 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <span className="text-green-400 text-[10px]">OK</span>
                      )}
                    </TableCell>
                    <TableCell className="text-amber-400 text-sm font-mono">{fmt(c.faturamento_mes)}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{c.cs_responsavel}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={e => { e.stopPropagation(); router.push(`/clientes/${c.id}`) }}
                          title="Editar"
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-amber-400 transition">
                          ✏️
                        </button>
                        <button onClick={e => { e.stopPropagation(); router.push(`/jornada/${c.id}`) }}
                          title="Ver jornada"
                          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-amber-400 transition">
                          📋
                        </button>
                        {isAdmin && (
                          <button onClick={e => deletarCliente(e, c.id, c.nome)}
                            disabled={deletando === c.id}
                            title="Deletar"
                            className="p-1.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition disabled:opacity-50">
                            {deletando === c.id ? '⏳' : '🗑️'}
                          </button>
                        )}
                      </div>
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
