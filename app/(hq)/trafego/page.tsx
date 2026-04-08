'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Sidebar from '../../components/Sidebar'
import { Badge } from '@/components/ui/badge'

const COR: Record<string, { bg: string; text: string; solid: string; border: string }> = {
  verde: { bg: 'bg-green-500/10', text: 'text-green-400', solid: 'bg-green-500', border: 'border-green-500/30' },
  amarelo: { bg: 'bg-amber-500/10', text: 'text-amber-400', solid: 'bg-amber-500', border: 'border-amber-500/30' },
  vermelho: { bg: 'bg-red-500/10', text: 'text-red-400', solid: 'bg-red-500', border: 'border-red-500/30' },
  neutro: { bg: 'bg-gray-500/10', text: 'text-gray-400', solid: 'bg-gray-500', border: 'border-gray-800' },
}

interface Gargalo { etapa: string; severidade: string; atual: number; meta: number; diferenca: number; mensagem: string }
interface Comparativo { metrica: string; atual: string; baseline_val: string; diferenca: string; cor: string }
interface Impacto { agendamentos_esperados: number; agendamentos_perdidos: number; reunioes_esperadas: number; reunioes_perdidas: number; fechamentos_esperados: number; fechamentos_perdidos: number; faturamento_perdido: number; cac_ideal: number }
interface Dados { leads: number; agendamentos: number; reunioes_realizadas: number; reunioes_qualificadas: number; fechamentos: number; taxa_agendamento: number; taxa_comparecimento: number; taxa_qualificacao: number; taxa_conversao_final: number; cpl: number; cac: number; custo_agendamento: number; custo_reuniao: number; faturamento: number; investimento: number }
interface Baseline { cpl_meta: number; taxa_agendamento_meta: number; taxa_comparecimento_meta: number; taxa_qualificacao_meta: number; taxa_conversao_meta: number; cac_meta: number; ticket_medio: number }
interface SDR { nome: string; role: string; leads_recebidos: number; leads_respondidos: number; tempo_medio_resposta_min: number; followups_realizados: number; agendamentos: number; taxa_agendamento: number; taxa_resposta: number; fechamentos: number; taxa_conversao: number; receita_gerada: number; leads_ignorados: number }
interface Tarefa { id: string; tipo: string; responsavel: string; descricao: string; status: string; prioridade: string; gargalo_ref: string; impacto_financeiro: number }
interface Teste { id: string; campanha: string; criativo: string; variacao: string; status: string; impressoes: number; cliques: number; leads: number; ctr: number; cpc: number; cpl: number; conversao: number; investimento: number; receita: number; roi: number }
interface Simulacao { cenario: string; agendamentos: number; reunioes: number; fechamentos: number; faturamento: number; ganho: number; cac: number }
interface Projecao { faturamento_projetado: number; vendas_projetadas: number; meta_atingida: string; dias_restantes: number; falta_para_meta_normal: number; vendas_necessarias: number; vendas_por_dia: number }
interface Prioridade { titulo: string; impacto: number; severidade: string; acoes: string[] }
interface ApiResp {
  dados: Dados; baseline: Baseline; cores: Record<string, string>; gargalos: Gargalo[]
  impacto: Impacto; comparativo: Comparativo[]; resumo: string
  sdr_performance: SDR[]; tarefas: Tarefa[]; testes_marketing: Teste[]
  simulacoes: Simulacao[]; projecao_mes: Projecao; prioridade_do_dia: Prioridade
}

function fmt(v: number): string { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
function fmtDate(d: Date): string { return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) }

