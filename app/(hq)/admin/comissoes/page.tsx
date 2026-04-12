'use client'

import { useEffect, useState, useMemo } from 'react'
import Sidebar from '../../../components/Sidebar'

type Config = {
  id: string
  closer_pct_venda: number
  sdr_valor_agendamento: number
  sdr_bonus_comparecimento: number
  sdr_bonus_venda: number
  bonus_equipe_patamar1_fech: number
  bonus_equipe_patamar1_closer: number
  bonus_equipe_patamar1_sdr: number
  bonus_equipe_patamar2_fech: number
  bonus_equipe_patamar2_closer: number
  bonus_equipe_patamar2_sdr: number
}

type Comissao = {
  id: string
  colaborador_email: string
  colaborador_nome: string | null
  role: 'closer' | 'sdr'
  tipo: 'venda' | 'agendamento' | 'comparecimento'
  valor: number
  mes: number
  ano: number
  data_evento: string
  lead_nome: string | null
  ticket_venda: number | null
  status: 'pendente' | 'aprovado' | 'pago' | 'cancelado'
}

type BonusEquipe = {
  id: string
  mes: number
  ano: number
  patamar: number
  fechamentos_mes: number
  total_bonus: number
  distribuicao: { closer: number; sdr: number }
  status: string
}

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })

