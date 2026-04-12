'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'

type NivelMeta = 'minima' | 'alvo' | 'super'

type Funil = {
  receita: number
  mensal: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  diario: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  semanal: { vendas: number; comparecimentos: number; agendamentos: number; qualificados: number; leads: number }
  custos: { investimento_mensal: number; investimento_diario: number; cac: number; custo_reuniao: number }
}

type EmpresaConfig = {
  nivel_meta: NivelMeta
  receita_minima: number
  receita_alvo: number
  receita_super: number
  ticket_medio: number
  cpl_medio: number
  taxa_qualificacao: number
  taxa_agendamento: number
  taxa_comparecimento: number
  taxa_fechamento: number
  sdr_agendamentos_dia: number
  comissao_closer_pct: number
  updated_at: string
}

type Calendario = {
  ano: number
  mes: number
  total: number
  passados: number
  faltando: number
  semanas: number
  hoje_util: boolean
  feriados_no_mes: string[]
}

type Alerta = {
  etapa: string
  nivel: 'critico' | 'atencao'
  valor_real: number
  limite: number
  mensagem: string
  acao: string
}

type Sensibilidade = {
  base: Funil
  ganhos: {
    agendamento: { reuniao_extra: number; vendas_extra: number; receita_extra: number }
    comparecimento: { reuniao_extra: number; vendas_extra: number; receita_extra: number }
    fechamento: { vendas_extra: number; receita_extra: number }
  }
}

