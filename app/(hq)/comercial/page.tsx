'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type PipeItem = {
  id: string; nome_clinica: string; plano: string; mrr_proposto: number
  status: string; data_reuniao: string; data_fechamento: string; observacoes: string; created_at: string
}

const COLUNAS = [
  { key: 'reuniao_agendada', label: '📅 Reunião agendada', cor: '#3b82f6' },
  { key: 'proposta_enviada', label: '💼 Proposta enviada', cor: '#f59e0b' },
  { key: 'fechado', label: '✅ Fechado', cor: '#22c55e' },
  { key: 'perdido', label: '❌ Perdido', cor: '#ef4444' },
]

function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function ComercialPage() {
  const [pipeline, setPipeline] = useState<PipeItem[]>([])
  const [kpis, setKpis] = useState({ reunioesSemana: 0, propostasEnviadas: 0, fechamentos: 0, mrrMes: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome_clinica: '', plano: 'Pacote Completo', mrr_proposto: '', data_reuniao: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/comercial/pipeline')
    const d = await res.json()
    setPipeline(d.pipeline || [])
    setKpis(d.kpis || kpis)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const criar = async () => {
    setSaving(true)
    await fetch('/api/comercial/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, mrr_proposto: Number(form.mrr_proposto) || 0 }) })
    setForm({ nome_clinica: '', plano: 'Pacote Completo', mrr_proposto: '', data_reuniao: '' })
    setShowForm(false); setSaving(false); load()
  }

  const mover = async (id: string, novoStatus: string) => {
    const updates: Record<string, unknown> = { status: novoStatus }
    if (novoStatus === 'fechado') updates.data_fechamento = new Date().toISOString().split('T')[0]
    await fetch('/api/comercial/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    load()
  }

  const input: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Comercial — Pipeline de Fechamento</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Gestao de propostas e fechamentos</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Nova Proposta</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Reunioes (semana)', v: kpis.reunioesSemana, c: '#3b82f6' },
            { l: 'Propostas enviadas', v: kpis.propostasEnviadas, c: '#f59e0b' },
            { l: 'Fechamentos', v: kpis.fechamentos, c: '#22c55e' },
            { l: 'MRR gerado', v: fmt(kpis.mrrMes), c: '#a855f7' },
          ].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Nova Proposta</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Clinica *</label><input value={form.nome_clinica} onChange={e => setForm({ ...form, nome_clinica: e.target.value })} style={input} /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Plano</label><select value={form.plano} onChange={e => setForm({ ...form, plano: e.target.value })} style={input}><option>Pacote Completo</option><option>Somente Financeira</option><option>Marketing</option></select></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>MRR (R$)</label><input type="number" value={form.mrr_proposto} onChange={e => setForm({ ...form, mrr_proposto: e.target.value })} style={input} placeholder="1500" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data reuniao</label><input type="date" value={form.data_reuniao} onChange={e => setForm({ ...form, data_reuniao: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={criar} disabled={saving || !form.nome_clinica} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome_clinica ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar'}</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Kanban */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {COLUNAS.map(col => {
              const items = pipeline.filter(p => p.status === col.key)
              const mrrTotal = items.reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)
              return (
                <div key={col.key}>
                  <div style={{ background: `${col.cor}15`, border: `1px solid ${col.cor}30`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: col.cor }}>{col.label}</span>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>{items.length}</span>
                    </div>
                    {mrrTotal > 0 && <div style={{ fontSize: 10, color: col.cor, marginTop: 2 }}>{fmt(mrrTotal)} MRR</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(p => (
                      <div key={p.id} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{p.nome_clinica}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>💳 {p.plano || '-'}</div>
                        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>{fmt(Number(p.mrr_proposto || 0))}/mes</div>
                        {p.data_reuniao && <div style={{ fontSize: 10, color: '#6b7280' }}>📅 {p.data_reuniao}</div>}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {COLUNAS.filter(c => c.key !== col.key).map(c => (
                            <button key={c.key} onClick={() => mover(p.id, c.key)} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30`, cursor: 'pointer' }}>
                              → {c.label.split(' ').pop()}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <div style={{ textAlign: 'center', color: '#252535', fontSize: 11, padding: 16 }}>Vazio</div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
