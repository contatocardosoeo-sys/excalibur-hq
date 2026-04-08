'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Lead = {
  id: string; nome: string; cidade: string; responsavel_lead: string; telefone: string
  origem: string; status: string; proxima_acao: string; data_contato: string
  data_reuniao: string; observacoes: string; created_at: string
}

const COLUNAS = [
  { key: 'prospeccao', label: '🔍 Prospecção', cor: '#6b7280' },
  { key: 'contato', label: '📞 Contato', cor: '#3b82f6' },
  { key: 'agendado', label: '📅 Agendado', cor: '#f59e0b' },
  { key: 'reuniao_feita', label: '🤝 Reunião feita', cor: '#22c55e' },
  { key: 'perdido', label: '❌ Perdido', cor: '#ef4444' },
]

export default function SDRPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [kpis, setKpis] = useState({ leadsHoje: 0, contatosHoje: 0, agendamentosHoje: 0, taxaConversao: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', cidade: '', responsavel_lead: '', telefone: '', origem: 'manual' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/sdr/leads')
    const d = await res.json()
    setLeads(d.leads || [])
    setKpis(d.kpis || kpis)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const criar = async () => {
    setSaving(true)
    await fetch('/api/sdr/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ nome: '', cidade: '', responsavel_lead: '', telefone: '', origem: 'manual' })
    setShowForm(false)
    setSaving(false)
    load()
  }

  const mover = async (id: string, novoStatus: string) => {
    await fetch('/api/sdr/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: novoStatus }) })
    load()
  }

  const input: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>SDR — Prospecção Excalibur</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Captação de novas clinicas</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Novo Lead</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Leads hoje', v: kpis.leadsHoje, c: '#3b82f6' },
            { l: 'Contatos feitos', v: kpis.contatosHoje, c: '#f59e0b' },
            { l: 'Agendamentos', v: kpis.agendamentosHoje, c: '#22c55e' },
            { l: 'Taxa conversao', v: kpis.taxaConversao + '%', c: '#a855f7' },
          ].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Form novo lead */}
        {showForm && (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Novo Lead</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={input} placeholder="Clinica XYZ" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Cidade</label><input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} style={input} /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Responsavel</label><input value={form.responsavel_lead} onChange={e => setForm({ ...form, responsavel_lead: e.target.value })} style={input} /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={input} /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Origem</label><select value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={input}><option value="manual">Manual</option><option value="indicacao">Indicação</option><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="organico">Orgânico</option></select></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={criar} disabled={saving || !form.nome} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar Lead'}</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Kanban */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {COLUNAS.map(col => {
              const items = leads.filter(l => l.status === col.key)
              return (
                <div key={col.key}>
                  <div style={{ background: `${col.cor}15`, border: `1px solid ${col.cor}30`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: col.cor }}>{col.label}</span>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{items.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map(l => (
                      <div key={l.id} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{l.nome}</div>
                        {l.cidade && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>📍 {l.cidade}</div>}
                        {l.responsavel_lead && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>👤 {l.responsavel_lead}</div>}
                        {l.proxima_acao && <div style={{ fontSize: 11, color: '#f59e0b', marginBottom: 4 }}>→ {l.proxima_acao}</div>}
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                          {COLUNAS.filter(c => c.key !== col.key && c.key !== 'perdido').map(c => (
                            <button key={c.key} onClick={() => mover(l.id, c.key)} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: `${c.cor}15`, color: c.cor, border: `1px solid ${c.cor}30`, cursor: 'pointer' }}>
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