type MetasResp = {
  config: EmpresaConfig
  calendario: Calendario
  funis: Record<NivelMeta, Funil>
  ativo: Funil
  taxas_reais: { qualificacao: number; agendamento: number; comparecimento: number; fechamento: number }
  cac_atual: { valor: number; zona: 'saudavel' | 'atencao' | 'critico' }
  cac_zonas: { saudavel_max: number; atencao_max: number }
  alertas: Alerta[]
  sensibilidade: Sensibilidade
  gargalo: { etapa: string; meta: number; real: number; impacto_pct: number } | null
  sdr_dinamico: {
    diario: { agendamentos: number; reunioes: number; noshow: number; vendas: number; qualificados: number; leads: number }
    mensal: { agendamentos: number; reunioes: number; vendas: number; qualificados: number; leads: number; receita: number }
  }
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtInt = (v: number) => v.toLocaleString('pt-BR')
const fmtPct = (v: number) => `${(v * 100).toFixed(0)}%`

const CARD_META: Record<NivelMeta, { label: string; emoji: string; cor: string }> = {
  minima: { label: 'Meta Mínima', emoji: '🛡️', cor: '#6b7280' },
  alvo: { label: 'Meta Alvo', emoji: '⭐', cor: '#f59e0b' },
  super: { label: 'Supermeta', emoji: '🚀', cor: '#22c55e' },
}

function corZonaCAC(zona: 'saudavel' | 'atencao' | 'critico'): string {
  if (zona === 'saudavel') return '#22c55e'
  if (zona === 'atencao') return '#fbbf24'
  return '#ef4444'
}

export default function AdminMetasPage() {
  const [data, setData] = useState<MetasResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    nivel_meta: 'alvo' as NivelMeta,
    ticket_medio: 2000,
    cpl_medio: 10.7,
    sdr_agendamentos_dia: 12,
    taxa_fechamento: 0.25,
    receita_alvo: 90000,
    receita_minima: 74000,
    receita_super: 106000,
  })

  const carregar = async () => {
    setLoading(true)
    const r = await fetch('/api/admin/metas')
    const j = await r.json()
    if (!j.error) {
      setData(j)
      setForm({
        nivel_meta: j.config.nivel_meta,
        ticket_medio: Number(j.config.ticket_medio),
        cpl_medio: Number(j.config.cpl_medio),
        sdr_agendamentos_dia: j.config.sdr_agendamentos_dia,
        taxa_fechamento: Number(j.config.taxa_fechamento),
        receita_alvo: Number(j.config.receita_alvo),
        receita_minima: Number(j.config.receita_minima),
        receita_super: Number(j.config.receita_super),
      })
    }
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  const salvar = async () => {
    setSaving(true)
    setMsg('')
    const r = await fetch('/api/admin/metas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nivel_meta: form.nivel_meta,
        ticket_medio: form.ticket_medio,
        cpl_medio: form.cpl_medio,
        sdr_agendamentos_dia: form.sdr_agendamentos_dia,
        taxa_fechamento: form.taxa_fechamento,
        receita_alvo: form.receita_alvo,
        receita_minima: form.receita_minima,
        receita_super: form.receita_super,
      }),
    })
    const j = await r.json()
    setSaving(false)
    if (j.error) setMsg('❌ ' + j.error)
    else {
      setMsg('✅ Salvo e recalculado')
      await carregar()
    }
  }

  const selecionarNivel = (nivel: NivelMeta) => setForm(f => ({ ...f, nivel_meta: nivel }))

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 p-6 overflow-auto">
          <div className="text-gray-400">Carregando metas...</div>
        </div>
      </div>
    )
  }

  const { calendario, funis, taxas_reais, cac_atual, alertas, sensibilidade, gargalo, sdr_dinamico } = data
  const ativo = funis[form.nivel_meta]

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-white text-xl md:text-2xl font-bold">🎯 Metas & Funil</h1>
          <p className="text-gray-500 text-sm mt-1">
            📅 {MESES[calendario.mes - 1]} {calendario.ano} · {calendario.total} dias úteis ·{' '}
            {calendario.passados} passados · {calendario.faltando} faltando ·{' '}
            {calendario.hoje_util ? 'hoje é dia útil' : 'hoje não é dia útil'}
          </p>
        </div>

        {/* RESUMO EXECUTIVO */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">📊 Resumo executivo</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Receita meta</p>
              <p className="text-amber-400 text-xl font-bold">{fmtBRL(ativo.receita)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Investimento</p>
              <p className="text-white text-xl font-bold">{fmtBRL(ativo.custos.investimento_mensal)}</p>
              <p className="text-[9px] text-gray-600">{fmtBRL(ativo.custos.investimento_diario)}/dia</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">CAC estimado</p>
              <p className="text-xl font-bold" style={{ color: corZonaCAC(cac_atual.zona) }}>
                {fmtBRL(cac_atual.valor)}
              </p>
              <p className="text-[9px] text-gray-600 capitalize">{cac_atual.zona}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Custo/reunião</p>
              <p className="text-white text-xl font-bold">{fmtBRL(ativo.custos.custo_reuniao)}</p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 1 — SELETOR DE NÍVEL */}
        <div className="mb-6">
          <h2 className="text-white text-sm font-bold mb-3 px-1">1️⃣ Escolha o nível de meta</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(['minima', 'alvo', 'super'] as NivelMeta[]).map(nivel => {
              const f = funis[nivel]
              const isAtivo = form.nivel_meta === nivel
              const cfg = CARD_META[nivel]
              return (
                <button
                  key={nivel}
                  onClick={() => selecionarNivel(nivel)}
                  className={`text-left rounded-2xl p-4 transition-all min-h-[44px] ${
                    isAtivo ? 'border-2' : 'border border-gray-800 hover:border-gray-700'
                  }`}
                  style={{
                    background: isAtivo ? `${cfg.cor}10` : '#111827',
                    borderColor: isAtivo ? cfg.cor : undefined,
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xl">{cfg.emoji}</span>
                    {isAtivo && (
                      <span
                        className="text-[9px] font-bold uppercase px-2 py-0.5 rounded"
                        style={{ background: cfg.cor, color: '#030712' }}
                      >
                        ATIVA
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] uppercase text-gray-500 font-semibold">{cfg.label}</p>
                  <p className="text-white text-2xl font-bold mt-1">{fmtBRL(f.receita)}</p>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-[10px]">
                    <div>
                      <p className="text-gray-500">Vendas/mês</p>
                      <p className="text-white font-semibold">{f.mensal.vendas}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Reuniões/mês</p>
                      <p className="text-white font-semibold">{f.mensal.comparecimentos}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Agend./mês</p>
                      <p className="text-white font-semibold">{f.mensal.agendamentos}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Leads/mês</p>
                      <p className="text-white font-semibold">{fmtInt(f.mensal.leads)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Invest.</p>
                      <p className="text-white font-semibold">{fmtBRL(f.custos.investimento_mensal)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">CAC</p>
                      <p className="text-white font-semibold">{fmtBRL(f.custos.cac)}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* SEÇÃO 2 — PREMISSAS EDITÁVEIS */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">2️⃣ Premissas do negócio</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Ticket médio (R$)</span>
              <input
                type="number"
                value={form.ticket_medio}
                onChange={e => setForm({ ...form, ticket_medio: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">CPL médio (R$)</span>
              <input
                type="number"
                step="0.01"
                value={form.cpl_medio}
                onChange={e => setForm({ ...form, cpl_medio: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">SDR agendamentos/dia</span>
              <input
                type="number"
                value={form.sdr_agendamentos_dia}
                onChange={e => setForm({ ...form, sdr_agendamentos_dia: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Taxa fechamento (%)</span>
              <input
                type="number"
                step="0.01"
                value={form.taxa_fechamento}
                onChange={e => setForm({ ...form, taxa_fechamento: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Receita mínima (R$)</span>
              <input
                type="number"
                value={form.receita_minima}
                onChange={e => setForm({ ...form, receita_minima: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Receita alvo (R$)</span>
              <input
                type="number"
                value={form.receita_alvo}
                onChange={e => setForm({ ...form, receita_alvo: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase text-gray-500 font-semibold">Supermeta (R$)</span>
              <input
                type="number"
                value={form.receita_super}
                onChange={e => setForm({ ...form, receita_super: Number(e.target.value) })}
                className="w-full mt-1 bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm min-h-[44px]"
              />
            </label>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={salvar}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg px-5 py-2 text-sm min-h-[44px] disabled:opacity-50"
            >
              {saving ? 'Salvando...' : '💾 Salvar e recalcular tudo'}
            </button>
            {msg && <span className="text-xs text-gray-400">{msg}</span>}
          </div>
        </div>

        {/* SEÇÃO 3 — FUNIL CALCULADO (TABELA) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6 overflow-x-auto">
          <h2 className="text-white text-sm font-bold mb-3">3️⃣ Funil calculado · {CARD_META[form.nivel_meta].label}</h2>
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="text-left text-[10px] uppercase text-gray-500 font-semibold border-b border-gray-800">
                <th className="py-2">Etapa</th>
                <th className="py-2 text-right">Mês</th>
                <th className="py-2 text-right">Semana</th>
                <th className="py-2 text-right">Dia</th>
                <th className="py-2 text-right">Responsável</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800/60">
                <td className="py-2 font-semibold text-amber-400">💰 Receita</td>
                <td className="py-2 text-right font-bold text-amber-400">{fmtBRL(ativo.receita)}</td>
                <td className="py-2 text-right">{fmtBRL(ativo.receita / (calendario.semanas || 4.33))}</td>
                <td className="py-2 text-right">{fmtBRL(ativo.receita / (calendario.total || 22))}</td>
                <td className="py-2 text-right text-[10px]">—</td>
              </tr>
              <tr className="border-b border-gray-800/60">
                <td className="py-2">Vendas</td>
                <td className="py-2 text-right font-semibold">{ativo.mensal.vendas}</td>
                <td className="py-2 text-right">{ativo.semanal.vendas}</td>
                <td className="py-2 text-right">{ativo.diario.vendas}</td>
                <td className="py-2 text-right text-[10px]">Closer</td>
              </tr>
              <tr className="border-b border-gray-800/60">
                <td className="py-2">Reuniões</td>
                <td className="py-2 text-right font-semibold">{ativo.mensal.comparecimentos}</td>
                <td className="py-2 text-right">{ativo.semanal.comparecimentos}</td>
                <td className="py-2 text-right">{ativo.diario.comparecimentos}</td>
                <td className="py-2 text-right text-[10px]">SDR→Closer</td>
              </tr>
              <tr className="border-b border-gray-800/60">
                <td className="py-2">Agendamentos</td>
                <td className="py-2 text-right font-semibold">{ativo.mensal.agendamentos}</td>
                <td className="py-2 text-right">{ativo.semanal.agendamentos}</td>
                <td className="py-2 text-right">{ativo.diario.agendamentos}</td>
                <td className="py-2 text-right text-[10px]">SDR</td>
              </tr>
              <tr className="border-b border-gray-800/60">
                <td className="py-2">Qualificados</td>
                <td className="py-2 text-right font-semibold">{fmtInt(ativo.mensal.qualificados)}</td>
                <td className="py-2 text-right">{ativo.semanal.qualificados}</td>
                <td className="py-2 text-right">{ativo.diario.qualificados}</td>
                <td className="py-2 text-right text-[10px]">SDR</td>
              </tr>
              <tr className="border-b border-gray-800/60">
                <td className="py-2">Leads</td>
                <td className="py-2 text-right font-semibold">{fmtInt(ativo.mensal.leads)}</td>
                <td className="py-2 text-right">{ativo.semanal.leads}</td>
                <td className="py-2 text-right">{ativo.diario.leads}</td>
                <td className="py-2 text-right text-[10px]">Tráfego</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-500">Investimento</td>
                <td className="py-2 text-right text-gray-400">{fmtBRL(ativo.custos.investimento_mensal)}</td>
                <td className="py-2 text-right text-gray-500">—</td>
                <td className="py-2 text-right text-gray-500">{fmtBRL(ativo.custos.investimento_diario)}</td>
                <td className="py-2 text-right text-[10px]">Tráfego</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[10px] text-gray-600 mt-3">
            Baseado em {calendario.total} dias úteis de {MESES[calendario.mes - 1]} {calendario.ano}
          </p>
        </div>

        {/* SEÇÃO 4 — TAXAS REAIS VS META + GARGALO */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">4️⃣ Taxas reais vs meta</h2>
          {gargalo && (
            <div className="mb-3 bg-red-500/10 border border-red-500/40 rounded-lg p-3">
              <p className="text-red-400 font-bold text-sm">
                🚨 Gargalo: {gargalo.etapa} — {fmtPct(gargalo.real)} real vs {fmtPct(gargalo.meta)} meta
              </p>
              <p className="text-red-300/80 text-[11px] mt-1">
                Impacto: {gargalo.impacto_pct}pp abaixo — priorizar correção dessa etapa antes de escalar.
              </p>
            </div>
          )}
          <div className="space-y-3">
            {(['qualificacao', 'agendamento', 'comparecimento', 'fechamento'] as const).map(etapa => {
              const real = taxas_reais[etapa]
              const meta = form.nivel_meta === 'minima'
                ? [0.7, 0.35, 0.7, 0.25][['qualificacao', 'agendamento', 'comparecimento', 'fechamento'].indexOf(etapa)]
                : [0.7, 0.35, 0.7, form.taxa_fechamento][['qualificacao', 'agendamento', 'comparecimento', 'fechamento'].indexOf(etapa)]
              const pctReal = (real / meta) * 100
              const cor = pctReal >= 100 ? '#22c55e' : pctReal >= 90 ? '#fbbf24' : '#ef4444'
              return (
                <div key={etapa}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 capitalize">{etapa}</span>
                    <span className="text-gray-300">
                      <span style={{ color: cor }}>{fmtPct(real)}</span>
                      <span className="text-gray-600"> / meta {fmtPct(meta)}</span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${Math.min(100, pctReal)}%`, background: cor }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* SEÇÃO 5 — SDR DINÂMICO */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">5️⃣ SDR — metas baseadas em {form.sdr_agendamentos_dia} agend/dia</h2>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Leads/dia</p>
              <p className="text-white text-lg font-bold">{sdr_dinamico.diario.leads}</p>
              <p className="text-[9px] text-gray-600">{fmtInt(sdr_dinamico.mensal.leads)}/mês</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Qualif./dia</p>
              <p className="text-white text-lg font-bold">{sdr_dinamico.diario.qualificados}</p>
              <p className="text-[9px] text-gray-600">{fmtInt(sdr_dinamico.mensal.qualificados)}/mês</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Agend./dia</p>
              <p className="text-amber-400 text-lg font-bold">{sdr_dinamico.diario.agendamentos}</p>
              <p className="text-[9px] text-gray-600">{sdr_dinamico.mensal.agendamentos}/mês</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Reuniões/dia</p>
              <p className="text-white text-lg font-bold">{sdr_dinamico.diario.reunioes}</p>
              <p className="text-[9px] text-gray-600">{sdr_dinamico.mensal.reunioes}/mês</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">No-show esperado</p>
              <p className="text-white text-lg font-bold">{sdr_dinamico.diario.noshow}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-gray-500 font-semibold">Vendas/dia</p>
              <p className="text-green-400 text-lg font-bold">{sdr_dinamico.diario.vendas}</p>
              <p className="text-[9px] text-gray-600">{sdr_dinamico.mensal.vendas}/mês</p>
            </div>
          </div>
        </div>

        {/* SEÇÃO 6 — ALERTAS + AÇÕES */}
        {alertas.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
            <h2 className="text-white text-sm font-bold mb-3">6️⃣ Alertas e ações recomendadas</h2>
            <div className="space-y-2">
              {alertas.map((a, i) => (
                <div
                  key={i}
                  className="rounded-lg p-3 border"
                  style={{
                    background: a.nivel === 'critico' ? '#ef444410' : '#fbbf2410',
                    borderColor: a.nivel === 'critico' ? '#ef444440' : '#fbbf2440',
                  }}
                >
                  <p className="text-sm font-bold" style={{ color: a.nivel === 'critico' ? '#ef4444' : '#fbbf24' }}>
                    {a.nivel === 'critico' ? '🚨' : '⚠️'} {a.mensagem}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1">→ {a.acao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SEÇÃO 7 — SENSIBILIDADE */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-white text-sm font-bold mb-3">7️⃣ Análise de sensibilidade (+5pp em cada taxa)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold">+5pp Agendamento</p>
              <p className="text-green-400 text-xl font-bold mt-1">+{fmtBRL(sensibilidade.ganhos.agendamento.receita_extra)}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                +{sensibilidade.ganhos.agendamento.vendas_extra} vendas · +{sensibilidade.ganhos.agendamento.reuniao_extra} reuniões
              </p>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold">+5pp Comparecimento</p>
              <p className="text-green-400 text-xl font-bold mt-1">+{fmtBRL(sensibilidade.ganhos.comparecimento.receita_extra)}</p>
              <p className="text-[10px] text-gray-500 mt-1">
                +{sensibilidade.ganhos.comparecimento.vendas_extra} vendas · +{sensibilidade.ganhos.comparecimento.reuniao_extra} reuniões
              </p>
            </div>
            <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold">+5pp Fechamento</p>
              <p className="text-green-400 text-xl font-bold mt-1">+{fmtBRL(sensibilidade.ganhos.fechamento.receita_extra)}</p>
              <p className="text-[10px] text-gray-500 mt-1">+{sensibilidade.ganhos.fechamento.vendas_extra} vendas</p>
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-3">
            Simulação com o mesmo investimento/leads do nível ativo. Prioridade de correção = maior ganho de receita.
          </p>
        </div>

        {/* SEÇÃO 8 — PRÓXIMA AÇÃO */}
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-4 md:p-5 mb-6">
          <h2 className="text-amber-400 text-sm font-bold mb-2">⚔️ Próxima ação recomendada</h2>
          <p className="text-white text-sm">
            {gargalo
              ? `Corrigir gargalo de ${gargalo.etapa} (${fmtPct(gargalo.real)}) antes de escalar tráfego.`
              : cac_atual.zona === 'critico'
                ? `CAC ${fmtBRL(cac_atual.valor)} acima do teto — parar escala e revisar funil.`
                : cac_atual.zona === 'atencao'
                  ? `CAC ${fmtBRL(cac_atual.valor)} em zona de atenção — monitorar de perto.`
                  : `CAC saudável · escalar tráfego com segurança.`}
          </p>
        </div>
      </div>
    </div>
  )
}
