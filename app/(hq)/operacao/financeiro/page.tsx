'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../../components/Sidebar'

type Receber = { id: string; data_vencimento: string; cliente_nome: string; clinica_id: string | null; plano: string; valor: number; status: string; data_pagamento: string | null; observacao: string | null }
type Pagar = { id: string; data_vencimento: string; descricao: string; tipo: string; valor: number; status: string; data_pagamento: string | null; observacao: string | null }
type Resumo = { caixa: number; recebido: number; total_receber: number; pago: number; total_pagar: number; tx_pagamento: number; tx_atraso: number; inadimplentes: { nome: string; valor: number; plano: string }[]; mes_anterior: { caixa: number; recebido: number; pago: number } }

const PLANOS = [
  { nome: 'Completo (sem fidelidade)', valor: 3500 },
  { nome: 'Completo (90 dias garantia)', valor: 3000 },
  { nome: 'Apenas Financeira', valor: 1000 },
  { nome: 'Apenas Marketing', valor: 1500 },
  { nome: 'Outro', valor: 0 },
]
const TIPOS_DESPESA = [
  { key: 'prolabore', label: 'Prolabore', icon: '👤' },
  { key: 'colaborador', label: 'Colaborador', icon: '👥' },
  { key: 'ferramenta', label: 'Ferramenta', icon: '🔧' },
  { key: 'marketing', label: 'Marketing', icon: '📣' },
  { key: 'aluguel', label: 'Aluguel', icon: '🏢' },
  { key: 'outro', label: 'Outro', icon: '📦' },
]
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }
function fmtDate(d: string) { return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '-' }

