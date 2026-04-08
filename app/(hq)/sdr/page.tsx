'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Lead = { id: string; nome: string; cidade: string; responsavel_lead: string; telefone: string; origem: string; status: string; proxima_acao: string; observacoes: string; data_contato: string; created_at: string }
type MetaBar = { atual: number; meta: number }

const COLS = [
  { key: 'prospeccao', label: '🔍 Prospeccao', cor: '#6b7280' },
  { key: 'contato', label: '📞 Contato', cor: '#3b82f6' },
  { key: 'agendado', label: '📅 Agendado', cor: '#f59e0b' },
  { key: 'reuniao_feita', label: '🤝 Reuniao feita', cor: '#22c55e' },
  { key: 'perdido', label: '❌ Perdido', cor: '#ef4444' },
]
const ORDER = ['prospeccao', 'contato', 'agendado', 'reuniao_feita', 'perdido']
const ORI: Record<string, { l: string; c: string }> = { meta_ads: { l: 'Meta', c: '#3b82f6' }, google_ads: { l: 'Google', c: '#ef4444' }, indicacao: { l: 'Indicacao', c: '#a855f7' }, organico: { l: 'Organico', c: '#22c55e' }, manual: { l: 'Manual', c: '#6b7280' } }

function diasAtras(d: string) { const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000); return diff === 0 ? 'hoje' : diff + 'd atras' }