// ── DATE FILTER ─────────────────────────────────────────────────
function DateFilter({ dateFrom, dateTo, onChange }: { dateFrom: Date; dateTo: Date; onChange: (f: Date, t: Date, l: string) => void }) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('Este mes')
  const [cf, setCf] = useState('')
  const [ct, setCt] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])
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
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white hover:border-amber-500/50 transition">
        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span>{label}</span>
        <span className="text-gray-500 text-xs">({fmtDate(dateFrom)} — {fmtDate(dateTo)})</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 w-80">
          <div className="p-1">{presets.map((p) => (
            <button key={p.label} onClick={() => { const [f, t] = p.fn(); setLabel(p.label); onChange(f, t, p.label); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition ${label === p.label ? 'bg-amber-500/10 text-amber-400' : 'text-gray-300 hover:bg-gray-800'}`}>{p.label}</button>
          ))}</div>
          <div className="border-t border-gray-800 p-4">
            <p className="text-gray-500 text-xs mb-2 font-medium">Periodo personalizado</p>
            <div className="flex gap-2 mb-2">
              <input type="date" value={cf} onChange={e => setCf(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
              <input type="date" value={ct} onChange={e => setCt(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500" />
            </div>
            <button onClick={() => { if (cf && ct) { const f = new Date(cf+'T00:00:00'); const t = new Date(ct+'T00:00:00'); setLabel(`${fmtDate(f)} — ${fmtDate(t)}`); onChange(f, t, 'custom'); setOpen(false) } }} className="w-full bg-amber-500 text-gray-950 rounded-lg py-2 text-xs font-bold hover:bg-amber-400 transition">Aplicar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TABS ─────────────────────────────────────────────────────────
const TABS = ['Funil', 'SDR & Equipe', 'Criativos & Testes', 'Diagnostico'] as const
type Tab = typeof TABS[number]

export default function TrafegoPage() {
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Funil')
  const [dateFrom, setDateFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [dateTo, setDateTo] = useState(() => new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try { const r = await fetch('/api/hq/trafego'); const j = await r.json(); if (j.success) setData(j) } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  if (loading || !data) return (<div className="flex h-screen bg-gray-950"><Sidebar /><main className="flex-1 flex items-center justify-center"><p className="text-gray-500 animate-pulse">Carregando sistema...</p></main></div>)

  const { dados: d, baseline: b, cores, gargalos, impacto, comparativo, resumo, sdr_performance: sdrs, tarefas, testes_marketing: testes, simulacoes, projecao_mes: proj, prioridade_do_dia: prio } = data

  const funilEtapas = [
    { label: 'Leads', valor: d.leads, pct: 100, icon: '📥' },
    { label: 'Agendamentos', valor: d.agendamentos, pct: d.leads > 0 ? (d.agendamentos / d.leads) * 100 : 0, icon: '📅' },
    { label: 'Reunioes', valor: d.reunioes_realizadas, pct: d.leads > 0 ? (d.reunioes_realizadas / d.leads) * 100 : 0, icon: '🤝' },
    { label: 'Qualificadas', valor: d.reunioes_qualificadas, pct: d.leads > 0 ? (d.reunioes_qualificadas / d.leads) * 100 : 0, icon: '✅' },
    { label: 'Vendas', valor: d.fechamentos, pct: d.leads > 0 ? (d.fechamentos / d.leads) * 100 : 0, icon: '🏆' },
  ]
  const taxas = [
    { taxa: d.taxa_agendamento, cor: cores.agendamento, etapa: 'agendamento' },
    { taxa: d.taxa_comparecimento, cor: cores.comparecimento, etapa: 'comparecimento' },
    { taxa: d.taxa_qualificacao, cor: cores.qualificacao, etapa: 'qualificacao' },
    { taxa: d.taxa_conversao_final, cor: cores.conversao, etapa: 'conversao' },
  ]

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2"><span className="text-amber-500">📣</span> Dashboard Trafego</h1>
              <p className="text-gray-400 text-sm mt-0.5">Sistema operacional de aquisicao</p>
            </div>
            <div className="flex items-center gap-3">
              <DateFilter dateFrom={dateFrom} dateTo={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t) }} />
              <div className="flex bg-gray-800 rounded-xl p-0.5">
                {TABS.map(t => (<button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition ${tab === t ? 'bg-amber-500 text-gray-950' : 'text-gray-400 hover:text-white'}`}>{t}</button>))}
              </div>
            </div>
          </div>

          {/* PRIORIDADE DO DIA — sempre visivel */}
          <div className={`${prio.severidade === 'critico' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'} border rounded-2xl p-4 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{prio.severidade === 'critico' ? '🔥' : '⚡'}</span>
              <div>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Prioridade do dia</p>
                <p className="text-white font-bold text-sm">{prio.titulo}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {prio.impacto > 0 && <div className="text-right"><p className="text-gray-500 text-[10px]">Impacto</p><p className="text-red-400 font-bold">{fmt(prio.impacto)}/mes</p></div>}
              <div className="flex gap-1">{prio.acoes.slice(0, 2).map((a, i) => (<span key={i} className="bg-gray-800 text-gray-300 text-[10px] px-2 py-1 rounded-lg">{a}</span>))}</div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: 'CPL', valor: `R$${d.cpl}`, meta: `Meta R$${b.cpl_meta}`, cor: cores.cpl, icon: '💰' },
              { label: 'Leads', valor: String(d.leads), meta: `${(d.leads / 8).toFixed(0)}/dia`, cor: 'neutro', icon: '📥' },
              { label: 'Agendamento', valor: `${d.taxa_agendamento}%`, meta: `Meta: ${b.taxa_agendamento_meta}%`, cor: cores.agendamento, icon: '📅' },
              { label: 'CAC', valor: `R$${d.cac}`, meta: `Meta R$${b.cac_meta}`, cor: cores.cac, icon: '📊' },
              { label: 'Faturamento', valor: fmt(d.faturamento), meta: `Proj: ${fmt(proj.faturamento_projetado)}`, cor: 'neutro', icon: '💰' },
              { label: 'ROI', valor: `${d.investimento > 0 ? ((d.faturamento / d.investimento - 1) * 100).toFixed(0) : 0}%`, meta: `Invest: ${fmt(d.investimento)}`, cor: 'neutro', icon: '📈' },
            ].map(kpi => {
              const c = COR[kpi.cor] || COR.neutro
              const isG = gargalos.some(g => kpi.label.toLowerCase().includes(g.etapa))
              return (
                <div key={kpi.label} className={`bg-gray-900 border ${c.border} rounded-2xl p-3.5`}>
                  <div className="flex items-center justify-between mb-0.5"><span className="text-gray-400 text-[10px]">{kpi.label}</span><span className="text-sm">{kpi.icon}</span></div>
                  <p className={`text-lg font-bold ${c.text}`}>{kpi.valor}</p>
                  <p className="text-gray-500 text-[9px] mt-0.5">{kpi.meta}</p>
                  {isG && <Badge className="bg-red-500/20 text-red-400 border-0 text-[8px] mt-1">GARGALO</Badge>}
                </div>
              )
            })}
          </div>

          {/* ═══ TAB: FUNIL ═══ */}
          {tab === 'Funil' && (<div className="space-y-4">
            {/* Funil horizontal */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-white font-semibold flex items-center gap-2"><span className="text-amber-500">📊</span> Funil de Conversao</h2>
                <div className="flex gap-3 text-[10px] text-gray-500"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Meta</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Atencao</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Gargalo</span></div>
              </div>
              {funilEtapas.map((et, i) => {
                const w = Math.max(12, (et.valor / (funilEtapas[0]?.valor || 1)) * 100)
                const tx = taxas[i - 1]
                const isG = tx ? gargalos.some(g => g.etapa === tx.etapa) : false
                const tc = tx ? (COR[tx.cor] || COR.neutro) : null
                const isFirst = i === 0; const isLast = i === funilEtapas.length - 1
                return (<div key={et.label}>
                  {tx && (<div className="flex items-center py-1 pl-3"><div className="w-24 shrink-0" /><div className="flex items-center gap-2 ml-1">
                    <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    <span className={`text-sm font-bold ${tc?.text}`}>{tx.taxa}%</span>
                    {isG && <Badge className="bg-red-500/20 text-red-400 border-0 text-[8px] py-0">GARGALO</Badge>}
                  </div></div>)}
                  <div className="flex items-center gap-3">
                    <div className="w-24 shrink-0 text-right pr-2"><span className="text-[10px] text-gray-500">{et.icon}</span><p className="text-[11px] text-gray-300 font-medium leading-tight">{et.label}</p></div>
                    <div className="flex-1"><div style={{ width: `${w}%`, minWidth: '80px' }}>
                      <div className={`h-12 flex items-center justify-between px-3 ${isFirst ? 'bg-gradient-to-r from-amber-500 to-amber-400' : isLast ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-gradient-to-r from-amber-500/70 to-amber-400/50'}`}
                        style={{ clipPath: isFirst ? 'polygon(0 0,100% 4%,100% 96%,0 100%)' : isLast ? 'polygon(0 8%,100% 20%,100% 80%,0 92%)' : `polygon(0 ${4+i*3}%,100% ${4+(i+1)*3}%,100% ${96-(i+1)*3}%,0 ${96-i*3}%)`, borderRadius: isLast ? '0 8px 8px 0' : '0' }}>
                        <span className="text-white font-bold text-base">{et.valor}</span>
                        <span className="text-white/70 text-[10px]">{et.pct.toFixed(1)}%</span>
                      </div>
                    </div></div>
                  </div>
                </div>)
              })}
              <div className="flex gap-4 mt-4 pt-3 border-t border-gray-800">
                <div className="flex items-center gap-2 bg-green-500/10 rounded-xl px-3 py-2"><div><p className="text-gray-400 text-[9px]">Faturamento</p><p className="text-green-400 font-bold">{fmt(d.faturamento)}</p></div></div>
                <div className="flex items-center gap-2 bg-amber-500/10 rounded-xl px-3 py-2"><div><p className="text-gray-400 text-[9px]">Ticket Medio</p><p className="text-amber-400 font-bold">{fmt(b.ticket_medio)}</p></div></div>
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2"><div><p className="text-gray-400 text-[9px]">Receita/Lead</p><p className="text-white font-bold">{fmt(d.leads > 0 ? d.faturamento / d.leads : 0)}</p></div></div>
                <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl px-3 py-2"><div><p className="text-gray-400 text-[9px]">Projecao Mes</p><p className="text-amber-400 font-bold">{fmt(proj.faturamento_projetado)}</p></div></div>
              </div>
            </div>

            {/* Comparativo + Simulacoes lado a lado */}
            <div className="grid grid-cols-2 gap-4">
              {/* Comparativo */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl">
                <div className="p-4 border-b border-gray-800"><h2 className="text-white font-semibold text-sm flex items-center gap-2"><span className="text-amber-500">📋</span> Atual vs Baseline</h2></div>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 text-[10px] border-b border-gray-800"><th className="text-left px-4 py-2">Metrica</th><th className="text-center px-2 py-2">Atual</th><th className="text-center px-2 py-2">Meta</th><th className="text-center px-2 py-2">Dif</th><th className="px-2 py-2"></th></tr></thead>
                  <tbody className="divide-y divide-gray-800">{comparativo.map(r => { const c = COR[r.cor] || COR.neutro; return (<tr key={r.metrica} className="hover:bg-gray-800/30"><td className="px-4 py-2 text-white font-medium">{r.metrica}</td><td className="px-2 py-2 text-center text-white">{r.atual}</td><td className="px-2 py-2 text-center text-gray-500">{r.baseline_val}</td><td className={`px-2 py-2 text-center font-medium ${c.text}`}>{r.diferenca}</td><td className="px-2 py-2 text-center"><span className={`inline-block w-2 h-2 rounded-full ${c.solid}`} /></td></tr>) })}</tbody>
                </table>
              </div>

              {/* Simulacoes */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <h2 className="text-white font-semibold text-sm flex items-center gap-2 mb-3"><span className="text-amber-500">🔮</span> Simulador de Cenarios</h2>
                <div className="space-y-2">
                  {simulacoes.map((s, i) => (
                    <div key={i} className="bg-gray-800/50 rounded-xl p-3">
                      <p className="text-amber-400 text-xs font-bold mb-1">Se {s.cenario}:</p>
                      <div className="flex gap-3 text-[10px]">
                        <span className="text-gray-400">Agend: <span className="text-white font-bold">{s.agendamentos}</span></span>
                        <span className="text-gray-400">Reun: <span className="text-white font-bold">{s.reunioes}</span></span>
                        <span className="text-gray-400">Vendas: <span className="text-white font-bold">{s.fechamentos}</span></span>
                        <span className="text-gray-400">Fat: <span className="text-green-400 font-bold">{fmt(s.faturamento)}</span></span>
                        {s.ganho > 0 && <span className="text-green-400 font-bold">+{fmt(s.ganho)}</span>}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                  <p className="text-gray-400 text-[10px]">Falta para meta normal</p>
                  <p className="text-white font-bold text-sm">{fmt(proj.falta_para_meta_normal)} — {proj.vendas_necessarias} vendas ({proj.vendas_por_dia}/dia)</p>
                </div>
              </div>
            </div>

            {/* Alertas + Impacto */}
            <div className="grid grid-cols-2 gap-4">
              {gargalos.length > 0 && (<div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-4">
                <h2 className="text-red-400 font-bold text-sm mb-3">🚨 Alertas + Acoes</h2>
                <div className="space-y-3">{gargalos.map((g, i) => {
                  const acoes: Record<string, string[]> = { agendamento: ['Follow-up 1h+24h+48h', 'Auto-resposta <5min', 'Treinar SDRs', 'Revisar copy'], comparecimento: ['Confirmacao 48h+24h+2h', 'Lembrete WhatsApp', 'Janela max 3 dias'], cac: ['Pausar CPL >2x meta', 'Focar canais baratos', 'Escalar winners'], conversao: ['Revisar script', 'Treinar closers', 'Condicao especial'] }
                  return (<div key={i} className="bg-gray-900/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1"><span>{g.severidade === 'critico' ? '🔴' : '🟡'}</span><p className="text-white text-xs font-bold">{g.mensagem}</p></div>
                    <p className="text-gray-500 text-[10px] mb-2">{g.atual}{g.etapa === 'cac' ? '' : '%'} vs {g.meta}{g.etapa === 'cac' ? '' : '%'}</p>
                    <div className="flex flex-wrap gap-1">{(acoes[g.etapa] || []).map((a, j) => (<span key={j} className="bg-gray-800 text-gray-300 text-[9px] px-2 py-0.5 rounded">{a}</span>))}</div>
                  </div>)
                })}</div>
              </div>)}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
                <h2 className="text-amber-400 font-bold text-sm mb-3">💸 Impacto Financeiro</h2>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[{ l: 'Agend. extras', v: `+${impacto.agendamentos_perdidos}` }, { l: 'Reunioes extras', v: `+${impacto.reunioes_perdidas}` }, { l: 'Vendas extras', v: `+${impacto.fechamentos_perdidos}` }, { l: 'Receita perdida', v: fmt(impacto.faturamento_perdido) }].map(i => (
                    <div key={i.l} className="bg-gray-900/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">{i.l}</p><p className="text-green-400 font-bold text-sm">{i.v}</p></div>
                  ))}
                </div>
                <div className="bg-amber-500/5 rounded-lg p-2"><p className="text-amber-400 text-xs font-bold">👑 Resumo</p><p className="text-gray-300 text-[10px] mt-1 leading-relaxed">{resumo}</p></div>
              </div>
            </div>
          </div>)}

          {/* ═══ TAB: SDR & EQUIPE ═══ */}
          {tab === 'SDR & Equipe' && (<div className="space-y-4">
            {/* SDR Cards */}
            <div className="grid grid-cols-2 gap-4">
              {sdrs.filter(s => s.role === 'sdr').map(sdr => {
                const respOk = sdr.tempo_medio_resposta_min <= 5
                const agendOk = sdr.taxa_agendamento >= 30
                return (<div key={sdr.nome} className={`bg-gray-900 border ${!agendOk ? 'border-red-500/30' : 'border-gray-800'} rounded-2xl p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-bold">{sdr.nome}</h3>
                    <Badge className={`border-0 text-[10px] ${agendOk ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{agendOk ? 'Na meta' : 'Abaixo'}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Leads</p><p className="text-white font-bold">{sdr.leads_recebidos}</p></div>
                    <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Respondidos</p><p className={`font-bold ${sdr.taxa_resposta >= 85 ? 'text-green-400' : 'text-red-400'}`}>{sdr.taxa_resposta}%</p></div>
                    <div className={`rounded-lg p-2 ${respOk ? 'bg-green-500/10' : 'bg-red-500/10'}`}><p className="text-gray-500 text-[9px]">Tempo Resp.</p><p className={`font-bold ${respOk ? 'text-green-400' : 'text-red-400'}`}>{sdr.tempo_medio_resposta_min}min</p></div>
                    <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Follow-ups</p><p className="text-white font-bold">{sdr.followups_realizados}</p></div>
                    <div className={`rounded-lg p-2 ${agendOk ? 'bg-green-500/10' : 'bg-red-500/10'}`}><p className="text-gray-500 text-[9px]">Agendamento</p><p className={`font-bold ${agendOk ? 'text-green-400' : 'text-red-400'}`}>{sdr.taxa_agendamento}%</p></div>
                    <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Ignorados</p><p className={`font-bold ${sdr.leads_ignorados > 5 ? 'text-red-400' : 'text-green-400'}`}>{sdr.leads_ignorados}</p></div>
                  </div>
                  {!agendOk && <p className="text-red-400 text-[10px]">⚠ Agendamento em {sdr.taxa_agendamento}% — meta 35%</p>}
                  {!respOk && <p className="text-red-400 text-[10px]">⚠ Tempo resposta {sdr.tempo_medio_resposta_min}min — meta {'<'}5min</p>}
                </div>)
              })}
            </div>
            {/* Closers */}
            <div className="grid grid-cols-2 gap-4">
              {sdrs.filter(s => s.role === 'closer').map(cl => (<div key={cl.nome} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-3">{cl.nome}</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Reunioes</p><p className="text-white font-bold">{cl.leads_recebidos}</p></div>
                  <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Fechamentos</p><p className="text-green-400 font-bold">{cl.fechamentos}</p></div>
                  <div className="bg-gray-800/50 rounded-lg p-2"><p className="text-gray-500 text-[9px]">Conversao</p><p className="text-amber-400 font-bold">{cl.taxa_conversao}%</p></div>
                </div>
                <p className="text-green-400 font-bold mt-2">Receita: {fmt(cl.receita_gerada)}</p>
              </div>))}
            </div>
            {/* Tarefas */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl">
              <div className="p-4 border-b border-gray-800"><h2 className="text-white font-semibold text-sm flex items-center gap-2">📋 Tarefas Geradas pelo Sistema</h2></div>
              <div className="divide-y divide-gray-800">
                {tarefas.map(t => (<div key={t.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <Badge className={`border-0 text-[9px] ${t.prioridade === 'critica' ? 'bg-red-500/20 text-red-400' : t.prioridade === 'alta' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-500/20 text-gray-400'}`}>{t.prioridade}</Badge>
                    <div><p className="text-white text-xs">{t.descricao}</p><p className="text-gray-500 text-[10px]">{t.responsavel} · {t.tipo}</p></div>
                  </div>
                  {t.impacto_financeiro > 0 && <span className="text-green-400 text-xs font-bold">{fmt(t.impacto_financeiro)}</span>}
                </div>))}
              </div>
            </div>
          </div>)}

          {/* ═══ TAB: CRIATIVOS & TESTES ═══ */}
          {tab === 'Criativos & Testes' && (<div className="space-y-4">
            {testes.reduce<string[]>((camps, t) => { if (!camps.includes(t.campanha)) camps.push(t.campanha); return camps }, []).map(camp => {
              const campTestes = testes.filter(t => t.campanha === camp)
              const vencedor = campTestes.find(t => t.status === 'vencedor')
              return (<div key={camp} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold">{camp}</h3>
                  {vencedor && <Badge className="bg-green-500/20 text-green-400 border-0 text-[10px]">Vencedor definido</Badge>}
                  {!vencedor && <Badge className="bg-amber-500/20 text-amber-400 border-0 text-[10px]">Teste ativo</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {campTestes.map(t => {
                    const isWinner = t.status === 'vencedor'
                    const isLoser = t.status === 'perdedor'
                    return (<div key={t.id} className={`rounded-xl p-4 border ${isWinner ? 'bg-green-500/5 border-green-500/30' : isLoser ? 'bg-red-500/5 border-red-500/20' : 'bg-gray-800/50 border-gray-700'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white text-sm font-medium">{t.criativo}</p>
                          <p className="text-gray-500 text-[10px]">Variacao {t.variacao}</p>
                        </div>
                        <Badge className={`border-0 text-[9px] ${isWinner ? 'bg-green-500/20 text-green-400' : isLoser ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.status}</Badge>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                        <div><p className="text-gray-500">CTR</p><p className="text-white font-bold">{t.ctr}%</p></div>
                        <div><p className="text-gray-500">CPL</p><p className={`font-bold ${t.cpl <= 20 ? 'text-green-400' : 'text-red-400'}`}>R${t.cpl}</p></div>
                        <div><p className="text-gray-500">Conv.</p><p className="text-white font-bold">{t.conversao}%</p></div>
                        <div><p className="text-gray-500">ROI</p><p className={`font-bold ${t.roi > 200 ? 'text-green-400' : 'text-amber-400'}`}>{t.roi}%</p></div>
                        <div><p className="text-gray-500">Impress.</p><p className="text-white font-bold">{t.impressoes.toLocaleString()}</p></div>
                        <div><p className="text-gray-500">Leads</p><p className="text-white font-bold">{t.leads}</p></div>
                        <div><p className="text-gray-500">Invest.</p><p className="text-white font-bold">{fmt(t.investimento)}</p></div>
                        <div><p className="text-gray-500">Receita</p><p className="text-green-400 font-bold">{fmt(t.receita)}</p></div>
                      </div>
                    </div>)
                  })}
                </div>
              </div>)
            })}
          </div>)}

          {/* ═══ TAB: DIAGNOSTICO ═══ */}
          {tab === 'Diagnostico' && (<div className="space-y-4">
            {/* Diagnostico por gargalo */}
            {gargalos.map((g, i) => {
              const causas: Record<string, string[]> = {
                agendamento: ['Tempo de resposta alto (SDR)', 'Falta de follow-up sistematico', 'Copy/CTA dos anuncios fraco', 'Lead nao qualificado antes do agendamento'],
                comparecimento: ['Sem sequencia de confirmacao', 'Janela agendamento muito longa', 'Falta lembrete no dia', 'Lead nao comprometido'],
                cac: ['Campanhas com CPL acima da meta', 'Criativos saturados', 'Publico errado', 'Baixa conversao no funil inteiro'],
                conversao: ['Script de vendas fraco', 'Objecoes nao tratadas', 'Proposta de valor nao clara', 'Closer nao treinado'],
              }
              const acoes: Record<string, string[]> = {
                agendamento: ['Ativar auto-resposta <5min', 'Follow-up 1h+24h+48h automatico', 'Revisar script SDR', 'Qualificar lead antes de agendar'],
                comparecimento: ['Confirmacao 48h+24h+2h', 'Lembrete WhatsApp dia da reuniao', 'Reduzir janela para 3 dias'],
                cac: ['Pausar criativos com CPL >2x meta', 'Escalar criativos vencedores', 'Testar novos publicos'],
                conversao: ['Treinar closers', 'Criar banco de objecoes', 'Oferecer condicao especial'],
              }
              return (<div key={i} className={`border rounded-2xl p-5 ${i === 0 ? 'bg-red-500/5 border-red-500/30' : 'bg-amber-500/5 border-amber-500/20'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`font-bold ${i === 0 ? 'text-red-400' : 'text-amber-400'}`}>{i === 0 ? '🔴 GARGALO PRINCIPAL' : '🟡 ATENCAO'}: {g.etapa.charAt(0).toUpperCase() + g.etapa.slice(1)}</h2>
                  <span className="text-red-400 font-bold text-sm">Impacto: ~{fmt(impacto.faturamento_perdido * (i === 0 ? 0.6 : i === 1 ? 0.25 : 0.15))}/mes</span>
                </div>
                <p className="text-white mb-3">{g.atual}{g.etapa === 'cac' ? '' : '%'} vs meta {g.meta}{g.etapa === 'cac' ? '' : '%'} ({g.diferenca > 0 ? '+' : ''}{g.diferenca.toFixed(2)}{g.etapa === 'cac' ? '' : 'pp'})</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-400 text-xs font-semibold mb-2">Causa raiz provavel:</p>{(causas[g.etapa] || []).map((c, j) => (<p key={j} className="text-gray-300 text-xs mb-1 flex items-center gap-1"><span className="text-red-400">•</span> {c}</p>))}</div>
                  <div><p className="text-gray-400 text-xs font-semibold mb-2">Acao recomendada:</p>{(acoes[g.etapa] || []).map((a, j) => (<p key={j} className="text-gray-300 text-xs mb-1 flex items-center gap-1"><span className="text-amber-400">→</span> {a}</p>))}</div>
                </div>
              </div>)
            })}
            {/* Resumo */}
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5">
              <h2 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-2">👑 Resumo Executivo</h2>
              <p className="text-white text-sm leading-relaxed">{resumo}</p>
            </div>
          </div>)}
        </div>
      </main>
    </div>
  )
}
