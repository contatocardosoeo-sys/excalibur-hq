'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../../components/Sidebar'
import { useToast } from '../../../components/Toast'

/* ── Types ── */
type Receber = { id: string; data_vencimento: string; cliente_nome: string; clinica_id: string | null; plano: string; valor: number; status: string; data_pagamento: string | null; observacao: string | null }
type Pagar = { id: string; data_vencimento: string; descricao: string; tipo: string; valor: number; status: string; data_pagamento: string | null; observacao: string | null }
type Resumo = { caixa: number; recebido: number; total_receber: number; pago: number; total_pagar: number; tx_pagamento: number; tx_atraso: number; inadimplentes: { nome: string; valor: number; plano: string }[]; mes_anterior: { caixa: number; recebido: number; pago: number } }

/* ── Constants ── */
const PLANOS = [
  { nome: 'Completo (sem fidelidade)', valor: 3500 },
  { nome: 'Completo (90 dias garantia)', valor: 3000 },
  { nome: 'Apenas Financeira', valor: 1000 },
  { nome: 'Apenas Marketing', valor: 1500 },
  { nome: 'Outro', valor: 0 },
]
const TIPOS_DESPESA = [
  { key: 'prolabore', label: 'Prolabore', icon: '👤', cor: '#1e40af' },
  { key: 'colaborador', label: 'Colaborador', icon: '👥', cor: '#3b82f6' },
  { key: 'ferramenta', label: 'Ferramenta', icon: '🔧', cor: '#6b7280' },
  { key: 'marketing', label: 'Marketing', icon: '📣', cor: '#f97316' },
  { key: 'aluguel', label: 'Aluguel', icon: '🏢', cor: '#8b5cf6' },
  { key: 'outro', label: 'Outro', icon: '📦', cor: '#4b5563' },
]
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/* ── Helpers ── */
function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function fmtShort(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtDate(d: string) { if (!d) return '-'; const dt = new Date(d + 'T12:00:00'); return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}` }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }

function normalizarPlano(p: string): string {
  const l = (p || '').toLowerCase().trim()
  if (l.includes('completo') || l === '') return 'Completo'
  if (l.includes('financeira') || l.includes('solucao') || l.includes('solução')) return 'Financeira'
  if (l.includes('trafego') || l.includes('tráfego') || l.includes('marketing')) return 'Marketing'
  if (l.includes('aviso') || l.includes('previo') || l.includes('prévio')) return 'Aviso Previo'
  if (l.includes('crm') || l.includes('whatsapp')) return 'CRM'
  if (l.includes('saida') || l.includes('saída')) return 'Saida'
  return p || 'Outro'
}

function diasAteVencimento(d: string): number {
  if (!d) return 999
  const venc = new Date(d + 'T12:00:00')
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0)
  return Math.ceil((venc.getTime() - hoje.getTime()) / 86400000)
}

function semanaDoMes(d: string): number {
  if (!d) return 1
  const dia = new Date(d + 'T12:00:00').getDate()
  if (dia <= 7) return 1
  if (dia <= 14) return 2
  if (dia <= 21) return 3
  return 4
}

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = '\uFEFF'
  const csv = bom + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function planoBadge(p: string) {
  const norm = normalizarPlano(p)
  const map: Record<string, { bg: string; cor: string }> = {
    'Completo': { bg: '#3b82f620', cor: '#60a5fa' },
    'Financeira': { bg: '#8b5cf620', cor: '#a78bfa' },
    'Marketing': { bg: '#22c55e20', cor: '#4ade80' },
    'Aviso Previo': { bg: '#f9731620', cor: '#fb923c' },
    'CRM': { bg: '#6b728020', cor: '#9ca3af' },
    'Saida': { bg: '#ef444420', cor: '#f87171' },
  }
  const s = map[norm] || { bg: '#37415120', cor: '#9ca3af' }
  return <span style={{ background: s.bg, color: s.cor, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>{norm}</span>
}

function vencimentoBadge(d: string, status: string) {
  if (status === 'pago') return null
  const dias = diasAteVencimento(d)
  if (dias < 0) return <span style={{ color: '#f87171', fontSize: 9, fontWeight: 600 }}>vencido ha {Math.abs(dias)}d</span>
  if (dias <= 3) return <span style={{ color: '#fbbf24', fontSize: 9, fontWeight: 600 }}>vence em {dias}d</span>
  return null
}

function statusBadge(s: string) {
  const m: Record<string, { bg: string; text: string; label: string }> = {
    pago: { bg: '#14532d', text: '#4ade80', label: 'Pago' },
    pendente: { bg: '#713f1220', text: '#fbbf24', label: 'Pendente' },
    atrasado: { bg: '#7f1d1d20', text: '#f87171', label: 'Atrasado' },
  }
  const st = m[s] || m.pendente
  return <span style={{ background: st.bg, color: st.text, padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.02em' }}>{st.label}</span>
}

function tipoBadge(tipo: string) {
  const t = TIPOS_DESPESA.find(x => x.key === tipo) || TIPOS_DESPESA[5]
  return <span style={{ background: t.cor + '20', color: t.cor, padding: '2px 10px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{t.icon} {t.label}</span>
}

const inp: React.CSSProperties = { width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

/* ── Skeleton ── */
function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[1, 2, 3, 4].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 80, animation: 'pulse 1.5s infinite' }} />)}
      </div>
      <div style={{ background: '#111827', borderRadius: 12, height: 10, width: '100%', animation: 'pulse 1.5s infinite' }} />
      {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ background: '#111827', borderRadius: 8, height: 48, animation: 'pulse 1.5s infinite' }} />)}
      <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
    </div>
  )
}

/* ── Section Header ── */
function SectionHeader({ icon, title, count, total, color }: { icon: string; title: string; count: number; total: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: color + '10', borderBottom: `1px solid ${color}30` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        <span style={{ background: color + '30', color, padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{count}</span>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{fmtShort(total)}</span>
    </div>
  )
}

/* ══════════════════════════════════════════ COMPONENT ══════════════════════════════════════════ */

export default function FinanceiroOperacao() {
  const { toast } = useToast()
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [aba, setAba] = useState<'receber' | 'pagar' | 'resumo'>('receber')
  const [loading, setLoading] = useState(true)
  const [showPagos, setShowPagos] = useState(false)

  const [receber, setReceber] = useState<Receber[]>([])
  const [totaisR, setTotaisR] = useState({ total_previsto: 0, total_recebido: 0, total_pendente: 0, total_atrasado: 0 })
  const [pagar, setPagar] = useState<Pagar[]>([])
  const [totaisP, setTotaisP] = useState({ total_previsto: 0, total_pago: 0, total_apagar: 0 })
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [clinicas, setClinicas] = useState<{ id: string; nome: string }[]>([])

  const [modalReceber, setModalReceber] = useState(false)
  const [modalPagar, setModalPagar] = useState(false)
  const [editItem, setEditItem] = useState<{ tabela: 'receber' | 'pagar'; item: Receber | Pagar } | null>(null)
  const [formR, setFormR] = useState({ data_vencimento: '', cliente_nome: '', clinica_id: '', plano: 'Completo (90 dias garantia)', valor: '3000', observacao: '' })
  const [formP, setFormP] = useState({ data_vencimento: '', descricao: '', tipo: 'outro', valor: '', observacao: '' })
  const [saving, setSaving] = useState(false)
  const [busca, setBusca] = useState('')
  const [historico, setHistorico] = useState<{ mes: string; recebido: number; pago: number }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const q = `mes=${mes}&ano=${ano}`
    const [rRes, pRes, sRes, cRes] = await Promise.all([
      fetch(`/api/financeiro/receber?${q}`).then(r => r.json()),
      fetch(`/api/financeiro/pagar?${q}`).then(r => r.json()),
      fetch(`/api/financeiro/resumo?${q}`).then(r => r.json()),
      fetch('/api/cs/cockpit').then(r => r.json()),
    ])
    setReceber(rRes.items || []); setTotaisR(rRes.totais || {})
    setPagar(pRes.items || []); setTotaisP(pRes.totais || {})
    setResumo(sRes)
    setClinicas(cRes.clinicas || [])
    // Historico ultimos 4 meses para mini-grafico
    const meses4 = []
    for (let i = 3; i >= 0; i--) {
      let m = mes - i, a = ano
      if (m <= 0) { m += 12; a-- }
      meses4.push({ m, a })
    }
    const hist = await Promise.all(meses4.map(async ({ m, a }) => {
      const r = await fetch(`/api/financeiro/resumo?mes=${m}&ano=${a}`).then(x => x.json())
      return { mes: MESES[m - 1]?.substring(0, 3) || '', recebido: r.recebido || 0, pago: r.pago || 0 }
    }))
    setHistorico(hist)
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { load() }, [load])

  const marcarPago = async (tabela: 'receber' | 'pagar', id: string) => {
    try {
      const r = await fetch(`/api/financeiro/${tabela}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'pago' }) })
      if (!r.ok) throw new Error('falha')
      toast('success', 'Marcado como pago')
      load()
    } catch {
      toast('error', 'Erro ao marcar como pago')
    }
  }

  const criarReceber = async () => {
    if (!formR.cliente_nome || !formR.data_vencimento) {
      toast('error', 'Preencha cliente e data de vencimento')
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/financeiro/receber', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formR, valor: Number(formR.valor) || 0, clinica_id: formR.clinica_id || null }) })
      if (!r.ok) throw new Error('falha')
      toast('success', `Lancamento de R$${formR.valor} salvo`)
      setFormR({ data_vencimento: '', cliente_nome: '', clinica_id: '', plano: 'Completo (90 dias garantia)', valor: '3000', observacao: '' })
      setModalReceber(false); load()
    } catch {
      toast('error', 'Erro ao salvar lancamento')
    }
    setSaving(false)
  }

  const criarPagar = async () => {
    if (!formP.descricao || !formP.data_vencimento) {
      toast('error', 'Preencha descricao e data de vencimento')
      return
    }
    setSaving(true)
    try {
      const r = await fetch('/api/financeiro/pagar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formP, valor: Number(formP.valor) || 0 }) })
      if (!r.ok) throw new Error('falha')
      toast('success', `Despesa de R$${formP.valor} salva`)
      setFormP({ data_vencimento: '', descricao: '', tipo: 'outro', valor: '', observacao: '' })
      setModalPagar(false); load()
    } catch {
      toast('error', 'Erro ao salvar despesa')
    }
    setSaving(false)
  }

  const onPlanoChange = (plano: string) => { const p = PLANOS.find(x => x.nome === plano); setFormR({ ...formR, plano, valor: String(p?.valor || 0) }) }
  const onClinicaSelect = (nome: string) => { const c = clinicas.find(x => x.nome === nome); setFormR({ ...formR, cliente_nome: nome, clinica_id: c?.id || '' }) }

  const salvarEdicao = async () => {
    if (!editItem) return
    setSaving(true)
    try {
      const { tabela, item } = editItem
      const r = await fetch(`/api/financeiro/${tabela}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) })
      if (!r.ok) throw new Error('falha')
      toast('success', 'Alteracoes salvas')
      setEditItem(null); load()
    } catch {
      toast('error', 'Erro ao salvar alteracoes')
    }
    setSaving(false)
  }

  const exportarReceber = () => {
    exportCSV(`receber_${MESES[mes-1]}_${ano}.csv`,
      ['Data', 'Cliente', 'Plano', 'Valor', 'Status'],
      receber.map(r => [fmtDate(r.data_vencimento), r.cliente_nome, normalizarPlano(r.plano), String(Number(r.valor)), r.status])
    )
  }
  const exportarPagar = () => {
    exportCSV(`pagar_${MESES[mes-1]}_${ano}.csv`,
      ['Data', 'Descricao', 'Tipo', 'Valor', 'Status'],
      pagar.map(p => [fmtDate(p.data_vencimento), p.descricao, p.tipo, String(Number(p.valor)), p.status])
    )
  }

  /* ── Derived data ── */
  const buscaLower = busca.toLowerCase()
  const receberFiltrado = busca ? receber.filter(r => r.cliente_nome.toLowerCase().includes(buscaLower) || (r.plano || '').toLowerCase().includes(buscaLower) || (r.observacao || '').toLowerCase().includes(buscaLower)) : receber
  const pagarFiltrado = busca ? pagar.filter(p => p.descricao.toLowerCase().includes(buscaLower) || p.tipo.toLowerCase().includes(buscaLower) || (p.observacao || '').toLowerCase().includes(buscaLower)) : pagar

  const atrasados = receberFiltrado.filter(r => r.status === 'atrasado')
  const pendentes = receberFiltrado.filter(r => r.status === 'pendente')
  const pagosR = receberFiltrado.filter(r => r.status === 'pago')

  const pagarByTipo = (tipo: string) => pagarFiltrado.filter(p => p.tipo === tipo)
  const tipoSoma = (tipo: string) => pagarByTipo(tipo).reduce((s, p) => s + Number(p.valor), 0)
  const tiposAtivos = TIPOS_DESPESA.filter(t => pagarByTipo(t.key).length > 0)

  // Semanas para A Pagar
  const pagarBySemana = [1, 2, 3, 4].map(s => ({
    semana: s,
    items: pagarFiltrado.filter(p => semanaDoMes(p.data_vencimento) === s),
    total: pagarFiltrado.filter(p => semanaDoMes(p.data_vencimento) === s).reduce((sum, p) => sum + Number(p.valor), 0),
  })).filter(s => s.items.length > 0)

  /* ── Cards component ── */
  const Card = ({ icon, label, valor, valorStr, sub, cor, border }: { icon: string; label: string; valor?: number; valorStr?: string; sub?: string; cor: string; border?: string }) => (
    <div style={{ background: '#111827', border: `1px solid ${border || '#1f2937'}`, borderRadius: 12, padding: '14px 16px', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>{valorStr || fmtShort(valor || 0)}</div>
      {sub && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  /* ── Progress Bar ── */
  const ProgressBar = ({ value, total, color, label }: { value: number; total: number; color: string; label: string }) => {
    const p = pct(value, total)
    return (
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{fmtShort(value)} de {fmtShort(total)} ({p}%)</span>
        </div>
        <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: color, borderRadius: 4, width: `${Math.min(p, 100)}%`, transition: 'width 0.6s ease' }} />
        </div>
      </div>
    )
  }

  /* ── Table Row for Receber ── */
  const RowReceber = ({ r }: { r: Receber }) => (
    <tr style={{ borderBottom: '1px solid #1f293730' }}>
      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>{fmtDate(r.data_vencimento)}</div>
        {vencimentoBadge(r.data_vencimento, r.status)}
      </td>
      <td style={{ padding: '8px 14px' }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500, lineHeight: 1.3 }}>{r.cliente_nome}</div>
        {r.observacao && <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>{r.observacao}</div>}
      </td>
      <td style={{ padding: '8px 14px' }}>{planoBadge(r.plano)}</td>
      <td style={{ padding: '8px 14px', color: '#f59e0b', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', textAlign: 'right' }}>{fmt(Number(r.valor))}</td>
      <td style={{ padding: '8px 14px' }}>{statusBadge(r.status)}</td>
      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {r.status !== 'pago' && (
            <button onClick={() => marcarPago('receber', r.id)}
              style={{ background: '#22c55e15', color: '#4ade80', border: '1px solid #22c55e30', borderRadius: 6, padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              ✓ Pago
            </button>
          )}
          <button onClick={() => setEditItem({ tabela: 'receber', item: { ...r } })}
            style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f630', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>
            ✏️
          </button>
        </div>
      </td>
    </tr>
  )

  /* ── Table Row for Pagar ── */
  const RowPagar = ({ p }: { p: Pagar }) => (
    <tr style={{ borderBottom: '1px solid #1f293730' }}>
      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ color: '#6b7280', fontSize: 12, fontFamily: 'monospace' }}>{fmtDate(p.data_vencimento)}</div>
        {vencimentoBadge(p.data_vencimento, p.status)}
      </td>
      <td style={{ padding: '8px 14px' }}>
        <div style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{p.descricao}</div>
        {p.observacao && <div style={{ color: '#4b5563', fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>{p.observacao}</div>}
      </td>
      <td style={{ padding: '8px 14px' }}>{tipoBadge(p.tipo)}</td>
      <td style={{ padding: '8px 14px', color: '#f87171', fontSize: 13, fontWeight: 700, fontFamily: 'monospace', textAlign: 'right' }}>{fmt(Number(p.valor))}</td>
      <td style={{ padding: '8px 14px' }}>{statusBadge(p.status)}</td>
      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {p.status !== 'pago' && (
            <button onClick={() => marcarPago('pagar', p.id)}
              style={{ background: '#22c55e15', color: '#4ade80', border: '1px solid #22c55e30', borderRadius: 6, padding: '4px 10px', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              ✓ Pago
            </button>
          )}
          <button onClick={() => setEditItem({ tabela: 'pagar', item: { ...p } })}
            style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f630', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>
            ✏️
          </button>
        </div>
      </td>
    </tr>
  )

  const THead = ({ cols }: { cols: string[] }) => (
    <thead><tr>{cols.map(h => (
      <th key={h} style={{ color: '#4b5563', fontSize: 10, fontWeight: 600, padding: '8px 14px', textAlign: h === 'Valor' ? 'right' : 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
    ))}</tr></thead>
  )

  /* ── Empty State ── */
  const Empty = ({ icon, text }: { icon: string; text: string }) => (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <p style={{ color: '#4b5563', fontSize: 13 }}>{text}</p>
    </div>
  )

  /* ══════════════ RENDER ══════════════ */
  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxWidth: 1200 }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Financeiro</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Controle de receitas, despesas e caixa — {MESES[mes - 1]} {ano}</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => load()} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ ...inp, width: 130, fontSize: 12 }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ ...inp, width: 80, fontSize: 12 }}>
              {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* ── Abas ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, background: '#111827', borderRadius: 10, padding: 3 }}>
          {[
            { key: 'receber' as const, label: '💰 A Receber', count: receber.length },
            { key: 'pagar' as const, label: '🔴 A Pagar', count: pagar.length },
            { key: 'resumo' as const, label: '📊 Resumo', count: 0 },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)}
              style={{ flex: 1, background: aba === t.key ? '#f59e0b' : 'transparent', color: aba === t.key ? '#030712' : '#6b7280', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontWeight: aba === t.key ? 700 : 500, cursor: 'pointer', transition: 'all 0.2s' }}>
              {t.label}{!loading && t.count > 0 ? ` (${t.count})` : ''}
            </button>
          ))}
        </div>

        {loading ? <Skeleton /> : (
          <>
            {/* ════════════════ ABA RECEBER ════════════════ */}
            {aba === 'receber' && (
              <>
                {/* Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  <Card icon="💰" label="Previsto" valor={totaisR.total_previsto} cor="#94a3b8" />
                  <Card icon="✅" label="Recebido" valor={totaisR.total_recebido} sub={`${pct(totaisR.total_recebido, totaisR.total_previsto)}% do previsto`} cor="#4ade80" border="#22c55e30" />
                  <Card icon="⏳" label="Pendente" valor={totaisR.total_pendente} cor="#fbbf24" border="#f59e0b30" />
                  <Card icon="🔴" label="Atrasado" valor={totaisR.total_atrasado} cor="#f87171" border={totaisR.total_atrasado > 0 ? '#ef444450' : '#1f2937'} />
                </div>

                <ProgressBar value={totaisR.total_recebido} total={totaisR.total_previsto} color="#22c55e" label="Recebimentos do mes" />

                {/* Busca + Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente, plano..." style={{ ...inp, width: 280, fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={exportarReceber} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>📥 CSV</button>
                    <button onClick={() => setModalReceber(true)} style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}>+ Novo lancamento</button>
                  </div>
                </div>

                {receber.length === 0 ? <Empty icon="💰" text="Nenhum lancamento neste mes" /> : (
                  <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
                    {/* Atrasados */}
                    {atrasados.length > 0 && (
                      <>
                        <SectionHeader icon="🔴" title="Atrasados" count={atrasados.length} total={atrasados.reduce((s, r) => s + Number(r.valor), 0)} color="#ef4444" />
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <THead cols={['Data', 'Cliente', 'Plano', 'Valor', 'Status', 'Acao']} />
                          <tbody>{atrasados.map(r => <RowReceber key={r.id} r={r} />)}</tbody>
                        </table>
                      </>
                    )}

                    {/* Pendentes */}
                    {pendentes.length > 0 && (
                      <>
                        <SectionHeader icon="⏳" title="Pendentes" count={pendentes.length} total={pendentes.reduce((s, r) => s + Number(r.valor), 0)} color="#f59e0b" />
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <THead cols={['Data', 'Cliente', 'Plano', 'Valor', 'Status', 'Acao']} />
                          <tbody>{pendentes.map(r => <RowReceber key={r.id} r={r} />)}</tbody>
                        </table>
                      </>
                    )}

                    {/* Pagos (colapsável) */}
                    {pagosR.length > 0 && (
                      <>
                        <button onClick={() => setShowPagos(!showPagos)}
                          style={{ width: '100%', background: '#22c55e08', border: 'none', borderTop: '1px solid #1f2937', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: '#4ade80' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span>✅</span>
                            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pagos</span>
                            <span style={{ background: '#22c55e30', padding: '1px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700 }}>{pagosR.length}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{fmtShort(pagosR.reduce((s, r) => s + Number(r.valor), 0))}</span>
                            <span style={{ fontSize: 10, transition: 'transform 0.2s', transform: showPagos ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                          </div>
                        </button>
                        {showPagos && (
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <THead cols={['Data', 'Cliente', 'Plano', 'Valor', 'Status', 'Acao']} />
                            <tbody>{pagosR.map(r => <RowReceber key={r.id} r={r} />)}</tbody>
                          </table>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* ════════════════ ABA PAGAR ════════════════ */}
            {aba === 'pagar' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
                  <Card icon="📋" label="Total previsto" valor={totaisP.total_previsto} cor="#94a3b8" />
                  <Card icon="✅" label="Pago" valor={totaisP.total_pago} sub={`${pct(totaisP.total_pago, totaisP.total_previsto)}% executado`} cor="#4ade80" border="#22c55e30" />
                  <Card icon="⏳" label="A pagar" valor={totaisP.total_apagar} cor="#f87171" border="#ef444430" />
                  <Card icon="📊" label="% Executado" valorStr={`${pct(totaisP.total_pago, totaisP.total_previsto)}%`} sub="das despesas pagas" cor="#60a5fa" />
                </div>

                <ProgressBar value={totaisP.total_pago} total={totaisP.total_previsto} color="#ef4444" label="Pagamentos do mes" />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar despesa, tipo..." style={{ ...inp, width: 280, fontSize: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={exportarPagar} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', fontSize: 11, cursor: 'pointer' }}>📥 CSV</button>
                    <button onClick={() => setModalPagar(true)} style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}>+ Nova despesa</button>
                  </div>
                </div>

                {pagar.length === 0 ? <Empty icon="📋" text="Nenhuma despesa neste mes" /> : (
                  <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
                    {tiposAtivos.map(tipo => {
                      const items = pagarByTipo(tipo.key)
                      return (
                        <div key={tipo.key}>
                          <SectionHeader icon={tipo.icon} title={tipo.label} count={items.length} total={tipoSoma(tipo.key)} color={tipo.cor} />
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <THead cols={['Data', 'Descricao', 'Tipo', 'Valor', 'Status', 'Acao']} />
                            <tbody>{items.map(p => <RowPagar key={p.id} p={p} />)}</tbody>
                          </table>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ════════════════ ABA RESUMO ════════════════ */}
            {aba === 'resumo' && resumo && (
              <>
                {/* Grid 2x3 */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  <Card icon="💰" label="A Receber" valor={resumo.total_receber} sub="previsto mensal" cor="#60a5fa" />
                  <Card icon="🔴" label="A Pagar" valor={resumo.total_pagar} sub="previsto mensal" cor="#f87171" />
                  <Card icon="💵" label="Caixa Atual" valor={resumo.caixa} sub="recebido - pago" cor={resumo.caixa >= 0 ? '#4ade80' : '#f87171'} border={resumo.caixa >= 0 ? '#22c55e30' : '#ef444430'} />
                  <Card icon="✅" label="Recebido" valor={resumo.recebido} sub={`${resumo.tx_pagamento}% do previsto`} cor="#4ade80" />
                  <Card icon="📤" label="Pago" valor={resumo.pago} sub={`${pct(resumo.pago, resumo.total_pagar)}% do previsto`} cor="#fb923c" />
                  <Card icon="📊" label="Margem" valor={resumo.caixa} sub={`${pct(resumo.caixa, resumo.recebido || 1)}% da receita`} cor={resumo.caixa >= 0 ? '#4ade80' : '#f87171'} />
                </div>

                {/* Barras */}
                <ProgressBar value={resumo.recebido} total={resumo.total_receber} color="#22c55e" label="Recebimentos" />
                <ProgressBar value={resumo.pago} total={resumo.total_pagar} color="#ef4444" label="Pagamentos" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  {/* Inadimplentes */}
                  <div style={{ background: '#111827', border: `1px solid ${resumo.inadimplentes.length > 0 ? '#ef444430' : '#1f2937'}`, borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: resumo.inadimplentes.length > 0 ? '#f87171' : '#4ade80', marginBottom: 12 }}>
                      {resumo.inadimplentes.length > 0 ? '🔴 Inadimplentes' : '✅ Inadimplentes'}
                    </h3>
                    {resumo.inadimplentes.length === 0 ? (
                      <p style={{ color: '#4ade80', fontSize: 12, textAlign: 'center', padding: 16 }}>Nenhum inadimplente este mes</p>
                    ) : (
                      resumo.inadimplentes.map((i, idx) => (
                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: idx < resumo.inadimplentes.length - 1 ? '1px solid #1f293740' : 'none' }}>
                          <div>
                            <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{i.nome}</span>
                            <span style={{ color: '#4b5563', fontSize: 10, marginLeft: 8 }}>{i.plano}</span>
                          </div>
                          <span style={{ color: '#f87171', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{fmt(i.valor)}</span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Comparativo */}
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>📈 Comparativo mes anterior</h3>
                    {resumo.mes_anterior.caixa === 0 && resumo.mes_anterior.recebido === 0 ? (
                      <p style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: 16 }}>Sem dados do mes anterior</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {[
                          { label: 'Caixa', atual: resumo.caixa, ant: resumo.mes_anterior.caixa },
                          { label: 'Recebido', atual: resumo.recebido, ant: resumo.mes_anterior.recebido },
                          { label: 'Pago', atual: resumo.pago, ant: resumo.mes_anterior.pago },
                        ].map(c => {
                          const diff = c.ant > 0 ? Math.round(((c.atual - c.ant) / c.ant) * 100) : 0
                          const up = diff >= 0
                          return (
                            <div key={c.label}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: 11, color: '#6b7280' }}>{c.label}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>{fmtShort(c.atual)}</span>
                                  {diff !== 0 && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: c.label === 'Pago' ? (up ? '#f87171' : '#4ade80') : (up ? '#4ade80' : '#f87171'), background: c.label === 'Pago' ? (up ? '#ef444420' : '#22c55e20') : (up ? '#22c55e20' : '#ef444420'), padding: '1px 6px', borderRadius: 4 }}>
                                      {up ? '↑' : '↓'} {Math.abs(diff)}%
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: 10, color: '#4b5563' }}>anterior: {fmtShort(c.ant)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Mini-grafico historico */}
                {historico.length > 0 && (
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 16 }}>📈 Historico ultimos 4 meses</h3>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 120 }}>
                      {historico.map((h, i) => {
                        const maxVal = Math.max(...historico.map(x => Math.max(x.recebido, x.pago)), 1)
                        const hReceb = Math.max(4, (h.recebido / maxVal) * 100)
                        const hPago = Math.max(4, (h.pago / maxVal) * 100)
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 90 }}>
                              <div style={{ width: 16, height: `${hReceb}%`, background: '#22c55e', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`Recebido: ${fmtShort(h.recebido)}`} />
                              <div style={{ width: 16, height: `${hPago}%`, background: '#ef4444', borderRadius: '3px 3px 0 0', minHeight: 4 }} title={`Pago: ${fmtShort(h.pago)}`} />
                            </div>
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>{h.mes}</span>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 10 }}>
                      <span style={{ fontSize: 10, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} /> Recebido</span>
                      <span style={{ fontSize: 10, color: '#f87171', display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: 2, display: 'inline-block' }} /> Pago</span>
                    </div>
                  </div>
                )}

                {/* Projecao */}
                {resumo.total_receber > 0 && (
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>🔮 Projecao do mes</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Se manter ritmo atual</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#60a5fa', fontFamily: 'monospace' }}>
                          {fmtShort(resumo.total_receber > 0 ? resumo.recebido * (30 / Math.max(new Date().getDate(), 1)) : 0)}
                        </div>
                        <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>projecao receita final do mes</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>Gap para meta</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: resumo.total_receber - resumo.recebido > 0 ? '#fbbf24' : '#4ade80', fontFamily: 'monospace' }}>
                          {fmtShort(Math.max(0, resumo.total_receber - resumo.recebido))}
                        </div>
                        <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>falta receber para bater previsto</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ════════════════ MODAL EDICAO ════════════════ */}
        {editItem && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setEditItem(null)}>
            <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 28, width: 440 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Editar lancamento</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data vencimento</label>
                  <input type="date" value={(editItem.item as Receber).data_vencimento || ''} onChange={e => setEditItem({ ...editItem, item: { ...editItem.item, data_vencimento: e.target.value } })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                  <input type="number" value={Number(editItem.item.valor)} onChange={e => setEditItem({ ...editItem, item: { ...editItem.item, valor: Number(e.target.value) } })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Status</label>
                  <select value={editItem.item.status} onChange={e => setEditItem({ ...editItem, item: { ...editItem.item, status: e.target.value } })} style={inp}>
                    <option value="pendente">Pendente</option><option value="pago">Pago</option><option value="atrasado">Atrasado</option>
                  </select></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacao</label>
                  <input value={editItem.item.observacao || ''} onChange={e => setEditItem({ ...editItem, item: { ...editItem.item, observacao: e.target.value } })} style={inp} placeholder="Opcional" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={salvarEdicao} disabled={saving} style={{ background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setEditItem(null)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ MODAIS ════════════════ */}
        {modalReceber && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModalReceber(false)}>
            <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 28, width: 480 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Novo lancamento — A Receber</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data vencimento *</label>
                  <input type="date" value={formR.data_vencimento} onChange={e => setFormR({ ...formR, data_vencimento: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Cliente *</label>
                  <input list="clinicas-list" value={formR.cliente_nome} onChange={e => onClinicaSelect(e.target.value)} style={inp} placeholder="Buscar clinica..." />
                  <datalist id="clinicas-list">{clinicas.map(c => <option key={c.id} value={c.nome} />)}</datalist></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Plano</label>
                    <select value={formR.plano} onChange={e => onPlanoChange(e.target.value)} style={inp}>
                      {PLANOS.map(p => <option key={p.nome} value={p.nome}>{p.nome}{p.valor > 0 ? ` (R$${p.valor})` : ''}</option>)}
                    </select></div>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                    <input type="number" value={formR.valor} onChange={e => setFormR({ ...formR, valor: e.target.value })} style={inp} /></div>
                </div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacao</label>
                  <input value={formR.observacao} onChange={e => setFormR({ ...formR, observacao: e.target.value })} style={inp} placeholder="Opcional" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={criarReceber} disabled={saving} style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setModalReceber(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {modalPagar && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModalPagar(false)}>
            <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 28, width: 480 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nova despesa — A Pagar</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data vencimento *</label>
                    <input type="date" value={formP.data_vencimento} onChange={e => setFormP({ ...formP, data_vencimento: e.target.value })} style={inp} /></div>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Tipo</label>
                    <select value={formP.tipo} onChange={e => setFormP({ ...formP, tipo: e.target.value })} style={inp}>
                      {TIPOS_DESPESA.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                    </select></div>
                </div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Descricao *</label>
                  <input value={formP.descricao} onChange={e => setFormP({ ...formP, descricao: e.target.value })} style={inp} placeholder="Ex: Salario Medina" /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Valor (R$) *</label>
                    <input type="number" value={formP.valor} onChange={e => setFormP({ ...formP, valor: e.target.value })} style={inp} /></div>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacao</label>
                    <input value={formP.observacao} onChange={e => setFormP({ ...formP, observacao: e.target.value })} style={inp} placeholder="Opcional" /></div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={criarPagar} disabled={saving} style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setModalPagar(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
