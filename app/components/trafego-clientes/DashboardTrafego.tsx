'use client'

import { useEffect, useState } from 'react'

type Overview = {
  kpis: {
    totalClinicas: number
    ativas: number
    pausadas: number
    setup: number
    problema: number
    semGestor: number
    investimentoMes: number
    leadsMes: number
    cplMedio: number
    alertasAtivos: number
  }
  distribuicao: { plataformas: Record<string, number>; status: Record<string, number> }
  ranking: {
    melhores: Array<{ clinica_id: string; cpl: number; leads: number; investimento: number }>
    piores: Array<{ clinica_id: string; cpl: number; leads: number; investimento: number }>
  }
  alertas: Array<{ id: string; tipo: string; titulo: string; descricao: string; prioridade: string; clinica_id: string }>
}

type Clinica = {
  id: string
  nome: string
  fase: string | null
  cs_responsavel: string | null
  mrr: number
  gestor_id: string | null
  gestor_nome: string | null
  plataforma: string | null
  investimento_mensal: number
  meta_leads: number
  meta_cpl: number
  status_trafego: string
  leads_hoje: number
  cpl_hoje: number
  investimento_hoje: number
  alertas_count: number
}

type Gestor = {
  id: string
  nome: string
  email: string | null
  whatsapp: string | null
  clinicas_count: number
  ativas: number
  cpl_medio: number
  investimento_mes: number
  leads_mes: number
  alertas_count: number
  performance: 'bom' | 'atencao' | 'critico'
}

interface Props {
  userRole: string
  userNome: string
  setupDone: boolean
}

const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
const statusBadge = (s: string) => {
  const m: Record<string, { label: string; classe: string }> = {
    ativo: { label: '🟢 Ativo', classe: 'bg-green-500/10 text-green-400 border-green-500/40' },
    pausado: { label: '🔴 Pausado', classe: 'bg-red-500/10 text-red-400 border-red-500/40' },
    problema: { label: '⚠️ Problema', classe: 'bg-amber-500/10 text-amber-400 border-amber-500/40' },
    setup: { label: '🔧 Setup', classe: 'bg-blue-500/10 text-blue-400 border-blue-500/40' },
    sem_gestor: { label: '⚫ Sem gestor', classe: 'bg-gray-500/10 text-gray-400 border-gray-600' },
  }
  return m[s] || m.sem_gestor
}