export default function AdminComissoesPage() {
  const [cfg, setCfg] = useState<Config | null>(null)
  const [comissoes, setComissoes] = useState<Comissao[]>([])
  const [bonus, setBonus] = useState<BonusEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCfg, setSavingCfg] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<Config | null>(null)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroRole, setFiltroRole] = useState<string>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Simulador
  const [simVendas, setSimVendas] = useState(45)
  const [simTicket, setSimTicket] = useState(2400)

  const carregar = async () => {
    setLoading(true)
    const [cR, listR] = await Promise.all([
      fetch('/api/comissoes/config').then(r => r.json()),
      fetch('/api/comissoes').then(r => r.json()),
    ])
    if (cR.config) {
      const cfgNum = {
        ...cR.config,
        closer_pct_venda: Number(cR.config.closer_pct_venda),
        sdr_valor_agendamento: Number(cR.config.sdr_valor_agendamento),
        sdr_bonus_comparecimento: Number(cR.config.sdr_bonus_comparecimento),
        sdr_bonus_venda: Number(cR.config.sdr_bonus_venda),
        bonus_equipe_patamar1_closer: Number(cR.config.bonus_equipe_patamar1_closer),
        bonus_equipe_patamar1_sdr: Number(cR.config.bonus_equipe_patamar1_sdr),
        bonus_equipe_patamar2_closer: Number(cR.config.bonus_equipe_patamar2_closer),
        bonus_equipe_patamar2_sdr: Number(cR.config.bonus_equipe_patamar2_sdr),
      }
      setCfg(cfgNum)
      setForm(cfgNum)
    }
    setComissoes(listR.comissoes || [])
    setBonus(listR.bonus_equipe || [])
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const salvarCfg = async () => {
    if (!form) return
    setSavingCfg(true)
    setMsg('')
    const r = await fetch('/api/comissoes/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const j = await r.json()
    setSavingCfg(false)
    if (j.error) setMsg('❌ ' + j.error)
    else {
      setMsg('✅ Regras atualizadas')
      carregar()
    }
  }

  const aprovarSelecionadas = async (status: 'aprovado' | 'pago') => {
    if (selected.size === 0) return
    await fetch('/api/comissoes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    })
    setSelected(new Set())
    carregar()
  }

  const simulacao = useMemo(() => {
    if (!form) return null
    const closer = Math.round(simVendas * simTicket * form.closer_pct_venda)
    // SDR: 45 vendas → precisa ~257 agendamentos → ~180 reuniões pra bater
    // modelo simplificado: SDR total = agend × 8 + reunioes × 12 + vendas × 40
    const agend = Math.ceil(simVendas / 0.25 / 0.70) // vendas / fechamento / comparecimento
    const reun = Math.ceil(agend * 0.70)
    const sdrTotal =
      agend * form.sdr_valor_agendamento +
      reun * form.sdr_bonus_comparecimento +
      simVendas * form.sdr_bonus_venda
    const receita = simVendas * simTicket
    const totalComissao = closer + sdrTotal

    let bonusExtra = 0
    if (simVendas >= form.bonus_equipe_patamar2_fech) {
      bonusExtra = form.bonus_equipe_patamar2_closer + form.bonus_equipe_patamar2_sdr
    } else if (simVendas >= form.bonus_equipe_patamar1_fech) {
      bonusExtra = form.bonus_equipe_patamar1_closer + form.bonus_equipe_patamar1_sdr
    }

    return {
      closer,
      sdr: sdrTotal,
      agend,
      reun,
      receita,
      total: totalComissao + bonusExtra,
      bonusExtra,
      pctReceita: receita > 0 ? ((totalComissao + bonusExtra) / receita) * 100 : 0,
    }
  }, [form, simVendas, simTicket])

  const filtradas = useMemo(() => {
    return comissoes.filter(c => {
      if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false
      if (filtroRole !== 'todos' && c.role !== filtroRole) return false
      return true
    })
  }, [comissoes, filtroStatus, filtroRole])

  const totalPendente = filtradas
    .filter(c => c.status === 'pendente')
    .reduce((s, c) => s + Number(c.valor), 0)

  if (loading || !cfg || !form) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 p-6 overflow-auto text-gray-400">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="mb-6">
          <h1 className="text-white text-xl md:text-2xl font-bold">💰 Comissões & Bonificações</h1>
          <p className="text-gray-500 text-sm mt-1">
            Regras comerciais · simulador · aprovação · histórico
          </p>
        </div>

        {/* SEÇÃO 1 — REGRAS EDITÁVEIS */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">⚙️ Regras atuais</h2>

          <div className="mb-4">
            <p className="text-amber-400 text-xs font-semibold mb-2 uppercase">Closer (Guilherme)</p>
            <label className="block max-w-xs">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">% sobre primeira mensalidade</span>
              <input
                type="number"
                step="0.001"
                value={form.closer_pct_venda}
                onChange={e => setForm({ ...form, closer_pct_venda: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
              <span className="text-[10px] text-gray-600">
                {(form.closer_pct_venda * 100).toFixed(2)}% — ex: venda R$2.400 → R$
                {Math.round(2400 * form.closer_pct_venda)}
              </span>
            </label>
          </div>

          <div className="mb-4">
            <p className="text-amber-400 text-xs font-semibold mb-2 uppercase">SDR (Trindade) — escalonado</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">R$ por agendamento</span>
                <input
                  type="number"
                  value={form.sdr_valor_agendamento}
                  onChange={e => setForm({ ...form, sdr_valor_agendamento: Number(e.target.value) })}
                  className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">+ R$ se compareceu</span>
                <input
                  type="number"
                  value={form.sdr_bonus_comparecimento}
                  onChange={e => setForm({ ...form, sdr_bonus_comparecimento: Number(e.target.value) })}
                  className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                />
              </label>
              <label className="block">
                <span className="text-[10px] uppercase text-gray-500 font-semibold">+ R$ se fechou venda</span>
                <input
                  type="number"
                  value={form.sdr_bonus_venda}
                  onChange={e => setForm({ ...form, sdr_bonus_venda: Number(e.target.value) })}
                  className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                />
              </label>
            </div>
            <p className="text-[10px] text-gray-600 mt-1">
              Total máximo por conversão SDR: R$
              {form.sdr_valor_agendamento + form.sdr_bonus_comparecimento + form.sdr_bonus_venda}
            </p>
          </div>

          <div className="mb-4">
            <p className="text-amber-400 text-xs font-semibold mb-2 uppercase">Bônus de equipe</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-950/60 border border-blue-700/30 rounded-lg p-3">
                <p className="text-xs text-blue-400 font-semibold mb-2">⭐ Patamar 1 (meta alvo)</p>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500">Fechamentos</span>
                    <input
                      type="number"
                      value={form.bonus_equipe_patamar1_fech}
                      onChange={e => setForm({ ...form, bonus_equipe_patamar1_fech: Number(e.target.value) })}
                      className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500">Valor closer (R$)</span>
                    <input
                      type="number"
                      value={form.bonus_equipe_patamar1_closer}
                      onChange={e => setForm({ ...form, bonus_equipe_patamar1_closer: Number(e.target.value) })}
                      className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500">Valor SDR (R$)</span>
                    <input
                      type="number"
                      value={form.bonus_equipe_patamar1_sdr}
                      onChange={e => setForm({ ...form, bonus_equipe_patamar1_sdr: Number(e.target.value) })}
                      className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                    />
                  </label>
                </div>
              </div>

              <div className="bg-gray-950/60 border border-amber-700/30 rounded-lg p-3">
                <p className="text-xs text-amber-400 font-semibold mb-2">🚀 Patamar 2 (supermeta)</p>
                <div className="space-y-2">
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500">Fechamentos</span>
                    <input
                      type="number"
                      value={form.bonus_equipe_patamar2_fech}
                      onChange={e => setForm({ ...form, bonus_equipe_patamar2_fech: Number(e.target.value) })}
                      className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500">Valor closer (R$)</span>
                    <input
                      type="number"
                      value={form.bonus_equipe_patamar2_closer}
                      onChange={e => setForm({ ...form, bonus_equipe_patamar2_closer: Number(e.target.value) })}
                      className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase text-gray-500">Valor SDR (R$)</span>
                    <input
                      type="number"
                      value={form.bonus_equipe_patamar2_sdr}
                      onChange={e => setForm({ ...form, bonus_equipe_patamar2_sdr: Number(e.target.value) })}
                      className="w-full mt-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={salvarCfg}
              disabled={savingCfg}
              className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg px-5 py-2 text-sm min-h-[44px] disabled:opacity-50"
            >
              {savingCfg ? 'Salvando...' : '💾 Salvar regras'}
            </button>
            {msg && <span className="text-xs text-gray-400">{msg}</span>}
          </div>
        </div>

        {/* SEÇÃO 2 — SIMULADOR */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">🧮 Simulador ao vivo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Vendas no mês</span>
              <input
                type="number"
                value={simVendas}
                onChange={e => setSimVendas(Number(e.target.value))}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Ticket médio (R$)</span>
              <input
                type="number"
                value={simTicket}
                onChange={e => setSimTicket(Number(e.target.value))}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
          </div>
          {simulacao && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-emerald-950/30 border border-emerald-700/30 rounded-lg p-3">
                <p className="text-[10px] uppercase text-emerald-400 font-semibold">Closer</p>
                <p className="text-white text-lg font-bold">{fmtBRL(simulacao.closer)}</p>
              </div>
              <div className="bg-amber-950/30 border border-amber-700/30 rounded-lg p-3">
                <p className="text-[10px] uppercase text-amber-400 font-semibold">SDR</p>
                <p className="text-white text-lg font-bold">{fmtBRL(simulacao.sdr)}</p>
                <p className="text-[9px] text-gray-500">
                  {simulacao.agend} agend · {simulacao.reun} reun · {simVendas} venda
                </p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Bônus equipe</p>
                <p className="text-white text-lg font-bold">{fmtBRL(simulacao.bonusExtra)}</p>
              </div>
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                <p className="text-[10px] uppercase text-gray-500 font-semibold">Receita</p>
                <p className="text-white text-lg font-bold">{fmtBRL(simulacao.receita)}</p>
              </div>
              <div className="bg-gray-950 border-2 border-amber-500/40 rounded-lg p-3">
                <p className="text-[10px] uppercase text-amber-400 font-semibold">Empresa paga</p>
                <p className="text-white text-lg font-bold">{fmtBRL(simulacao.total)}</p>
                <p className="text-[9px] text-gray-500">{simulacao.pctReceita.toFixed(1)}% da receita</p>
              </div>
            </div>
          )}
        </div>

        {/* SEÇÃO 3 — HISTÓRICO + APROVAÇÃO */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="text-white text-sm font-bold">📋 Lançamentos do mês</h2>
            <div className="flex gap-2 flex-wrap">
              <select
                value={filtroRole}
                onChange={e => setFiltroRole(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-white text-xs min-h-[44px]"
              >
                <option value="todos">Todos</option>
                <option value="closer">Closer</option>
                <option value="sdr">SDR</option>
              </select>
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-2 py-1 text-white text-xs min-h-[44px]"
              >
                <option value="todos">Qualquer status</option>
                <option value="pendente">Pendente</option>
                <option value="aprovado">Aprovado</option>
                <option value="pago">Pago</option>
              </select>
              <button
                onClick={() => aprovarSelecionadas('aprovado')}
                disabled={selected.size === 0}
                className="bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-lg px-3 py-1 text-xs min-h-[44px] disabled:opacity-50"
              >
                ✓ Aprovar ({selected.size})
              </button>
              <button
                onClick={() => aprovarSelecionadas('pago')}
                disabled={selected.size === 0}
                className="bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold rounded-lg px-3 py-1 text-xs min-h-[44px] disabled:opacity-50"
              >
                💵 Marcar pago ({selected.size})
              </button>
            </div>
          </div>

          <div className="mb-2 text-[11px] text-gray-500">
            Pendente do filtro: <span className="text-amber-400 font-semibold">{fmtBRL(totalPendente)}</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="text-left text-[10px] uppercase text-gray-500 font-semibold border-b border-gray-800">
                  <th className="py-2 w-10">
                    <input
                      type="checkbox"
                      onChange={e =>
                        setSelected(
                          e.target.checked
                            ? new Set(filtradas.filter(c => c.status === 'pendente').map(c => c.id))
                            : new Set(),
                        )
                      }
                    />
                  </th>
                  <th className="py-2">Data</th>
                  <th className="py-2">Colaborador</th>
                  <th className="py-2">Tipo</th>
                  <th className="py-2">Lead</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                {filtradas.map(c => (
                  <tr key={c.id} className="border-b border-gray-800/60">
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        disabled={c.status !== 'pendente'}
                        onChange={e => {
                          const ns = new Set(selected)
                          if (e.target.checked) ns.add(c.id)
                          else ns.delete(c.id)
                          setSelected(ns)
                        }}
                      />
                    </td>
                    <td className="py-2 text-[11px] text-gray-400">
                      {new Date(c.data_evento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-2">{c.colaborador_nome || c.colaborador_email}</td>
                    <td className="py-2 text-[11px]">
                      {c.tipo === 'venda' ? '💰 Venda' : c.tipo === 'comparecimento' ? '🤝 Reunião' : '📅 Agend.'}
                    </td>
                    <td className="py-2 text-[11px]">{c.lead_nome || '—'}</td>
                    <td className="py-2 text-right font-semibold text-emerald-400">{fmtBRL(Number(c.valor))}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          c.status === 'pago'
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : c.status === 'aprovado'
                              ? 'bg-blue-900/50 text-blue-400'
                              : c.status === 'pendente'
                                ? 'bg-yellow-900/50 text-yellow-400'
                                : 'bg-gray-800 text-gray-500'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-gray-500 text-xs">
                      Nenhum lançamento com esses filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SEÇÃO 4 — BÔNUS DE EQUIPE */}
        {bonus.length > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 md:p-5">
            <h2 className="text-amber-400 text-sm font-bold mb-3">🏆 Bônus de equipe desbloqueado(s)</h2>
            {bonus.map(b => (
              <div key={b.id} className="flex items-center justify-between text-xs text-gray-300 py-1">
                <span>
                  Patamar {b.patamar} — {b.fechamentos_mes} fechamentos
                </span>
                <span className="font-bold text-white">{fmtBRL(Number(b.total_bonus))}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
