'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

const COR: Record<string, { bg: string; text: string; solid: string }> = {
  verde: { bg: 'bg-green-500/10', text: 'text-green-400', solid: 'bg-green-500' },
  amarelo: { bg: 'bg-amber-500/10', text: 'text-amber-400', solid: 'bg-amber-500' },
  vermelho: { bg: 'bg-red-500/10', text: 'text-red-400', solid: 'bg-red-500' },
  neutro: { bg: 'bg-gray-500/10', text: 'text-gray-400', solid: 'bg-gray-500' },
}

interface Gargalo { etapa: string; severidade: string; atual: number; meta: number; diferenca: number; mensagem: string }
interface Impacto { agendamentos_esperados: number; agendamentos_perdidos: number; reunioes_esperadas: number; reunioes_perdidas: number; fechamentos_esperados: number; fechamentos_perdidos: number; faturamento_perdido: number; cac_ideal: number; cac_inflado_em: number }
interface Meta { tipo: string; nome: string; faturamento_meta: number; vendas_meta: number; reunioes_meta: number; agendamentos_meta: number; leads_meta: number; leads_dia: number; agendamentos_dia: number; reunioes_dia: number; vendas_dia: number }
interface Dados { leads: number; agendamentos: number; reunioes_realizadas: number; reunioes_qualificadas: number; fechamentos: number; taxa_agendamento: number; taxa_comparecimento: number; taxa_qualificacao: number; taxa_conversao_final: number; cpl: number; cac: number; faturamento: number; investimento: number; custo_agendamento: number; custo_reuniao: number }
interface Baseline { cpl_meta: number; taxa_agendamento_meta: number; taxa_comparecimento_meta: number; taxa_qualificacao_meta: number; taxa_conversao_meta: number; cac_meta: number; ticket_medio: number; reunioes_dia_meta: number; closers: number }
interface Projecao { faturamento_projetado: number; vendas_projetadas: number; meta_atingida: string; dias_restantes: number; falta_para_meta_normal: number; vendas_necessarias_restantes: number }
interface ApiResp { dados: Dados; baseline: Baseline; cores: Record<string, string>; gargalos: Gargalo[]; impacto: Impacto; resumo: string; metas: Meta[]; projecao_mes: Projecao }

function fmt(v: number): string { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: Date): string { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }

