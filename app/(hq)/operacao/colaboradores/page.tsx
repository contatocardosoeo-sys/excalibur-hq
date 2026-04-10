'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../../components/Sidebar'

type Colaborador = { id: string; nome: string; cargo: string | null; tipo: string; valor_mensal: number; dia_pagamento: number; ativo: boolean; observacao: string | null }

const TIPOS = ['prolabore', 'colaborador', 'ferramenta', 'marketing', 'outro']
const inp: React.CSSProperties = { width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) }

export default function ColaboradoresPage() {
  const [items, setItems] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ nome: '', cargo: '', tipo: 'colaborador', valor_mensal: '', dia_pagamento: '5', observacao: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await (await fetch('/api/financeiro/colaboradores')).json()
    setItems(d.items || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const salvar = async () => {
    if (!form.nome) return
    setSaving(true)
    if (editId) {
      await fetch('/api/financeiro/colaboradores', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editId, nome: form.nome, cargo: form.cargo || null, tipo: form.tipo, valor_mensal: Number(form.valor_mensal) || 0, dia_pagamento: Number(form.dia_pagamento) || 5, observacao: form.observacao || null }) })
    } else {
      await fetch('/api/financeiro/colaboradores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome: form.nome, cargo: form.cargo || null, tipo: form.tipo, valor_mensal: Number(form.valor_mensal) || 0, dia_pagamento: Number(form.dia_pagamento) || 5, observacao: form.observacao || null }) })
    }
    setForm({ nome: '', cargo: '', tipo: 'colaborador', valor_mensal: '', dia_pagamento: '5', observacao: '' })
    setEditId(null); setModal(false); setSaving(false); load()
  }

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await fetch('/api/financeiro/colaboradores', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ativo: !ativo }) })
    load()
  }

  const editar = (c: Colaborador) => {
    setEditId(c.id)
    setForm({ nome: c.nome, cargo: c.cargo || '', tipo: c.tipo, valor_mensal: String(c.valor_mensal), dia_pagamento: String(c.dia_pagamento), observacao: c.observacao || '' })
    setModal(true)
  }

  const ativos = items.filter(c => c.ativo)
  const inativos = items.filter(c => !c.ativo)
  const totalMensal = ativos.reduce((s, c) => s + Number(c.valor_mensal), 0)

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Colaboradores</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Gestao de custos fixos com pessoas e servicos</p>
          </div>
          <button onClick={() => { setEditId(null); setForm({ nome: '', cargo: '', tipo: 'colaborador', valor_mensal: '', dia_pagamento: '5', observacao: '' }); setModal(true) }}
            style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 12, border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer' }}>+ Novo colaborador</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Ativos</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#4ade80' }}>{ativos.length}</div>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Custo mensal</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>{fmt(totalMensal)}</div>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>Inativos</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#6b7280' }}>{inativos.length}</div>
          </div>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: 60 }}>Carregando...</div> : (
          <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Nome', 'Cargo', 'Tipo', 'Valor mensal', 'Dia pgto', 'Status', 'Acoes'].map(h => (
                  <th key={h} style={{ color: '#4b5563', fontSize: 10, fontWeight: 600, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {items.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1f293730', opacity: c.ativo ? 1 : 0.5 }}>
                    <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.nome}</td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{c.cargo || '-'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: '#f59e0b20', color: '#fbbf24', padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600 }}>{c.tipo}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#f59e0b', fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{fmt(Number(c.valor_mensal))}</td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>Dia {c.dia_pagamento}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ color: c.ativo ? '#4ade80' : '#ef4444', fontSize: 11, fontWeight: 600 }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => editar(c)} style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f630', borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>✏️</button>
                        <button onClick={() => toggleAtivo(c.id, c.ativo)} style={{ background: c.ativo ? '#ef444415' : '#22c55e15', color: c.ativo ? '#f87171' : '#4ade80', border: `1px solid ${c.ativo ? '#ef444430' : '#22c55e30'}`, borderRadius: 6, padding: '4px 8px', fontSize: 10, cursor: 'pointer' }}>
                          {c.ativo ? '⏸' : '▶'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum colaborador cadastrado</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal(false)}>
            <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 28, width: 440 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>{editId ? 'Editar' : 'Novo'} colaborador</h3>
              <div style={{ display: 'grid', gap: 14 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome *</label>
                  <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inp} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Cargo</label>
                    <input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} style={inp} placeholder="Ex: Gerente" /></div>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Tipo</label>
                    <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} style={inp}>
                      {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Valor mensal (R$) *</label>
                    <input type="number" value={form.valor_mensal} onChange={e => setForm({ ...form, valor_mensal: e.target.value })} style={inp} /></div>
                  <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Dia pagamento</label>
                    <input type="number" value={form.dia_pagamento} onChange={e => setForm({ ...form, dia_pagamento: e.target.value })} style={inp} /></div>
                </div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacao</label>
                  <input value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} style={inp} placeholder="Opcional" /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={salvar} disabled={saving} style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
