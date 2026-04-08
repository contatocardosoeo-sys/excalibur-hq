'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Campanha = {
  id: string; nome: string; canal: string; investimento_total: number
  leads_gerados: number; status: string; data_inicio: string; data_fim: string; created_at: string
}

const CANAL_LABEL: Record<string, string> = {
  meta_ads: 'Meta Ads', google_ads: 'Google Ads', organico: 'Orgânico', indicacao: 'Indicação', outro: 'Outro',
}
const CANAL_COR: Record<string, string> = {
  meta_ads: '#3b82f6', google_ads: '#22c55e', organico: '#a855f7', indicacao: '#f59e0b', outro: '#6b7280',
}
const STATUS_COR: Record<string, string> = { ativa: '#22c55e', pausada: '#f59e0b', encerrada: '#6b7280' }

function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function TrafegoPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [kpis, setKpis] = useState({ totalLeads: 0, cplMedio: 0, totalInvest: 0, roas: 0 })
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nome: '', canal: 'meta_ads', investimento_total: '', data_inicio: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/trafego')
    const d = await res.json()
    setCampanhas(d.campanhas || [])
    setKpis(d.kpis || kpis)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const criar = async () => {
    setSaving(true)
    await fetch('/api/trafego', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, investimento_total: Number(form.investimento_total) || 0, status: 'ativa' }) })
    setForm({ nome: '', canal: 'meta_ads', investimento_total: '', data_inicio: new Date().toISOString().split('T')[0] })
    setShowForm(false); setSaving(false); load()
  }

  const mudarStatus = async (id: string, status: string) => {
    await fetch('/api/trafego', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    load()
  }

  const input: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Trafego — Marketing Excalibur</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Campanhas de captação B2B</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowForm(!showForm)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Nova Campanha</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { l: 'Leads gerados', v: kpis.totalLeads, c: '#3b82f6' },
            { l: 'CPL medio', v: fmt(kpis.cplMedio), c: '#f59e0b' },
            { l: 'Investimento total', v: fmt(kpis.totalInvest), c: '#ef4444' },
            { l: 'ROAS estimado', v: kpis.roas + 'x', c: '#22c55e' },
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
            <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 14 }}>Nova Campanha</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={input} placeholder="Campanha Aposentados SC" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Canal</label><select value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })} style={input}><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="organico">Orgânico</option><option value="indicacao">Indicação</option><option value="outro">Outro</option></select></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Investimento (R$)</label><input type="number" value={form.investimento_total} onChange={e => setForm({ ...form, investimento_total: e.target.value })} style={input} placeholder="5000" /></div>
              <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data inicio</label><input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} style={input} /></div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={criar} disabled={saving || !form.nome} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar'}</button>
              <button onClick={() => setShowForm(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
            </div>
          </div>
        )}

        {/* Tabela campanhas */}
        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div>
        ) : campanhas.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📣</div>
            <p>Nenhuma campanha cadastrada</p>
          </div>
        ) : (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Campanha', 'Canal', 'Investimento', 'Leads', 'CPL', 'Status', 'Acoes'].map(h => (
                    <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campanhas.map(c => {
                  const cpl = c.leads_gerados > 0 ? c.investimento_total / c.leads_gerados : 0
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #252535' }}>
                      <td style={{ padding: '10px 14px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.nome}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${CANAL_COR[c.canal] || '#6b7280'}20`, color: CANAL_COR[c.canal] || '#6b7280', fontWeight: 600 }}>
                          {CANAL_LABEL[c.canal] || c.canal}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#e5e7eb', fontSize: 13 }}>{fmt(Number(c.investimento_total))}</td>
                      <td style={{ padding: '10px 14px', color: '#3b82f6', fontSize: 13, fontWeight: 700 }}>{c.leads_gerados}</td>
                      <td style={{ padding: '10px 14px', color: cpl > 0 && cpl <= 10 ? '#22c55e' : cpl > 10 ? '#ef4444' : '#6b7280', fontSize: 13 }}>{cpl > 0 ? fmt(cpl) : '-'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 999, background: `${STATUS_COR[c.status] || '#6b7280'}20`, color: STATUS_COR[c.status] || '#6b7280', fontWeight: 600 }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.status === 'ativa' && <button onClick={() => mudarStatus(c.id, 'pausada')} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', cursor: 'pointer' }}>Pausar</button>}
                          {c.status === 'pausada' && <button onClick={() => mudarStatus(c.id, 'ativa')} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30', cursor: 'pointer' }}>Ativar</button>}
                          {c.status !== 'encerrada' && <button onClick={() => mudarStatus(c.id, 'encerrada')} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer' }}>Encerrar</button>}
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