// ─── DATE PICKER ────────────────────────────────────────────────────
function DateFilter({ dateFrom, dateTo, onChange }: { dateFrom: Date; dateTo: Date; onChange: (from: Date, to: Date, label: string) => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('Este mes')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const presets = [
    { label: 'Hoje', fn: () => { const t = new Date(); return [t, t] as [Date, Date] } },
    { label: 'Ontem', fn: () => { const t = new Date(); t.setDate(t.getDate() - 1); return [t, t] as [Date, Date] } },
    { label: 'Ultimos 7 dias', fn: () => { const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 6); return [f, t] as [Date, Date] } },
    { label: 'Ultimos 14 dias', fn: () => { const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 13); return [f, t] as [Date, Date] } },
    { label: 'Ultimos 30 dias', fn: () => { const t = new Date(); const f = new Date(); f.setDate(f.getDate() - 29); return [f, t] as [Date, Date] } },
    { label: 'Este mes', fn: () => { const t = new Date(); const f = new Date(t.getFullYear(), t.getMonth(), 1); return [f, t] as [Date, Date] } },
    { label: 'Mes passado', fn: () => { const t = new Date(); const f = new Date(t.getFullYear(), t.getMonth() - 1, 1); const l = new Date(t.getFullYear(), t.getMonth(), 0); return [f, l] as [Date, Date] } },
    { label: 'Este ano', fn: () => { const t = new Date(); const f = new Date(t.getFullYear(), 0, 1); return [f, t] as [Date, Date] } },
  ]

  function applyPreset(p: typeof presets[0]) { const [f, t] = p.fn(); setLabel(p.label); onChange(f, t, p.label); setOpen(false) }
  function applyCustom() {
    if (customFrom && customTo) {
      const f = new Date(customFrom + 'T00:00:00'); const t = new Date(customTo + 'T00:00:00')
      setLabel(`${fmtDate(f)} — ${fmtDate(t)}`); onChange(f, t, 'custom'); setOpen(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white hover:border-amber-500/50 transition">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span>{label}</span>
        <span className="text-gray-500 text-xs">({fmtDate(dateFrom)} — {fmtDate(dateTo)})</span>
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 w-80 overflow-hidden">
          <div className="p-1">
            {presets.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)} className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition ${label === p.label ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-gray-800'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-800 p-4">
            <p className="text-gray-500 text-xs mb-2 font-medium">Periodo personalizado</p>
            <div className="flex gap-2 mb-2">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
            </div>
            <button onClick={applyCustom} className="w-full bg-amber-500 text-gray-950 rounded-lg py-2 text-xs font-bold hover:bg-amber-400 transition">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FUNNEL CHART ───────────────────────────────────────────────────
function FunnelChart({ etapas, taxas, gargalos, faturamento, ticketMedio }: {
  etapas: { label: string; valor: number; pct: number; icon: string }[]
  taxas: { taxa: number; cor: string; etapa: string }[]
  gargalos: Gargalo[]
  faturamento: number
  ticketMedio: number
}) {
  const maxVal = etapas[0]?.valor || 1
  return (
    <div>
      <div className="space-y-0">
        {etapas.map((etapa, i) => {
          const widthPct = Math.max(12, (etapa.valor / maxVal) * 100)
          const taxa = taxas[i - 1]
          const isG = taxa ? gargalos.some(g => g.etapa === taxa.etapa) : false
          const corTaxa = taxa ? (COR[taxa.cor] || COR.neutro) : null
          const isFirst = i === 0
          const isLast = i === etapas.length - 1
          return (
            <div key={etapa.label}>
              {taxa && (
                <div className="flex items-center py-1.5 pl-3">
                  <div className="w-28 shrink-0" />
                  <div className="flex items-center gap-2 ml-1">
                    <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    <span className={`text-sm font-bold ${corTaxa?.text || 'text-gray-400'}`}>{taxa.taxa}%</span>
                    {isG && <Badge className="bg-red-500/20 text-red-400 border-0 text-[9px] py-0">GARGALO</Badge>}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-28 shrink-0 text-right pr-2">
                  <span className="text-xs text-gray-500">{etapa.icon}</span>
                  <p className="text-xs text-gray-300 font-medium leading-tight">{etapa.label}</p>
                </div>
                <div className="flex-1 relative">
                  <div className="relative" style={{ width: `${widthPct}%`, minWidth: '100px' }}>
                    <div
                      className={`h-14 flex items-center justify-between px-4 ${isFirst ? 'bg-gradient-to-r from-amber-500 to-amber-400' : isLast ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-amber-500/70 to-amber-400/50'}`}
                      style={{
                        clipPath: isFirst ? 'polygon(0 0, 100% 4%, 100% 96%, 0 100%)'
                          : isLast ? 'polygon(0 8%, 100% 20%, 100% 80%, 0 92%)'
                          : `polygon(0 ${4 + i * 3}%, 100% ${4 + (i + 1) * 3}%, 100% ${96 - (i + 1) * 3}%, 0 ${96 - i * 3}%)`,
                        borderRadius: isLast ? '0 8px 8px 0' : '0',
                      }}
                    >
                      <span className="text-white font-bold text-lg drop-shadow-sm">{etapa.valor}</span>
                      <span className="text-white/80 text-xs font-medium">{etapa.pct.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-5 pt-4 border-t border-gray-800">
        <div className="flex items-center gap-2 bg-green-500/10 rounded-xl px-4 py-2.5">
          <span className="text-green-400 text-sm">💰</span>
          <div><p className="text-gray-400 text-[10px]">Faturamento</p><p className="text-green-400 font-bold text-lg">{faturamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 rounded-xl px-4 py-2.5">
          <span className="text-amber-400 text-sm">🎫</span>
          <div><p className="text-gray-400 text-[10px]">Ticket Medio</p><p className="text-amber-400 font-bold text-lg">{ticketMedio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
        </div>
        <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-4 py-2.5">
          <span className="text-gray-400 text-sm">📊</span>
          <div><p className="text-gray-400 text-[10px]">Receita/Lead</p><p className="text-white font-bold text-lg">{maxVal > 0 ? (faturamento / maxVal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$0'}</p></div>
        </div>
      </div>
    </div>
  )
}

const TABS = ['Funil Completo', 'Metas', 'Closers', 'Analise'] as const
type Tab = typeof TABS[number]

export default function ComercialPage() {
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Funil Completo')
  const [dateFrom, setDateFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dateTo, setDateTo] = useState(() => new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try { const res = await fetch('/api/hq/funil'); const json = await res.json(); if (json.success) setData(json) } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !data) {
    return (<div className="flex h-screen bg-gray-950"><Sidebar /><main className="flex-1 flex items-center justify-center"><p className="text-gray-500 animate-pulse">Carregando...</p></main></div>)
  }

  const { dados: d, baseline: b, cores, gargalos, impacto, resumo, metas, projecao_mes: proj } = data

  const funilEtapas = [
    { label: 'Leads Recebidos', valor: d.leads, pct: 100, icon: '📥' },
    { label: 'Agendamentos', valor: d.agendamentos, pct: d.leads > 0 ? (d.agendamentos / d.leads) * 100 : 0, icon: '📅' },
    { label: 'Reunioes', valor: d.reunioes_realizadas, pct: d.leads > 0 ? (d.reunioes_realizadas / d.leads) * 100 : 0, icon: '🤝' },
    { label: 'Qualificadas', valor: d.reunioes_qualificadas, pct: d.leads > 0 ? (d.reunioes_qualificadas / d.leads) * 100 : 0, icon: '✅' },
    { label: 'Vendas', valor: d.fechamentos, pct: d.leads > 0 ? (d.fechamentos / d.leads) * 100 : 0, icon: '🏆' },
  ]
  const funilTaxas = [
    { taxa: d.taxa_agendamento, cor: cores.agendamento, etapa: 'agendamento' },
    { taxa: d.taxa_comparecimento, cor: cores.comparecimento, etapa: 'comparecimento' },
    { taxa: d.taxa_qualificacao, cor: cores.qualificacao, etapa: 'qualificacao' },
    { taxa: d.taxa_conversao_final, cor: cores.conversao, etapa: 'conversao' },
  ]

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2"><span className="text-amber-500">⚙️</span> Dashboard Comercial</h1>
              <p className="text-gray-400 text-sm mt-1">Funil B2B completo com analise de gargalos</p>
            </div>
            <div className="flex items-center gap-3">
              <DateFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
              <div className="flex bg-gray-800 rounded-xl p-0.5">
                {TABS.map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${tab === t ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: 'Fechamentos', valor: String(d.fechamentos), sub: `${d.taxa_conversao_final}% conversao`, cor: cores.conversao, icon: '🏆' },
              { label: 'Faturamento', valor: fmt(d.faturamento), sub: `Ticket: ${fmt(b.ticket_medio)}`, cor: 'neutro', icon: '💰' },
              { label: 'CAC', valor: `R$${d.cac}`, sub: `Meta: R$${b.cac_meta}`, cor: cores.cac, icon: '📊' },
              { label: 'Conversao', valor: `${d.taxa_conversao_final}%`, sub: `Meta: ${b.taxa_conversao_meta}%`, cor: cores.conversao, icon: '🎯' },
              { label: 'Reunioes/Dia', valor: '1.0', sub: `Meta: ${b.reunioes_dia_meta}`, cor: 'vermelho', icon: '📅' },
            ].map((kpi) => {
              const c = COR[kpi.cor] || COR.neutro
              return (
                <div key={kpi.label} className={`bg-gray-900 border ${kpi.cor === 'vermelho' ? 'border-red-500/30' : kpi.cor === 'amarelo' ? 'border-amber-500/30' : 'border-gray-800'} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between mb-1"><span className="text-gray-400 text-[11px]">{kpi.label}</span><span className="text-sm">{kpi.icon}</span></div>
                  <p className={`text-xl font-bold ${c.text}`}>{kpi.valor}</p>
                  <p className="text-gray-500 text-[10px] mt-1">{kpi.sub}</p>
                </div>
              )
            })}
          </div>

          {/* TAB: Funil */}
          {tab === 'Funil Completo' && (
            <div className="space-y-4">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-white font-semibold flex items-center gap-2"><span className="text-amber-500">📊</span> Funil de Conversao</h2>
                  <div className="flex items-center gap-4 text-[10px] text-gray-500">
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Meta</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Atencao</div>
                    <div className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Gargalo</div>
                  </div>
                </div>
                <FunnelChart etapas={funilEtapas} taxas={funilTaxas} gargalos={gargalos} faturamento={d.faturamento} ticketMedio={b.ticket_medio} />
              </div>

              {/* Stage detail cards */}
              {[
                { de: 'LEADS', para: 'AGENDAMENTO', deVal: d.leads, paraVal: d.agendamentos, taxa: d.taxa_agendamento, meta: b.taxa_agendamento_meta, cor: cores.agendamento, etapa: 'agendamento' },
                { de: 'AGENDAMENTO', para: 'COMPARECIMENTO', deVal: d.agendamentos, paraVal: d.reunioes_realizadas, taxa: d.taxa_comparecimento, meta: b.taxa_comparecimento_meta, cor: cores.comparecimento, etapa: 'comparecimento' },
                { de: 'REUNIAO', para: 'QUALIFICACAO', deVal: d.reunioes_realizadas, paraVal: d.reunioes_qualificadas, taxa: d.taxa_qualificacao, meta: b.taxa_qualificacao_meta, cor: cores.qualificacao, etapa: 'qualificacao' },
                { de: 'QUALIFICACAO', para: 'VENDA', deVal: d.reunioes_qualificadas, paraVal: d.fechamentos, taxa: d.taxa_conversao_final, meta: b.taxa_conversao_meta, cor: cores.conversao, etapa: 'conversao' },
              ].map((etapa) => {
                const c = COR[etapa.cor] || COR.neutro
                const isG = gargalos.some(g => g.etapa === etapa.etapa)
                const diff = Number((etapa.taxa - etapa.meta).toFixed(2))
                const perdidos = Math.round(etapa.deVal * (etapa.meta / 100)) - etapa.paraVal
                return (
                  <div key={etapa.de + etapa.para} className={`bg-gray-900 border ${isG ? 'border-red-500/30' : 'border-gray-800'} rounded-2xl p-5`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm font-medium">{etapa.de}</span>
                        <span className="text-gray-600">→</span>
                        <span className="text-white text-sm font-semibold">{etapa.para}</span>
                      </div>
                      {isG && <Badge className="bg-red-500/20 text-red-400 border-0 text-[10px]">GARGALO</Badge>}
                      {!isG && etapa.taxa >= etapa.meta && <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">ACIMA DA META</Badge>}
                    </div>
                    <div className="flex items-center gap-6">
                      <p className="text-gray-500 text-xs">{etapa.deVal} → {etapa.paraVal}</p>
                      <div className="flex items-center gap-4">
                        <div><p className="text-gray-500 text-[10px]">Taxa</p><p className={`text-2xl font-bold ${c.text}`}>{etapa.taxa}%</p></div>
                        <div><p className="text-gray-500 text-[10px]">Meta</p><p className="text-gray-400 text-lg">{etapa.meta}%</p></div>
                        <div><p className="text-gray-500 text-[10px]">Dif.</p><p className={`text-sm font-medium ${diff >= 0 ? 'text-green-400' : 'text-red-400'}`}>{diff > 0 ? '+' : ''}{diff}pp</p></div>
                        {perdidos > 0 && <div><p className="text-gray-500 text-[10px]">Perdendo</p><p className="text-red-400 text-sm font-medium">-{perdidos}</p></div>}
                      </div>
                    </div>
                    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${c.solid}`} style={{ width: `${Math.min(100, (etapa.taxa / etapa.meta) * 100)}%` }} />
                    </div>
                  </div>
                )
              })}

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <h2 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">👑 Resumo Executivo</h2>
                <p className="text-white text-sm leading-relaxed">{resumo}</p>
              </div>
            </div>
          )}

          {/* TAB: Metas */}
          {tab === 'Metas' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {metas.map((meta) => {
                  const isN = meta.tipo === 'normal'; const isS = meta.tipo === 'super'
                  const prog = Math.min(100, (d.faturamento / meta.faturamento_meta) * 100)
                  return (
                    <div key={meta.tipo} className={`rounded-2xl p-5 border ${isN ? 'bg-amber-500/5 border-amber-500/30' : isS ? 'bg-gray-900 border-green-500/30' : 'bg-gray-900 border-gray-700'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-white font-bold">{meta.nome}</h3>
                        {isN && <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">Meta atual</Badge>}
                        {isS && <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">Max</Badge>}
                      </div>
                      <p className={`text-3xl font-bold mb-4 ${isN ? 'text-amber-400' : isS ? 'text-green-400' : 'text-white'}`}>{fmt(meta.faturamento_meta)}</p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {[{ l: 'Vendas', v: meta.vendas_meta }, { l: 'Reunioes', v: meta.reunioes_meta }, { l: 'Agend.', v: meta.agendamentos_meta }, { l: 'Leads', v: meta.leads_meta }].map(i => (
                          <div key={i.l} className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[10px]">{i.l}</p><p className="text-white text-sm font-bold">{i.v}</p></div>
                        ))}
                      </div>
                      <p className="text-gray-500 text-[10px] mb-2">{meta.leads_dia} leads/dia | {meta.agendamentos_dia} ag/dia | {meta.reunioes_dia} reun/dia</p>
                      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${isN ? 'bg-amber-500' : isS ? 'bg-green-500' : 'bg-gray-500'}`} style={{ width: `${prog}%` }} />
                      </div>
                      <p className="text-gray-500 text-[10px]">{prog.toFixed(1)}% ({fmt(d.faturamento)} / {fmt(meta.faturamento_meta)})</p>
                    </div>
                  )
                })}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-white font-semibold mb-3 flex items-center gap-2"><span className="text-amber-500">📈</span> Projecao</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-xs">Projetado</p>
                    <p className="text-2xl font-bold text-amber-400">{fmt(proj.faturamento_projetado)}</p>
                    <Badge className={`mt-1 border-0 text-[10px] ${proj.meta_atingida === 'abaixo' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>{proj.meta_atingida === 'abaixo' ? 'Abaixo' : `Meta ${proj.meta_atingida}`}</Badge>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-xs">Falta p/ meta</p>
                    <p className="text-2xl font-bold text-white">{fmt(proj.falta_para_meta_normal)}</p>
                    <p className="text-gray-500 text-[10px] mt-1">{proj.dias_restantes} dias</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                    <p className="text-gray-400 text-xs">Vendas necessarias</p>
                    <p className="text-2xl font-bold text-white">{proj.vendas_necessarias_restantes}</p>
                    <p className="text-gray-500 text-[10px] mt-1">~{(proj.vendas_necessarias_restantes / Math.max(1, proj.dias_restantes)).toFixed(1)}/dia</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Closers */}
          {tab === 'Closers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[{ nome: 'Closer 1', reunioes: 12, fechamentos: 3, faturamento: 6000 }, { nome: 'Closer 2', reunioes: 10, fechamentos: 2, faturamento: 4000 }].map((cl) => {
                  const conv = cl.reunioes > 0 ? ((cl.fechamentos / cl.reunioes) * 100).toFixed(1) : '0'
                  return (
                    <div key={cl.nome} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                      <h3 className="text-white font-bold text-lg mb-4">{cl.nome}</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-gray-400 text-xs">Reunioes</p><p className="text-white text-xl font-bold">{cl.reunioes}</p></div>
                        <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-gray-400 text-xs">Fechamentos</p><p className="text-green-400 text-xl font-bold">{cl.fechamentos}</p></div>
                        <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-gray-400 text-xs">Conversao</p><p className="text-amber-400 text-xl font-bold">{conv}%</p></div>
                        <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-gray-400 text-xs">Faturamento</p><p className="text-white text-xl font-bold">{fmt(cl.faturamento)}</p></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB: Analise */}
          {tab === 'Analise' && (
            <div className="space-y-4">
              {gargalos.map((g, i) => {
                const acoes: Record<string, string[]> = {
                  agendamento: ['Revisar copy e CTA dos anuncios', 'Follow-up automatizado 1h + 24h + 48h', 'Qualificar lead antes de agendar', 'Treinar SDRs em agendamento'],
                  comparecimento: ['Confirmacao automatica 48h + 24h + 2h', 'Lembrete WhatsApp no dia', 'Reduzir janela para max 3 dias', 'Ligar para confirmar 1 dia antes'],
                  cac: ['Pausar campanhas com CPL > 2x meta', 'Focar em canais com menor CAC', 'Otimizar conversao do funil inteiro', 'Escalar criativos vencedores'],
                  conversao: ['Revisar script de vendas', 'Treinar closers em objecoes', 'Oferecer condicoes para decisao rapida', 'Analisar objecoes frequentes'],
                }
                return (
                  <div key={i} className={`${i === 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-amber-500/5 border-amber-500/20'} border rounded-2xl p-5`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span>{g.severidade === 'critico' ? '🔴' : '🟡'}</span>
                      <h2 className={`${i === 0 ? 'text-red-400' : 'text-amber-400'} font-bold text-lg`}>
                        {i === 0 ? 'GARGALO PRINCIPAL' : 'ATENCAO'}: {g.etapa.charAt(0).toUpperCase() + g.etapa.slice(1)}
                      </h2>
                    </div>
                    <p className="text-white mb-3">{g.atual}{g.etapa === 'cac' ? '' : '%'} vs meta {g.meta}{g.etapa === 'cac' ? '' : '%'} ({g.diferenca > 0 ? '+' : ''}{g.diferenca.toFixed(2)}{g.etapa === 'cac' ? '' : 'pp'})</p>
                    <div className="space-y-1.5">
                      {(acoes[g.etapa] || []).map((acao, j) => (
                        <div key={j} className="flex items-start gap-2"><span className="text-amber-500 text-xs mt-0.5">→</span><p className="text-gray-300 text-xs">{acao}</p></div>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4"><p className="text-gray-400 text-xs">Faturamento perdido</p><p className="text-red-400 text-2xl font-bold">{fmt(impacto.faturamento_perdido)}</p></div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4"><p className="text-gray-400 text-xs">CAC inflado</p><p className="text-red-400 text-2xl font-bold">+{fmt(impacto.cac_inflado_em)}</p></div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h2 className="text-white font-semibold mb-3">🎯 Onde Otimizar</h2>
                {[
                  { e: 'Agendamento', v: impacto.faturamento_perdido * 0.6, s: 'critico', d: '23,40% vs meta 35,25%' },
                  { e: 'Comparecimento', v: impacto.faturamento_perdido * 0.25, s: 'atencao', d: '66,67% vs meta 71,30%' },
                  { e: 'Conversao', v: impacto.faturamento_perdido * 0.15, s: 'atencao', d: '22,73% vs meta 24,09%' },
                ].map((it, i) => (
                  <div key={it.e} className="flex items-center gap-3 bg-gray-800/50 rounded-xl p-3 mb-2">
                    <span className="text-amber-500 font-bold w-5">{i + 1}.</span>
                    <span>{it.s === 'critico' ? '🔴' : '🟡'}</span>
                    <div className="flex-1"><p className="text-white text-sm font-medium">{it.e}</p><p className="text-gray-500 text-xs">{it.d}</p></div>
                    <p className="text-red-400 font-bold text-sm">~{fmt(it.v)}/mes</p>
                  </div>
                ))}
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
                <h2 className="text-amber-400 font-bold text-sm mb-2">👑 Resumo Executivo</h2>
                <p className="text-white text-sm leading-relaxed">{resumo}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
