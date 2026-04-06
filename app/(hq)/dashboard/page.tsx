'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'

function fmt(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v) }

export default function DashboardHQ() {
  const [clinicas, setClinicas] = useState(0)
  const [leads, setLeads] = useState(0)
  const [receita, setReceita] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('clinicas').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('propostas').select('valor_total,status'),
    ]).then(([c, l, p]) => {
      setClinicas(c.count || 0)
      setLeads(l.count || 0)
      if (p.data) setReceita(p.data.filter((x: { status: string }) => x.status === 'pago').reduce((s: number, x: { valor_total: number }) => s + Number(x.valor_total), 0))
      setLoading(false)
    })
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <Sidebar />
      <div className="flex-1 p-8 overflow-auto">
        <h1 className="text-white text-2xl font-bold mb-1">Dashboard Executivo</h1>
        <p className="text-gray-400 text-sm mb-6">Visão geral da empresa Excalibur</p>

        {loading ? <p className="text-gray-500 text-center py-20">Carregando...</p> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <Kpi label="Clínicas Ativas" valor={String(clinicas)} sub="clientes" cor="text-amber-400" />
              <Kpi label="MRR Estimado" valor={fmt(clinicas * 497)} sub="R$497/clínica" cor="text-green-400" />
              <Kpi label="Total Leads" valor={String(leads)} sub="todas as clínicas" cor="text-blue-400" />
              <Kpi label="Receita Clínicas" valor={fmt(receita)} sub="propostas pagas" cor="text-green-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Métricas da Empresa</h3>
                <div className="space-y-3">
                  <MetricaBar label="Churn Rate" valor={2} meta={5} cor="bg-green-500" invertido />
                  <MetricaBar label="NPS" valor={72} meta={80} cor="bg-amber-500" />
                  <MetricaBar label="Onboarding D0-D7" valor={85} meta={90} cor="bg-blue-500" />
                  <MetricaBar label="Health Score Médio" valor={68} meta={80} cor="bg-purple-500" />
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold text-sm mb-3">Roadmap Comercial</h3>
                <div className="space-y-2">
                  {[
                    { meta: 'Meta Q2 2026', desc: '10 clínicas ativas', pct: clinicas * 10 },
                    { meta: 'Meta Q3 2026', desc: '30 clínicas + app mobile', pct: clinicas * 3.3 },
                    { meta: 'Meta Q4 2026', desc: '100 clínicas + série A', pct: clinicas },
                  ].map(m => (
                    <div key={m.meta} className="bg-gray-800 rounded-lg p-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-400 font-semibold">{m.meta}</span>
                        <span className="text-gray-400">{Math.min(m.pct, 100).toFixed(0)}%</span>
                      </div>
                      <p className="text-gray-500 text-[10px] mb-2">{m.desc}</p>
                      <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: `${Math.min(m.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
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
