'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Campanha = { id: string; nome: string; canal: string; investimento: number; leads: number; cpl: number; status: string; inicio: string }

const CN: Record<string, { l: string; c: string }> = { meta_ads: { l: 'Meta Ads', c: '#3b82f6' }, google_ads: { l: 'Google Ads', c: '#ef4444' }, organico: { l: 'Organico', c: '#22c55e' }, indicacao: { l: 'Indicacao', c: '#a855f7' }, outro: { l: 'Outro', c: '#6b7280' } }
const SC: Record<string, string> = { ativa: '#22c55e', pausada: '#f59e0b', encerrada: '#6b7280' }
function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function TrafegoPage() {
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [kpis, setKpis] = useState({ totalLeads: 0, cplMedio: 0, totalInvest: 0, ativas: 0 })
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [form, setForm] = useState({ nome: '', canal: 'meta_ads', investimento: '', inicio: new Date().toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)
  const [hover, setHover] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await (await fetch('/api/trafego')).json()
    setCampanhas(d.campanhas || []); setKpis(d.kpis || kpis); setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const criar = async () => {
    if (!form.nome) return; setSaving(true)
    await fetch('/api/trafego', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setForm({ nome: '', canal: 'meta_ads', investimento: '', inicio: new Date().toISOString().split('T')[0] }); setModal(false); setSaving(false); load()
  }
  const mudar = async (id: string, status: string) => {
    await fetch('/api/trafego', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); load()
  }

  const filtered = filtro ? campanhas.filter(c => c.status === filtro) : campanhas
  const ativas = campanhas.filter(c => c.status !== 'encerrada')
  const maxLeads = Math.max(...ativas.map(c => c.leads || 0), 1)
  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Trafego — Marketing Excalibur</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Campanhas de captacao B2B</p></div>
          <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setModal(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Nova Campanha</button><button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button></div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[{ l: 'Total Leads', v: kpis.totalLeads, c: '#3b82f6' }, { l: 'CPL Medio', v: fmt(kpis.cplMedio), c: '#f59e0b' }, { l: 'Investimento Total', v: fmt(kpis.totalInvest), c: '#ef4444' }, { l: 'Campanhas Ativas', v: kpis.ativas, c: '#22c55e' }].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div><div style={{ fontSize: 26, fontWeight: 800, color: k.c }}>{k.v}</div></div>
          ))}
        </div>

        {/* Grafico de barras */}
        {ativas.length > 0 && (
          <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Leads por Campanha</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160 }}>
              {ativas.map(c => {
                const cn = CN[c.canal] || { l: c.canal, c: '#6b7280' }
                const h = Math.max(8, (c.leads / maxLeads) * 140)
                const isHover = hover === c.id
                return (
                  <div key={c.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, position: 'relative' }}
                    onMouseEnter={() => setHover(c.id)} onMouseLeave={() => setHover(null)}>
                    {isHover && (
                      <div style={{ position: 'absolute', bottom: h + 30, background: '#252535', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', zIndex: 10, whiteSpace: 'nowrap', fontSize: 11 }}>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{c.nome}</div>
                        <div style={{ color: '#6b7280' }}>Leads: <span style={{ color: cn.c }}>{c.leads}</span></div>
                        <div style={{ color: '#6b7280' }}>Invest: {fmt(Number(c.investimento))}</div>
                        <div style={{ color: '#6b7280' }}>CPL: {Number(c.cpl) > 0 ? fmt(Number(c.cpl)) : '-'}</div>
                      </div>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: cn.c }}>{c.leads}</span>
                    <div style={{ width: '100%', height: h, background: cn.c, borderRadius: '4px 4px 0 0', transition: 'height 0.3s', opacity: isHover ? 1 : 0.8 }} />
                    <span style={{ fontSize: 9, color: '#6b7280', textAlign: 'center', lineHeight: 1.2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nome.slice(0, 15)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Modal */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal(false)}>
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 520 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nova Campanha</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inp} placeholder="Campanha Aposentados SC" /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Canal</label><select value={form.canal} onChange={e => setForm({ ...form, canal: e.target.value })} style={inp}><option value="meta_ads">Meta Ads</option><option value="google_ads">Google Ads</option><option value="organico">Organico</option><option value="indicacao">Indicacao</option><option value="outro">Outro</option></select></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Investimento (R$)</label><input type="number" value={form.investimento} onChange={e => setForm({ ...form, investimento: e.target.value })} style={inp} placeholder="5000" /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data inicio</label><input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} style={inp} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={criar} disabled={saving || !form.nome} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar Campanha'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros + Tabela */}
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
                  const cn = CN[c.canal] || { l: c.canal, c: '#6b7280' }
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                      <td style={{ padding: '12px 14px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{c.nome}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `${cn.c}20`, color: cn.c, fontWeight: 600 }}>{cn.l}</span></td>
                      <td style={{ padding: '12px 14px', color: '#3b82f6', fontSize: 14, fontWeight: 700 }}>{c.leads}</td>
                      <td style={{ padding: '12px 14px', color: Number(c.cpl) > 0 && Number(c.cpl) <= 100 ? '#22c55e' : Number(c.cpl) > 100 ? '#ef4444' : '#6b7280', fontSize: 13 }}>{Number(c.cpl) > 0 ? fmt(Number(c.cpl)) : '-'}</td>
                      <td style={{ padding: '12px 14px', color: '#e5e7eb', fontSize: 13 }}>{fmt(Number(c.investimento))}</td>
                      <td style={{ padding: '12px 14px' }}><span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: `${SC[c.status] || '#6b7280'}20`, color: SC[c.status] || '#6b7280', fontWeight: 600 }}>{c.status}</span></td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {c.status === 'ativa' && <button onClick={() => mudar(c.id, 'pausada')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', cursor: 'pointer' }}>Pausar</button>}
                          {c.status === 'pausada' && <button onClick={() => mudar(c.id, 'ativa')} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30', cursor: 'pointer' }}>Ativar</button>}
                          {c.status !== 'encerrada' && <button onClick={() => { if (confirm('Encerrar campanha?')) mudar(c.id, 'encerrada') }} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 6, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer' }}>Encerrar</button>}
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