export default function SDRPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [kpis, setKpis] = useState({ totalLeads: 0, contatosHoje: 0, agendamentos: 0, taxaConversao: 0 })
  const [metas, setMetas] = useState<{ leads: MetaBar; reunioes: MetaBar; conversoes: MetaBar } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', cidade: '', responsavel_lead: '', telefone: '', origem: 'manual', proxima_acao: '', observacoes: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const d = await (await fetch('/api/sdr/leads')).json()
    setLeads(d.leads || []); setKpis(d.kpis || kpis); setMetas(d.metas || null); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const criar = async () => {
    if (!form.nome) return; setSaving(true)
    await fetch('/api/sdr/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ nome: '', cidade: '', responsavel_lead: '', telefone: '', origem: 'manual', proxima_acao: '', observacoes: '' }); setModal(false); setSaving(false); load()
  }

  const mover = async (id: string, dir: 'next' | 'prev' | string) => {
    const lead = leads.find(l => l.id === id); if (!lead) return
    let s: string
    if (dir === 'next' || dir === 'prev') { const i = ORDER.indexOf(lead.status); s = ORDER[dir === 'next' ? Math.min(i + 1, 3) : Math.max(i - 1, 0)] } else s = dir
    await fetch('/api/sdr/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: s }) }); load()
  }

  const salvarAcao = async (id: string) => {
    await fetch('/api/sdr/leads', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, proxima_acao: editVal }) })
    setEditId(null); load()
  }

  const converter = async (id: string) => {
    setMsg(''); const d = await (await fetch('/api/sdr/leads/converter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lead_id: id }) })).json()
    if (d.success) { setMsg('Lead enviado para o Guilherme ✅'); load() } else setMsg('Erro: ' + (d.error || 'falha'))
    setTimeout(() => setMsg(''), 4000)
  }

  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
  const pctBar = (atual: number, meta: number, cor: string) => {
    const pct = meta > 0 ? Math.min(Math.round((atual / meta) * 100), 100) : 0
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, background: '#252535', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width 0.3s' }} />
        </div>
        <span style={{ fontSize: 12, color: '#fff', fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{atual}/{meta}</span>
        <span style={{ fontSize: 11, color: pct >= 100 ? '#22c55e' : '#6b7280', minWidth: 35 }}>{pct}%</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>SDR — Prospeccao Excalibur</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Captacao de novas clinicas</p></div>
          <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setModal(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Novo Lead</button><button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button></div>
        </div>

        {msg && <div style={{ background: msg.includes('✅') ? '#22c55e20' : '#ef444420', border: `1px solid ${msg.includes('✅') ? '#22c55e' : '#ef4444'}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: msg.includes('✅') ? '#22c55e' : '#ef4444', fontSize: 13 }}>{msg}</div>}

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
          {[{ l: 'Leads total', v: kpis.totalLeads, c: '#3b82f6' }, { l: 'Contatos hoje', v: kpis.contatosHoje, c: '#f59e0b' }, { l: 'Agendamentos', v: kpis.agendamentos, c: '#22c55e' }, { l: 'Taxa conversao', v: kpis.taxaConversao + '%', c: '#a855f7' }].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div><div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        {/* Metas */}
        {metas && (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 12 }}>Metas do Mes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Leads prospectados</div>{pctBar(metas.leads.atual, metas.leads.meta, '#3b82f6')}</div>
              <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Reunioes realizadas</div>{pctBar(metas.reunioes.atual, metas.reunioes.meta, '#f59e0b')}</div>
              <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Conversoes (enviados p/ comercial)</div>{pctBar(metas.conversoes.atual, metas.conversoes.meta, '#22c55e')}</div>
            </div>
          </div>
        )}

        {/* Modal */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal(false)}>
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Novo Lead</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome da clinica *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Cidade</label><input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Responsavel</label><input value={form.responsavel_lead} onChange={e => setForm({ ...form, responsavel_lead: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Telefone</label><input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Origem</label><select value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={inp}><option value="manual">Manual</option><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="indicacao">Indicacao</option><option value="organico">Organico</option></select></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Proxima acao</label><input value={form.proxima_acao} onChange={e => setForm({ ...form, proxima_acao: e.target.value })} style={inp} /></div>
              </div>
              <div style={{ marginTop: 10 }}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacoes</label><textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} style={{ ...inp, minHeight: 60, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={criar} disabled={saving || !form.nome} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar Lead'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Kanban */}
        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {COLS.map(col => {
              const items = leads.filter(l => l.status === col.key)
              return (
                <div key={col.key}>
                  <div style={{ background: `${col.cor}15`, border: `1px solid ${col.cor}30`, borderRadius: 10, padding: '10px 12px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, fontWeight: 700, color: col.cor }}>{col.label}</span><span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{items.length}</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
                    {items.map(l => {
                      const ori = ORI[l.origem] || { l: l.origem, c: '#6b7280' }
                      const idx = ORDER.indexOf(l.status)
                      return (
                        <div key={l.id} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 8, padding: '10px 12px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{l.nome}</div>
                          {l.cidade && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>📍 {l.cidade}</div>}
                          {l.responsavel_lead && <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>👤 {l.responsavel_lead}</div>}
                          {l.telefone && <div style={{ fontSize: 11, marginBottom: 2 }}><a href={`tel:${l.telefone}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>📞 {l.telefone}</a></div>}
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: `${ori.c}20`, color: ori.c, fontWeight: 600 }}>{ori.l}</span>
                            <span style={{ fontSize: 9, color: '#4b5563' }}>{diasAtras(l.created_at)}</span>
                          </div>
                          {l.observacoes && <div style={{ fontSize: 10, color: '#4b5563', marginBottom: 4 }}>{l.observacoes.slice(0, 60)}{l.observacoes.length > 60 ? '...' : ''}</div>}
                          {/* Proxima acao editavel */}
                          <div style={{ marginBottom: 6 }}>
                            {editId === l.id ? (
                              <input autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} onBlur={() => salvarAcao(l.id)} onKeyDown={e => e.key === 'Enter' && salvarAcao(l.id)}
                                style={{ width: '100%', background: '#252535', border: '1px solid #f59e0b', borderRadius: 4, padding: '3px 6px', color: '#f59e0b', fontSize: 11, outline: 'none' }} />
                            ) : (
                              <div onClick={() => { setEditId(l.id); setEditVal(l.proxima_acao || '') }} style={{ fontSize: 11, color: l.proxima_acao ? '#f59e0b' : '#374151', cursor: 'pointer', padding: '3px 0' }} title="Clique para editar">
                                → {l.proxima_acao || 'Definir proxima acao...'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {idx > 0 && col.key !== 'perdido' && <button onClick={() => mover(l.id, 'prev')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: '#252535', color: '#9ca3af', border: 'none', cursor: 'pointer' }}>← Voltar</button>}
                            {idx < 3 && col.key !== 'perdido' && <button onClick={() => mover(l.id, 'next')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: `${COLS[Math.min(idx + 1, 4)]?.cor || '#6b7280'}20`, color: COLS[Math.min(idx + 1, 4)]?.cor || '#6b7280', border: `1px solid ${COLS[Math.min(idx + 1, 4)]?.cor || '#6b7280'}30`, cursor: 'pointer' }}>Avancar →</button>}
                            {col.key !== 'perdido' && col.key !== 'reuniao_feita' && <button onClick={() => mover(l.id, 'perdido')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer' }}>✕</button>}
                            {col.key === 'reuniao_feita' && <button onClick={() => converter(l.id)} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 4, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', cursor: 'pointer', fontWeight: 700 }}>Enviar p/ Comercial →</button>}
                          </div>
                        </div>
                      )
                    })}
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