export default function DashboardTrafego({ userRole, userNome, setupDone }: Props) {
  const [aba, setAba] = useState<'visao' | 'clinicas' | 'gestores' | 'lancar'>('visao')
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [gestores, setGestores] = useState<Gestor[]>([])
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroGestor, setFiltroGestor] = useState<string>('')

  // Form de lançamento
  const [formClinica, setFormClinica] = useState('')
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0])
  const [formLeads, setFormLeads] = useState('')
  const [formInv, setFormInv] = useState('')
  const [formImpressoes, setFormImpressoes] = useState('')
  const [formCliques, setFormCliques] = useState('')
  const [formMsg, setFormMsg] = useState('')
  const [formSalvando, setFormSalvando] = useState(false)

  const readOnly = userRole === 'cs'

  const carregar = async () => {
    setLoading(true)
    try {
      const [o, c, g] = await Promise.all([
        fetch('/api/trafego-clientes/overview').then(r => r.json()),
        fetch('/api/trafego-clientes/clinicas').then(r => r.json()),
        fetch('/api/trafego-clientes/gestores').then(r => r.json()),
      ])
      setOverview(o)
      setClinicas(c.clinicas || [])
      setGestores(g.gestores || [])
    } catch { /* */ }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const clinicasFiltradas = clinicas.filter(c => {
    if (filtroStatus && c.status_trafego !== filtroStatus) return false
    if (filtroGestor && c.gestor_id !== filtroGestor) return false
    return true
  })

  const lancarMetrica = async () => {
    if (!formClinica || !formLeads) {
      setFormMsg('❌ Selecione clínica e informe leads')
      return
    }
    setFormSalvando(true)
    setFormMsg('')
    try {
      const res = await fetch('/api/trafego-clientes/metricas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinica_id: formClinica,
          data: formData,
          leads: Number(formLeads),
          investimento: Number(formInv || 0),
          impressoes: Number(formImpressoes || 0),
          cliques: Number(formCliques || 0),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setFormMsg(`✅ Salvo. ${data.alertas_gerados?.length ? `(${data.alertas_gerados.length} alertas gerados)` : ''}`)
        setFormLeads(''); setFormInv(''); setFormImpressoes(''); setFormCliques('')
        await carregar()
      } else {
        setFormMsg('❌ ' + (data.error || 'erro'))
      }
    } catch (e) {
      setFormMsg('❌ ' + (e instanceof Error ? e.message : 'erro'))
    }
    setFormSalvando(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-sm">Carregando dados de tráfego...</div>
      </div>
    )
  }

  const k = overview?.kpis
  const primeiroNome = userNome?.split(' ')[0] || ''

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div>
          <h1 className="text-white text-xl md:text-2xl font-bold">📣 Tráfego Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">
            {readOnly ? 'Visão CS — monitoramento integrado' : primeiroNome ? `Olá, ${primeiroNome} — Head of Traffic` : 'Painel operacional'}
            {' · '}{k?.totalClinicas || 0} clínicas · {k?.ativas || 0} ativas · {k?.alertasAtivos || 0} alertas
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={() => setAba('gestores')} className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold min-h-[40px] transition whitespace-nowrap">
              👥 Gestores
            </button>
            <button onClick={() => setAba('lancar')} className="bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-xl px-4 py-2 text-xs font-bold min-h-[40px] transition whitespace-nowrap">
              + Lançar métricas
            </button>
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Clínicas com tráfego</p>
          <p className="text-white text-xl md:text-2xl font-bold mt-1">{k?.ativas || 0}<span className="text-gray-600 text-base">/{k?.totalClinicas || 0}</span></p>
          <p className="text-[10px] text-gray-600 mt-1">{k?.pausadas || 0} pausadas · {k?.semGestor || 0} sem gestor</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Investimento mês</p>
          <p className="text-amber-400 text-xl md:text-2xl font-bold mt-1">{fmtR(k?.investimentoMes || 0)}</p>
          <p className="text-[10px] text-gray-600 mt-1">{k?.leadsMes || 0} leads gerados</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] uppercase text-gray-500 font-semibold">CPL médio</p>
          <p className="text-blue-400 text-xl md:text-2xl font-bold mt-1">{fmtR(k?.cplMedio || 0)}</p>
          <p className="text-[10px] text-gray-600 mt-1">Média consolidada</p>
        </div>
        <div className={`bg-gray-900 border rounded-xl p-4 ${(k?.alertasAtivos || 0) > 0 ? 'border-red-800/60' : 'border-gray-800'}`}>
          <p className="text-[10px] uppercase text-gray-500 font-semibold">Alertas ativos</p>
          <p className={`text-xl md:text-2xl font-bold mt-1 ${(k?.alertasAtivos || 0) > 0 ? 'text-red-400' : 'text-gray-500'}`}>{k?.alertasAtivos || 0}</p>
          <p className="text-[10px] text-gray-600 mt-1">{(k?.alertasAtivos || 0) > 0 ? 'Requer atenção' : 'Tudo ok'}</p>
        </div>
      </div>

      {/* Admin extra: mostrar status de setup */}
      {(userRole === 'admin' || userRole === 'coo') && !setupDone && (
        <div className="mb-4 bg-blue-500/10 border border-blue-500/40 rounded-xl p-4">
          <p className="text-blue-400 text-xs font-bold">ℹ Jéssica ainda não preencheu o questionário de setup</p>
          <p className="text-gray-400 text-[11px] mt-1">Quando ela logar pela primeira vez, vai responder as 15 perguntas e o sistema será configurado automaticamente.</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-800 mb-5 flex gap-1 overflow-x-auto">
        {[
          { id: 'visao', label: '📊 Visão Geral' },
          { id: 'clinicas', label: '📋 Clínicas' },
          { id: 'gestores', label: '👥 Gestores' },
          ...(readOnly ? [] : [{ id: 'lancar', label: '📈 Lançar métricas' }]),
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setAba(t.id as 'visao' | 'clinicas' | 'gestores' | 'lancar')}
            className={`px-4 py-2.5 text-xs font-semibold transition whitespace-nowrap border-b-2 ${aba === t.id ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ABA: VISÃO GERAL */}
      {aba === 'visao' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Alertas críticos */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">🚨 Alertas críticos</h3>
            {(overview?.alertas || []).filter(a => a.prioridade === 'critica').length === 0 ? (
              <p className="text-gray-500 text-xs">Nenhum alerta crítico ativo — operação saudável ✅</p>
            ) : (
              <div className="space-y-2">
                {(overview?.alertas || []).filter(a => a.prioridade === 'critica').slice(0, 5).map(a => {
                  const c = clinicas.find(x => x.id === a.clinica_id)
                  return (
                    <div key={a.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/40">
                      <div className="text-red-400 text-xs font-bold">{a.titulo}</div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{c?.nome || 'Clínica'} · {a.descricao}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top 5 melhores CPL */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">🏆 Melhores CPL</h3>
            {(overview?.ranking.melhores || []).length === 0 ? (
              <p className="text-gray-500 text-xs">Sem dados ainda</p>
            ) : (
              <div className="space-y-2">
                {overview?.ranking.melhores.map((m, i) => {
                  const c = clinicas.find(x => x.id === m.clinica_id)
                  return (
                    <div key={m.clinica_id} className="flex items-center justify-between p-2 rounded bg-gray-800/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-amber-400 font-bold text-xs">{i + 1}º</span>
                        <span className="text-gray-200 text-xs truncate">{c?.nome || 'Clínica'}</span>
                      </div>
                      <span className="text-green-400 text-xs font-bold">{fmtR(m.cpl)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Top 5 piores CPL */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">⚠️ Piores CPL</h3>
            {(overview?.ranking.piores || []).length === 0 ? (
              <p className="text-gray-500 text-xs">Sem dados ainda</p>
            ) : (
              <div className="space-y-2">
                {overview?.ranking.piores.map((m, i) => {
                  const c = clinicas.find(x => x.id === m.clinica_id)
                  return (
                    <div key={m.clinica_id} className="flex items-center justify-between p-2 rounded bg-gray-800/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-red-400 font-bold text-xs">{i + 1}º</span>
                        <span className="text-gray-200 text-xs truncate">{c?.nome || 'Clínica'}</span>
                      </div>
                      <span className="text-red-400 text-xs font-bold">{fmtR(m.cpl)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Distribuição por status */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">📊 Distribuição das clínicas</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: '🟢 Ativas', valor: k?.ativas || 0, cor: 'text-green-400' },
                { label: '🔴 Pausadas', valor: k?.pausadas || 0, cor: 'text-red-400' },
                { label: '⚠️ Problema', valor: k?.problema || 0, cor: 'text-amber-400' },
                { label: '🔧 Setup', valor: k?.setup || 0, cor: 'text-blue-400' },
                { label: '⚫ Sem gestor', valor: k?.semGestor || 0, cor: 'text-gray-500' },
              ].map(x => (
                <div key={x.label} className="text-center p-3 bg-gray-800/40 rounded-lg">
                  <div className={`text-2xl font-bold ${x.cor}`}>{x.valor}</div>
                  <div className="text-[10px] text-gray-500 mt-1">{x.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ABA: CLÍNICAS */}
      {aba === 'clinicas' && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Filtros */}
          <div className="p-3 border-b border-gray-800 flex flex-wrap gap-2">
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">Todos os status</option>
              <option value="ativo">🟢 Ativo</option>
              <option value="pausado">🔴 Pausado</option>
              <option value="problema">⚠️ Problema</option>
              <option value="sem_gestor">⚫ Sem gestor</option>
            </select>
            <select value={filtroGestor} onChange={e => setFiltroGestor(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white">
              <option value="">Todos os gestores</option>
              {gestores.map(g => <option key={g.id} value={g.id}>{g.nome}</option>)}
            </select>
            <div className="text-xs text-gray-500 ml-auto self-center">{clinicasFiltradas.length} de {clinicas.length}</div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-800/40">
                <tr className="text-left text-[10px] uppercase text-gray-500">
                  <th className="p-3 font-semibold">Clínica</th>
                  <th className="p-3 font-semibold">Gestor</th>
                  <th className="p-3 font-semibold">Plataforma</th>
                  <th className="p-3 font-semibold text-right">Inv/mês</th>
                  <th className="p-3 font-semibold text-right">Leads hoje</th>
                  <th className="p-3 font-semibold text-right">CPL hoje</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Fase CS</th>
                </tr>
              </thead>
              <tbody>
                {clinicasFiltradas.map(c => {
                  const b = statusBadge(c.status_trafego)
                  return (
                    <tr key={c.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="p-3 text-white font-medium">
                        {c.nome}
                        {c.alertas_count > 0 && <span className="ml-2 text-red-400 text-[10px]">🔴 {c.alertas_count}</span>}
                      </td>
                      <td className="p-3 text-gray-400">{c.gestor_nome || '—'}</td>
                      <td className="p-3 text-gray-400 capitalize">{c.plataforma || '—'}</td>
                      <td className="p-3 text-right text-gray-300">{c.investimento_mensal > 0 ? fmtR(c.investimento_mensal) : '—'}</td>
                      <td className="p-3 text-right text-white font-semibold">{c.leads_hoje || '—'}</td>
                      <td className="p-3 text-right text-amber-400">{c.cpl_hoje > 0 ? fmtR(c.cpl_hoje) : '—'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${b.classe}`}>{b.label}</span>
                      </td>
                      <td className="p-3 text-gray-500 text-[10px]">{c.fase || '—'}</td>
                    </tr>
                  )
                })}
                {clinicasFiltradas.length === 0 && (
                  <tr><td colSpan={8} className="p-6 text-center text-gray-500">Nenhuma clínica com esses filtros</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA: GESTORES */}
      {aba === 'gestores' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {gestores.map(g => {
            const perfMap = {
              bom: { label: '🟢 Bom', classe: 'text-green-400' },
              atencao: { label: '⚠️ Atenção', classe: 'text-amber-400' },
              critico: { label: '🔴 Crítico', classe: 'text-red-400' },
            }
            const p = perfMap[g.performance]
            return (
              <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-bold text-sm">{g.nome}</div>
                    <div className="text-gray-500 text-[10px] mt-0.5">{g.email || g.whatsapp || '—'}</div>
                  </div>
                  <span className={`text-xs font-bold ${p.classe}`}>{p.label}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-800/40 rounded p-2">
                    <div className="text-[9px] uppercase text-gray-600">Clínicas</div>
                    <div className="text-white font-bold text-lg">{g.clinicas_count}<span className="text-gray-600 text-xs"> ({g.ativas})</span></div>
                  </div>
                  <div className="bg-gray-800/40 rounded p-2">
                    <div className="text-[9px] uppercase text-gray-600">CPL médio</div>
                    <div className="text-amber-400 font-bold text-lg">{fmtR(g.cpl_medio)}</div>
                  </div>
                  <div className="bg-gray-800/40 rounded p-2">
                    <div className="text-[9px] uppercase text-gray-600">Inv. mês</div>
                    <div className="text-blue-400 font-semibold text-sm">{fmtR(g.investimento_mes)}</div>
                  </div>
                  <div className="bg-gray-800/40 rounded p-2">
                    <div className="text-[9px] uppercase text-gray-600">Leads mês</div>
                    <div className="text-green-400 font-semibold text-sm">{g.leads_mes}</div>
                  </div>
                </div>
                {g.alertas_count > 0 && (
                  <div className="text-red-400 text-[10px] font-semibold">🚨 {g.alertas_count} alerta{g.alertas_count > 1 ? 's' : ''} aberto{g.alertas_count > 1 ? 's' : ''}</div>
                )}
              </div>
            )
          })}
          {gestores.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 text-sm">Nenhum gestor cadastrado ainda</div>
          )}
        </div>
      )}

      {/* ABA: LANÇAR MÉTRICAS */}
      {aba === 'lancar' && !readOnly && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 md:p-6 max-w-2xl">
          <h3 className="text-white font-bold mb-4">📈 Lançar métricas do dia</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Clínica</label>
              <select value={formClinica} onChange={e => setFormClinica(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white">
                <option value="">Selecione...</option>
                {clinicas.filter(c => c.gestor_id).map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Data</label>
              <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Leads</label>
              <input type="number" min="0" value={formLeads} onChange={e => setFormLeads(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Investimento (R$)</label>
              <input type="number" min="0" step="0.01" value={formInv} onChange={e => setFormInv(e.target.value)} placeholder="0.00" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Impressões</label>
              <input type="number" min="0" value={formImpressoes} onChange={e => setFormImpressoes(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Cliques</label>
              <input type="number" min="0" value={formCliques} onChange={e => setFormCliques(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white" />
            </div>
          </div>

          {Number(formLeads) > 0 && Number(formInv) > 0 && (
            <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/40 rounded-lg text-xs">
              <span className="text-amber-400 font-bold">CPL calculado: </span>
              <span className="text-white font-bold">{fmtR(Number(formInv) / Number(formLeads))}</span>
            </div>
          )}

          {formMsg && <div className={`mt-3 p-2 rounded text-xs ${formMsg.startsWith('✅') ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>{formMsg}</div>}

          <button
            onClick={lancarMetrica}
            disabled={formSalvando}
            className="mt-5 w-full bg-amber-500 hover:bg-amber-400 text-gray-950 rounded-lg px-5 py-3 text-sm font-bold transition disabled:opacity-60 min-h-[44px]"
          >
            {formSalvando ? 'Salvando...' : 'Salvar métrica'}
          </button>
        </div>
      )}
    </>
  )
}
