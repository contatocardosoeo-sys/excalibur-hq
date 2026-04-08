'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type PipeItem = { id: string; lead_id: string; nome_clinica: string; plano: string; mrr_proposto: number; status: string; data_reuniao: string; data_fechamento: string; observacoes: string; created_at: string }

const COLS = [
  { key: 'reuniao_agendada', label: '📅 Reuniao Agendada', cor: '#3b82f6' },
  { key: 'proposta_enviada', label: '💼 Proposta Enviada', cor: '#f59e0b' },
  { key: 'fechado', label: '✅ Fechado', cor: '#22c55e' },
  { key: 'perdido', label: '❌ Perdido', cor: '#ef4444' },
]
const STATUS_ORDER = ['reuniao_agendada', 'proposta_enviada', 'fechado', 'perdido']

function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function ComercialPage() {
  const [pipeline, setPipeline] = useState<PipeItem[]>([])
  const [kpis, setKpis] = useState({ reunioesSemana: 0, propostasEnviadas: 0, fechamentos: 0, mrrMes: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome_clinica: '', plano: 'Pacote Completo', mrr_proposto: '', data_reuniao: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const d = await (await fetch('/api/comercial/pipeline')).json()
    setPipeline(d.pipeline || []); setKpis(d.kpis || kpis); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const criar = async () => {
    setSaving(true)
    await fetch('/api/comercial/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, mrr_proposto: Number(form.mrr_proposto) || 0 }) })
    setForm({ nome_clinica: '', plano: 'Pacote Completo', mrr_proposto: '', data_reuniao: '', observacoes: '' }); setShowForm(false); setSaving(false); load()
  }

  const mover = async (id: string, dir: 'next' | string) => {
    const item = pipeline.find(p => p.id === id); if (!item) return
    let novoStatus: string
    if (dir === 'next') { const idx = STATUS_ORDER.indexOf(item.status); novoStatus = STATUS_ORDER[Math.min(idx + 1, 2)] }
    else novoStatus = dir
    const updates: Record<string, unknown> = { status: novoStatus }
    if (novoStatus === 'fechado') updates.data_fechamento = new Date().toISOString().split('T')[0]
    await fetch('/api/comercial/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) }); load()
  }

  const ativar = async (id: string) => {
    setMsg('')
    const res = await fetch('/api/comercial/ativar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipeline_id: id }) })
    const d = await res.json()
    if (d.success) { setMsg('Cliente ativado! Redirecionando para onboarding...'); setTimeout(() => { window.location.href = '/onboarding/novo' }, 2000) }
    else setMsg('Erro: ' + (d.error || 'falha'))
    setTimeout(() => setMsg(''), 5000)
  }

  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Comercial — Pipeline de Fechamento</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Gestao de propostas e fechamentos</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Nova Proposta</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {msg && <div style={{ background: msg.includes('ativado') ? '#22c55e20' : '#ef444420', border: `1px solid ${msg.includes('ativado') ? '#22c55e' : '#ef4444'}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: msg.includes('ativado') ? '#22c55e' : '#ef4444', fontSize: 13 }}>{msg}</div>}

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

        {showForm && (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Nova Proposta</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Clinica *</label><input value={form.nome_clinica} onChange={e => setForm({ ...form, nome_clinica: e.target.value })} style={inp} /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Plano</label><select value={form.plano} onChange={e => setForm({ ...form, plano: e.target.value })} style={inp}><option>Pacote Completo</option><option>Somente Financeira</option><option>Marketing</option></select></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>MRR (R$)</label><input type="number" value={form.mrr_proposto} onChange={e => setForm({ ...form, mrr_proposto: e.target.value })} style={inp} placeholder="1500" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data reuniao</label><input type="date" value={form.data_reuniao} onChange={e => setForm({ ...form, data_reuniao: e.target.value })} style={inp} /></div>
            </div>
            <div style={{ marginTop: 10 }}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacoes</label><textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} style={{ ...inp, minHeight: 50, resize: 'vertical' }} /></div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={criar} disabled={saving || !form.nome_clinica} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome_clinica ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar'}</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        )}

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {COLS.map(col => {
              const items = pipeline.filter(p => p.status === col.key)
              const mrr = items.reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)
              const idx = STATUS_ORDER.indexOf(col.key)
              return (
                <div key={col.key}>
                  <div style={{ background: `${col.cor}15`, border: `1px solid ${col.cor}30`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, fontWeight: 700, color: col.cor }}>{col.label}</span><span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{items.length}</span></div>
                    {mrr > 0 && <div style={{ fontSize: 10, color: col.cor, marginTop: 2 }}>{fmt(mrr)} MRR</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 100 }}>
                    {items.map(p => (
                      <div key={p.id} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{p.nome_clinica}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>💳 {p.plano || '-'}</div>
                        <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>{fmt(Number(p.mrr_proposto || 0))}/mes</div>
                        {p.lead_id && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: '#3b82f620', color: '#3b82f6', fontWeight: 600, marginBottom: 4, display: 'inline-block' }}>via SDR</span>}
                        {p.data_reuniao && <div style={{ fontSize: 10, color: '#6b7280' }}>📅 {p.data_reuniao}</div>}
                        {p.observacoes && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 4 }}>{p.observacoes.slice(0, 60)}{p.observacoes.length > 60 ? '...' : ''}</div>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {idx < 2 && col.key !== 'perdido' && <button onClick={() => mover(p.id, 'next')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: `${COLS[idx + 1]?.cor || '#6b7280'}20`, color: COLS[idx + 1]?.cor || '#6b7280', border: `1px solid ${COLS[idx + 1]?.cor || '#6b7280'}30`, cursor: 'pointer' }}>Avancar →</button>}
                          {col.key !== 'perdido' && col.key !== 'fechado' && <button onClick={() => mover(p.id, 'perdido')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer' }}>✕ Perdido</button>}
                          {col.key === 'fechado' && <button onClick={() => ativar(p.id)} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', cursor: 'pointer', fontWeight: 700 }}>Ativar como cliente →</button>}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && <div style={{ textAlign: 'center', color: '#252535', fontSize: 11, padding: 20 }}>Vazio</div>}
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
