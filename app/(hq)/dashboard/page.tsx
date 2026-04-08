'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'

interface ClinicaResumo {
  id: string
  nome: string
  faturamento: number
  score: number
  etapa: string
}

interface AlertaPendente {
  id: string
  clinica_id: string
  tipo: string
  nivel: number
  titulo: string
  descricao: string
}

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

export default function DashboardHQ() {
  const [loading, setLoading] = useState(true)
  const [clinicas, setClinicas] = useState(0)
  const [totalFaturamento, setTotalFaturamento] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalFechamentos, setTotalFechamentos] = useState(0)
  const [clinicasResumo, setClinicasResumo] = useState<ClinicaResumo[]>([])
  const [alertas, setAlertas] = useState<AlertaPendente[]>([])
  const [saudaveis, setSaudaveis] = useState(0)
  const [atencao, setAtencao] = useState(0)
  const [risco, setRisco] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const semana = getWeekString(new Date())

    const [clinicasRes, funilRes, adocaoRes, alertasRes, jornadaRes] = await Promise.all([
      supabase.from('clinicas').select('id, nome'),
      supabase.from('funil_diario').select('clinica_id, leads, fechamentos, faturamento').gte('data', inicioMes),
      supabase.from('adocao_clinica').select('clinica_id, score, classificacao').eq('semana', semana),
      supabase.from('alertas_clinica').select('*').eq('resolvido', false).order('nivel', { ascending: false }).limit(10),
      supabase.from('jornada_clinica').select('clinica_id, etapa, dias_na_plataforma'),
    ])

    const clinicasList = clinicasRes.data || []
    setClinicas(clinicasList.length)

    const funilData = funilRes.data || []
    const totalF = funilData.reduce((s, d) => s + Number(d.faturamento || 0), 0)
    const totalL = funilData.reduce((s, d) => s + Number(d.leads || 0), 0)
    const totalFe = funilData.reduce((s, d) => s + Number(d.fechamentos || 0), 0)
    setTotalFaturamento(totalF)
    setTotalLeads(totalL)
    setTotalFechamentos(totalFe)

    const adocaoData = adocaoRes.data || []
    const jornadaData = jornadaRes.data || []

    let sCount = 0, aCount = 0, rCount = 0
    const resumo: ClinicaResumo[] = clinicasList.map(c => {
      const adocao = adocaoData.find(a => a.clinica_id === c.id)
      const jornada = jornadaData.find(j => j.clinica_id === c.id)
      const fat = funilData.filter(f => f.clinica_id === c.id).reduce((s, d) => s + Number(d.faturamento || 0), 0)
      const score = adocao?.score ?? 0
      if (score >= 80) sCount++
      else if (score >= 60) aCount++
      else rCount++
      return { id: c.id, nome: c.nome, faturamento: fat, score, etapa: jornada?.etapa ?? 'N/A' }
    })

    setSaudaveis(sCount)
    setAtencao(aCount)
    setRisco(rCount)
    setClinicasResumo(resumo.sort((a, b) => b.faturamento - a.faturamento))
    setAlertas((alertasRes.data || []) as AlertaPendente[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const resolverAlerta = async (id: string) => {
    await supabase.from('alertas_clinica').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', id)
    setAlertas(prev => prev.filter(a => a.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-white text-2xl font-bold mb-1">Dashboard Executivo</h1>
        <p className="text-gray-400 text-sm mb-6">Visao consolidada de todas as clinicas — dados reais do mes</p>

        {loading ? <p className="text-gray-500 text-center py-20">Carregando...</p> : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Kpi label="Faturamento Total" valor={fmt(totalFaturamento)} sub="no mes" cor="text-green-400" />
              <Kpi label="Total Leads" valor={String(totalLeads)} sub="todas clinicas" cor="text-blue-400" />
              <Kpi label="Fechamentos" valor={String(totalFechamentos)} sub="contratos" cor="text-amber-400" />
              <Kpi label="MRR Estimado" valor={fmt(clinicas * 497)} sub={`${clinicas} clinicas ativas`} cor="text-purple-400" />
            </div>

            {/* Health Overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Total Clinicas</p>
                <p className="text-white text-2xl font-bold">{clinicas}</p>
              </div>
              <div className="bg-gray-900 border border-green-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Saudaveis (≥80)</p>
                <p className="text-green-400 text-2xl font-bold">{saudaveis}</p>
              </div>
              <div className="bg-gray-900 border border-amber-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Atencao (60-79)</p>
                <p className="text-amber-400 text-2xl font-bold">{atencao}</p>
              </div>
              <div className="bg-gray-900 border border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-500 text-[10px] uppercase">Risco (&lt;60)</p>
                <p className="text-red-400 text-2xl font-bold">{risco}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Faturamento por clinica */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">Faturamento por Clinica</h3>
                {clinicasResumo.length === 0 ? (
                  <p className="text-gray-500 text-sm">Sem dados</p>
                ) : (
                  <div className="space-y-3">
                    {clinicasResumo.slice(0, 8).map(c => {
                      const max = clinicasResumo[0]?.faturamento || 1
                      const pct = Math.max(4, (c.faturamento / max) * 100)
                      const scoreColor = c.score >= 80 ? 'text-green-400' : c.score >= 60 ? 'text-amber-400' : 'text-red-400'
                      return (
                        <div key={c.id}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-300 truncate max-w-[200px]">{c.nome}</span>
                            <div className="flex items-center gap-3">
                              <span className={`${scoreColor} text-[10px] font-mono`}>Score {c.score}</span>
                              <span className="text-amber-400 font-mono">{fmt(c.faturamento)}</span>
                            </div>
                          </div>
                          <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Alertas criticos */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-4">
                  Alertas Pendentes
                  {alertas.length > 0 && (
                    <span className="ml-2 bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full">{alertas.length}</span>
                  )}
                </h3>
                {alertas.length === 0 ? (
                  <p className="text-green-400 text-sm">Nenhum alerta pendente</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {alertas.map(a => (
                      <div key={a.id} className={`rounded-lg p-3 flex items-start gap-3 ${
                        a.nivel === 3 ? 'bg-red-500/10 border border-red-500/20' :
                        a.nivel === 2 ? 'bg-amber-500/10 border border-amber-500/20' :
                        'bg-blue-500/10 border border-blue-500/20'
                      }`}>
                        <span className="text-sm mt-0.5">{a.nivel === 3 ? '🔴' : a.nivel === 2 ? '🟡' : '🔵'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium">{a.titulo}</p>
                          {a.descricao && <p className="text-gray-400 text-[10px] mt-0.5">{a.descricao}</p>}
                        </div>
                        <button
                          onClick={() => resolverAlerta(a.id)}
                          className="text-gray-500 hover:text-green-400 text-[10px] border border-gray-700 rounded px-2 py-0.5 hover:border-green-500/30 transition shrink-0"
                        >
                          Resolver
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metricas */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold text-sm mb-3">Metricas da Empresa</h3>
              <div className="space-y-3">
                <MetricaBar label="Churn Rate" valor={2} meta={5} cor="bg-green-500" invertido />
                <MetricaBar label="NPS" valor={72} meta={80} cor="bg-amber-500" />
                <MetricaBar label="Onboarding D0-D7" valor={85} meta={90} cor="bg-blue-500" />
                <MetricaBar label="Health Score Medio" valor={clinicasResumo.length > 0 ? Math.round(clinicasResumo.reduce((s, c) => s + c.score, 0) / clinicasResumo.length) : 0} meta={80} cor="bg-purple-500" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Kpi({ label, valor, sub, cor }: { label: string; valor: string; sub: string; cor: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
      <p className="text-gray-600 text-[10px] mt-1">{sub}</p>
    </div>
  )
}

function MetricaBar({ label, valor, meta, cor, invertido }: { label: string; valor: number; meta: number; cor: string; invertido?: boolean }) {
  const bom = invertido ? valor <= meta : valor >= meta
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-300">{label}</span>
        <span className={bom ? 'text-green-400' : 'text-amber-400'}>{valor}% {bom ? '✓' : `(meta: ${meta}%)`}</span>
      </div>
      <div className="bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className={`${cor} h-full`} style={{ width: `${Math.min(valor, 100)}%` }} />
      </div>
    </div>
  )
}

function getWeekString(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7)
  const week1 = new Date(d.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  return `${d.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`
}