const statusBadge = (s: string) => {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    pago: { bg: '#22c55e20', text: '#22c55e', label: '🟢 Pago' },
    pendente: { bg: '#f59e0b20', text: '#f59e0b', label: '🟡 Pendente' },
    atrasado: { bg: '#ef444420', text: '#ef4444', label: '🔴 Atrasado' },
  }
  const st = map[s] || map.pendente
  return <span style={{ background: st.bg, color: st.text, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
}

const inp: React.CSSProperties = { width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
const btnAmber: React.CSSProperties = { background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }

export default function FinanceiroOperacao() {
  const now = new Date()
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [ano, setAno] = useState(now.getFullYear())
  const [aba, setAba] = useState<'receber' | 'pagar' | 'resumo'>('receber')
  const [loading, setLoading] = useState(true)

  // Dados
  const [receber, setReceber] = useState<Receber[]>([])
  const [totaisR, setTotaisR] = useState({ total_previsto: 0, total_recebido: 0, total_pendente: 0, total_atrasado: 0 })
  const [pagar, setPagar] = useState<Pagar[]>([])
  const [totaisP, setTotaisP] = useState({ total_previsto: 0, total_pago: 0, total_apagar: 0 })
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [clinicas, setClinicas] = useState<{ id: string; nome: string }[]>([])

  // Modais
  const [modalReceber, setModalReceber] = useState(false)
  const [modalPagar, setModalPagar] = useState(false)
  const [formR, setFormR] = useState({ data_vencimento: '', cliente_nome: '', clinica_id: '', plano: 'Completo (90 dias garantia)', valor: '3000', observacao: '' })
  const [formP, setFormP] = useState({ data_vencimento: '', descricao: '', tipo: 'outro', valor: '', observacao: '' })
  const [saving, setSaving] = useState(false)

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
    setLoading(false)
  }, [mes, ano])

  useEffect(() => { load() }, [load])

  const marcarPago = async (tabela: 'receber' | 'pagar', id: string) => {
    await fetch(`/api/financeiro/${tabela}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'pago' }) })
    load()
  }

  const criarReceber = async () => {
    if (!formR.cliente_nome || !formR.data_vencimento) return
    setSaving(true)
    await fetch('/api/financeiro/receber', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formR, valor: Number(formR.valor) || 0, clinica_id: formR.clinica_id || null }) })
    setFormR({ data_vencimento: '', cliente_nome: '', clinica_id: '', plano: 'Completo (90 dias garantia)', valor: '3000', observacao: '' })
    setModalReceber(false); setSaving(false); load()
  }

  const criarPagar = async () => {
    if (!formP.descricao || !formP.data_vencimento) return
    setSaving(true)
    await fetch('/api/financeiro/pagar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formP, valor: Number(formP.valor) || 0 }) })
    setFormP({ data_vencimento: '', descricao: '', tipo: 'outro', valor: '', observacao: '' })
    setModalPagar(false); setSaving(false); load()
  }

  const onPlanoChange = (plano: string) => {
    const p = PLANOS.find(x => x.nome === plano)
    setFormR({ ...formR, plano, valor: String(p?.valor || 0) })
  }

  const onClinicaSelect = (nome: string) => {
    const c = clinicas.find(x => x.nome === nome)
    setFormR({ ...formR, cliente_nome: nome, clinica_id: c?.id || '' })
  }

  const tipoIcon = (t: string) => TIPOS_DESPESA.find(x => x.key === t)?.icon || '📦'

  const card = (label: string, valor: string | number, cor: string) => (
    <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16, flex: 1 }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor, marginTop: 4 }}>{typeof valor === 'number' ? fmt(valor) : valor}</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>💰 Financeiro Operacional</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Controle de receitas, despesas e caixa</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ ...inp, width: 140 }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ ...inp, width: 90 }}>
              {[2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {[
            { key: 'receber' as const, label: '💰 A Receber' },
            { key: 'pagar' as const, label: '🔴 A Pagar' },
            { key: 'resumo' as const, label: '📊 Resumo do Mes' },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)}
              style={{ background: aba === t.key ? '#f59e0b' : '#1f2937', color: aba === t.key ? '#030712' : '#9ca3af', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: aba === t.key ? 700 : 400, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando...</div>
        ) : (
          <>
            {/* ABA RECEBER */}
            {aba === 'receber' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button onClick={() => setModalReceber(true)} style={btnAmber}>+ Novo lancamento</button>
                </div>
                <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>{['Data', 'Cliente', 'Plano', 'Valor', 'Status', 'Acoes'].map(h => (
                        <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #1f2937' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {receber.map(r => (
                        <tr key={r.id} style={{ borderBottom: '1px solid #1f293740' }}>
                          <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 13 }}>{fmtDate(r.data_vencimento)}</td>
                          <td style={{ padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{r.cliente_nome}</td>
                          <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 12 }}>{r.plano || '-'}</td>
                          <td style={{ padding: '10px 16px', color: '#f59e0b', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{fmt(Number(r.valor))}</td>
                          <td style={{ padding: '10px 16px' }}>{statusBadge(r.status)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            {r.status !== 'pago' && (
                              <button onClick={() => marcarPago('receber', r.id)}
                                style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                                Marcar pago
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {receber.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum lancamento neste mes</td></tr>
                      )}
                    </tbody>
                  </table>
                  {receber.length > 0 && (
                    <div style={{ display: 'flex', gap: 16, padding: '16px 20px', borderTop: '1px solid #1f2937', background: '#0a0f1a' }}>
                      {card('Previsto', totaisR.total_previsto, '#3b82f6')}
                      {card('Recebido', totaisR.total_recebido, '#22c55e')}
                      {card('Pendente', totaisR.total_pendente, '#f59e0b')}
                      {card('Atrasado', totaisR.total_atrasado, '#ef4444')}
                    </div>
                  )}
                </div>

                {/* Modal Novo Receber */}
                {modalReceber && (
                  <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 24, width: 480 }}>
                      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Novo lancamento — A Receber</h3>
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div>
                          <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data vencimento *</label>
                          <input type="date" value={formR.data_vencimento} onChange={e => setFormR({ ...formR, data_vencimento: e.target.value })} style={inp} />
                        </div>
                        <div>
                          <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Cliente *</label>
                          <input list="clinicas-list" value={formR.cliente_nome} onChange={e => onClinicaSelect(e.target.value)} style={inp} placeholder="Buscar clinica..." />
                          <datalist id="clinicas-list">{clinicas.map(c => <option key={c.id} value={c.nome} />)}</datalist>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Plano</label>
                            <select value={formR.plano} onChange={e => onPlanoChange(e.target.value)} style={inp}>
                              {PLANOS.map(p => <option key={p.nome} value={p.nome}>{p.nome}{p.valor > 0 ? ` (R$${p.valor})` : ''}</option>)}
                            </select>
                          </div>
                          <div>
                            <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Valor (R$)</label>
                            <input type="number" value={formR.valor} onChange={e => setFormR({ ...formR, valor: e.target.value })} style={inp} />
                          </div>
                        </div>
                        <div>
                          <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacao</label>
                          <input value={formR.observacao} onChange={e => setFormR({ ...formR, observacao: e.target.value })} style={inp} placeholder="Opcional" />
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={criarReceber} disabled={saving} style={{ ...btnAmber, opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                        <button onClick={() => setModalReceber(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ABA PAGAR */}
            {aba === 'pagar' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                  <button onClick={() => setModalPagar(true)} style={btnAmber}>+ Nova despesa</button>
                </div>
                <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>{['Data', 'Descricao', 'Tipo', 'Valor', 'Status', 'Acoes'].map(h => (
                        <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #1f2937' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {pagar.map(p => (
                        <tr key={p.id} style={{ borderBottom: '1px solid #1f293740' }}>
                          <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 13 }}>{fmtDate(p.data_vencimento)}</td>
                          <td style={{ padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{p.descricao}</td>
                          <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 12 }}>{tipoIcon(p.tipo)} {TIPOS_DESPESA.find(t => t.key === p.tipo)?.label || p.tipo}</td>
                          <td style={{ padding: '10px 16px', color: '#ef4444', fontSize: 13, fontWeight: 600, fontFamily: 'monospace' }}>{fmt(Number(p.valor))}</td>
                          <td style={{ padding: '10px 16px' }}>{statusBadge(p.status)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            {p.status !== 'pago' && (
                              <button onClick={() => marcarPago('pagar', p.id)}
                                style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                                Marcar pago
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {pagar.length === 0 && (
                        <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhuma despesa neste mes</td></tr>
                      )}
                    </tbody>
                  </table>
                  {pagar.length > 0 && (
                    <div style={{ display: 'flex', gap: 16, padding: '16px 20px', borderTop: '1px solid #1f2937', background: '#0a0f1a' }}>
                      {card('Total previsto', totaisP.total_previsto, '#3b82f6')}
                      {card('Total pago', totaisP.total_pago, '#22c55e')}
                      {card('A pagar', totaisP.total_apagar, '#ef4444')}
                    </div>
                  )}
                </div>

                {/* Modal Nova Despesa */}
                {modalPagar && (
                  <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                    <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 24, width: 480 }}>
                      <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Nova despesa — A Pagar</h3>
                      <div style={{ display: 'grid', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data vencimento *</label>
                            <input type="date" value={formP.data_vencimento} onChange={e => setFormP({ ...formP, data_vencimento: e.target.value })} style={inp} />
                          </div>
                          <div>
                            <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Tipo</label>
                            <select value={formP.tipo} onChange={e => setFormP({ ...formP, tipo: e.target.value })} style={inp}>
                              {TIPOS_DESPESA.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Descricao *</label>
                          <input value={formP.descricao} onChange={e => setFormP({ ...formP, descricao: e.target.value })} style={inp} placeholder="Ex: Salario Medina" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Valor (R$) *</label>
                            <input type="number" value={formP.valor} onChange={e => setFormP({ ...formP, valor: e.target.value })} style={inp} />
                          </div>
                          <div>
                            <label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacao</label>
                            <input value={formP.observacao} onChange={e => setFormP({ ...formP, observacao: e.target.value })} style={inp} placeholder="Opcional" />
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                        <button onClick={criarPagar} disabled={saving} style={{ ...btnAmber, opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                        <button onClick={() => setModalPagar(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ABA RESUMO */}
            {aba === 'resumo' && resumo && (
              <>
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  {card('Caixa Atual', resumo.caixa, resumo.caixa >= 0 ? '#22c55e' : '#ef4444')}
                  {card('Tx Pagamento', resumo.tx_pagamento + '%', resumo.tx_pagamento >= 80 ? '#22c55e' : resumo.tx_pagamento >= 50 ? '#f59e0b' : '#ef4444')}
                  {card('Tx Atraso', resumo.tx_atraso + '%', resumo.tx_atraso <= 10 ? '#22c55e' : resumo.tx_atraso <= 30 ? '#f59e0b' : '#ef4444')}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                  {/* Entradas vs Saidas */}
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Entradas vs Saidas</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#22c55e' }}>Recebido</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#22c55e', fontFamily: 'monospace' }}>{fmt(resumo.recebido)}</span>
                        </div>
                        <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#22c55e', borderRadius: 4, width: `${resumo.total_receber > 0 ? (resumo.recebido / resumo.total_receber) * 100 : 0}%` }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>de {fmt(resumo.total_receber)} previsto</div>
                      </div>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: '#ef4444' }}>Pago</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>{fmt(resumo.pago)}</span>
                        </div>
                        <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: '#ef4444', borderRadius: 4, width: `${resumo.total_pagar > 0 ? (resumo.pago / resumo.total_pagar) * 100 : 0}%` }} />
                        </div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>de {fmt(resumo.total_pagar)} previsto</div>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo mes anterior */}
                  <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Comparativo mes anterior</h3>
                    {resumo.mes_anterior.caixa === 0 && resumo.mes_anterior.recebido === 0 ? (
                      <p style={{ color: '#6b7280', fontSize: 13, textAlign: 'center', padding: 20 }}>Sem dados do mes anterior</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {[
                          { label: 'Caixa', atual: resumo.caixa, anterior: resumo.mes_anterior.caixa },
                          { label: 'Recebido', atual: resumo.recebido, anterior: resumo.mes_anterior.recebido },
                          { label: 'Pago', atual: resumo.pago, anterior: resumo.mes_anterior.pago },
                        ].map(c => {
                          const diff = c.anterior > 0 ? Math.round(((c.atual - c.anterior) / c.anterior) * 100) : 0
                          return (
                            <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 12, color: '#9ca3af' }}>{c.label}</span>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{fmt(c.atual)}</span>
                                {diff !== 0 && (
                                  <span style={{ fontSize: 10, marginLeft: 8, color: diff > 0 ? '#22c55e' : '#ef4444' }}>
                                    {diff > 0 ? '↑' : '↓'} {Math.abs(diff)}%
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inadimplentes */}
                {resumo.inadimplentes.length > 0 && (
                  <div style={{ background: '#111827', border: '1px solid #ef444440', borderRadius: 16, padding: 20 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, color: '#ef4444', marginBottom: 12 }}>🔴 Inadimplentes</h3>
                    {resumo.inadimplentes.map((i, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: idx < resumo.inadimplentes.length - 1 ? '1px solid #1f293740' : 'none' }}>
                        <div>
                          <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{i.nome}</span>
                          <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 8 }}>{i.plano}</span>
                        </div>
                        <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 13, fontFamily: 'monospace' }}>{fmt(i.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
