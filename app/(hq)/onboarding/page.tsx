'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface Clinica {
  nome: string
}

interface OnboardingSession {
  id: string
  clinica_id: string
  cs_responsavel: string
  step_atual: number
  status: 'em_andamento' | 'concluido' | 'abandonado'
  created_at: string
  clinicas: Clinica | null
}

interface KpiData {
  emAndamento: number
  concluidosMes: number
  abandonados: number
  taxaConclusao: number
}

function relativeDate(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return `${diffDays} dias atrás`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`
  return `${Math.floor(diffDays / 30)} mês(es) atrás`
}

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  em_andamento: { label: 'Em andamento', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  concluido: { label: 'Concluído', bg: 'bg-green-500/10', text: 'text-green-400' },
  abandonado: { label: 'Abandonado', bg: 'bg-red-500/10', text: 'text-red-400' },
}

export default function OnboardingPage() {
  const [sessions, setSessions] = useState<OnboardingSession[]>([])
  const [kpis, setKpis] = useState<KpiData>({ emAndamento: 0, concluidosMes: 0, abandonados: 0, taxaConclusao: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase
        .from('onboarding_sessions')
        .select('*, clinicas(nome)')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Erro ao buscar onboarding:', error)
        setLoading(false)
        return
      }

      const rows = (data || []) as OnboardingSession[]
      setSessions(rows)

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

      const emAndamento = rows.filter(s => s.status === 'em_andamento').length
      const concluidosMes = rows.filter(s => s.status === 'concluido' && s.created_at >= startOfMonth).length
      const abandonados = rows.filter(s => s.status === 'abandonado').length
      const total = rows.length
      const concluidos = rows.filter(s => s.status === 'concluido').length
      const taxaConclusao = total > 0 ? Math.round((concluidos / total) * 100) : 0

      setKpis({ emAndamento, concluidosMes, abandonados, taxaConclusao })
      setLoading(false)
    }

    fetchData()
  }, [])

  return (
    <div className="flex-1 p-4 md:p-8 overflow-auto min-w-0">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <span>⚔️</span>
        <span>/</span>
        <span className="text-gray-300">Onboarding</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding de Clientes</h1>
          <p className="text-gray-400 text-sm mt-1">Acompanhe a jornada de ativação de cada clínica</p>
        </div>
        <Link
          href="/onboarding/novo"
          className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          + Novo Cliente
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center py-20">Carregando...</p>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Em Andamento"
              value={kpis.emAndamento}
              icon="🔄"
              color="text-amber-400"
              bgIcon="bg-amber-500/10"
            />
            <KpiCard
              label="Concluídos (mês)"
              value={kpis.concluidosMes}
              icon="✅"
              color="text-green-400"
              bgIcon="bg-green-500/10"
            />
            <KpiCard
              label="Abandonados"
              value={kpis.abandonados}
              icon="⛔"
              color="text-red-400"
              bgIcon="bg-red-500/10"
            />
            <KpiCard
              label="Taxa de Conclusão"
              value={`${kpis.taxaConclusao}%`}
              icon="📊"
              color="text-blue-400"
              bgIcon="bg-blue-500/10"
            />
          </div>

          {/* Table */}
          {sessions.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-12 text-center">
              <p className="text-gray-500 text-lg mb-2">Nenhum onboarding em andamento.</p>
              <p className="text-gray-600 text-sm">
                Clique em{' '}
                <Link href="/onboarding/novo" className="text-amber-400 hover:underline">
                  &apos;+ Novo Cliente&apos;
                </Link>{' '}
                para começar.
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-left">
                    <th className="px-5 py-3 font-medium">Clínica</th>
                    <th className="px-5 py-3 font-medium">CS Responsável</th>
                    <th className="px-5 py-3 font-medium">Step Atual</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Iniciado</th>
                    <th className="px-5 py-3 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => {
                    const cfg = statusConfig[session.status] || statusConfig.em_andamento
                    const progressPct = (session.step_atual / 5) * 100

                    return (
                      <tr
                        key={session.id}
                        className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-5 py-3 text-white font-medium">
                          {session.clinicas?.nome || '—'}
                        </td>
                        <td className="px-5 py-3 text-gray-300">
                          {session.cs_responsavel || '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300 text-xs whitespace-nowrap">
                              Step {session.step_atual}/5
                            </span>
                            <div className="w-20 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-amber-500 h-full rounded-full transition-all"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`${cfg.bg} ${cfg.text} px-2.5 py-1 rounded-lg text-xs font-medium`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">
                          {relativeDate(session.created_at)}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <Link
                            href={`/onboarding/${session.id}`}
                            className="text-gray-400 hover:text-amber-400 transition-colors"
                            title="Ver detalhes"
                          >
                            👁️
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  color,
  bgIcon,
}: {
  label: string
  value: number | string
  icon: string
  color: string
  bgIcon: string
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-400 text-xs font-medium">{label}</span>
        <span className={`${bgIcon} w-8 h-8 rounded-lg flex items-center justify-center text-sm`}>
          {icon}
        </span>
      </div>
      <p className={`${color} text-2xl font-bold`}>{value}</p>
    </div>
  )
}
