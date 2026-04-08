'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Campanha = { id: string; nome: string; canal: string; investimento: number; leads: number; cpl: number; status: string; inicio: string; fim: string }

const CANAL = { meta_ads: { l: 'Meta Ads', c: '#3b82f6' }, google_ads: { l: 'Google Ads', c: '#ef4444' }, organico: { l: 'Organico', c: '#22c55e' }, indicacao: { l: 'Indicacao', c: '#a855f7' }, outro: { l: 'Outro', c: '#6b7280' } } as Record<string, { l: string; c: string }>
const STATUS_C: Record<string, string> = { ativa: '#22c55e', pausada: '#f59e0b', encerrada: '#6b7280' }
function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function TrafegoPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [kpis, setKpis] = useState({ totalLeads: 0, cplMedio: 0, totalInvest: 0, ativas: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState({ nome: '', canal: 'meta_ads', investimento: '', inicio: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await (await fetch('/api/trafego')).json()
    setCampanhas(d.campanhas || []); setKpis(d.kpis || kpis); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const criar = async () => {
    setSaving(true)
    await fetch('/api/trafego', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ nome: '', canal: 'meta_ads', investimento: '', inicio: new Date().toISOString().split('T')[0] }); setShowForm(false); setSaving(false); load()
  }
  const mudar = async (id: string, status: string) => {
    await fetch('/api/trafego', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); load()
  }

  const filtered = filtro ? campanhas.filter(c => c.status === filtro) : campanhas
  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Trafego — Marketing Excalibur</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Campanhas de captacao B2B</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Nova Campanha</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Total Leads', v: kpis.totalLeads, c: '#3b82f6' },
            { l: 'CPL Medio', v: fmt(kpis.cplMedio), c: '#f59e0b' },
            { l: 'Investimento Total', v: fmt(kpis.totalInvest), c: '#ef4444' },
            { l: 'Campanhas Ativas', v: kpis.ativas, c: '#22c55e' },
          ].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {showForm && (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Nova Campanha</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inp} placeholder="Campanha Aposentados SC" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Canal</label><select value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })} style={inp}><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="organico">Organico</option><option value="indicacao">Indicacao</option><option value="outro">Outro</option></select></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Investimento (R$)</label><input type="number" value={form.investimento} onChange={e => setForm({ ...form, investimento: e.target.value })} style={inp} placeholder="5000" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data inicio</label><input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} style={inp} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={criar} disabled={saving || !form.nome} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar'}</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {[{ k: '', l: 'Todas' }, { k: 'ativa', l: 'Ativas' }, { k: 'pausada', l: 'Pausadas' }, { k: 'encerrada', l: 'Encerradas' }].map(f => (
            <button key={f.k} onClick={() => setFiltro(filtro === f.k ? '' : f.k)} style={{ background: filtro === f.k ? '#f59e0b20' : 'transparent', border: `1px solid ${filtro === f.k ? '#f59e0b' : '#252535'}`, color: filtro === f.k ? '#f59e0b' : '#9ca3af', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>{f.l}</button>
          ))}
          <span style={{ color: '#4b5563', fontSize: 12, marginLeft: 8, alignSelf: 'center' }}>{filtered.length} campanha{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div> : filtered.length === 0 ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}><div style={{ fontSize: 40, marginBottom: 12 }}>📣</div><p>Nenhuma campanha</p></div> : (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Campanha', 'Canal', 'Leads', 'CPL', 'Investimento', 'Status', 'Acoes'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
              <tbody>
                {filtered.map(c => {
                  const cn = CANAL[c.canal] || { l: c.canal, c: '#6b7280' }
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                      <td style={{ padding: '12px 14px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.nome}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `${cn.c}20`, color: cn.c, fontWeight: 600 }}>{cn.l}</span></td>
                      <td style={{ padding: '12px 14px', color: '#3b82f6', fontSize: 14, fontWeight: 700 }}>{c.leads}</td>
                      <td style={{ padding: '12px 14px', color: Number(c.cpl) > 0 && Number(c.cpl) <= 100 ? '#22c55e' : Number(c.cpl) > 100 ? '#ef4444' : '#6b7280', fontSize: 13 }}>{Number(c.cpl) > 0 ? fmt(Number(c.cpl)) : '-'}</td>
                      <td style={{ padding: '12px 14px', color: '#e5e7eb', fontSize: 13 }}>{fmt(Number(c.investimento))}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `${STATUS_C[c.status] || '#6b7280'}20`, color: STATUS_C[c.status] || '#6b7280', fontWeight: 600 }}>{c.status}</span></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.status === 'ativa' && <button onClick={() => mudar(c.id, 'pausada')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', cursor: 'pointer' }}>Pausar</button>}
                          {c.status === 'pausada' && <button onClick={() => mudar(c.id, 'ativa')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30', cursor: 'pointer' }}>Ativar</button>}
                          {c.status !== 'encerrada' && <button onClick={() => mudar(c.id, 'encerrada')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer' }}>Encerrar</button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
