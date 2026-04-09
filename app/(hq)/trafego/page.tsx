'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

type Etapa = { nome: string; valor: number; fmt: string; taxa?: number | null; diag: { cor: string; status: string; emoji: string } | null; meta?: { minima: number; boa: number; excelente: number; unidade: string } }
type Campanha = { id: string; nome: string; canal: string; investimento: number; leads: number; leads_reais: number; cpl: number; status: string }
type MetaRow = { nome: string; meta_minima: number; meta_boa: number; meta_excelente: number; unidade: string }

function fmt$(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }
const CN: Record<string, { l: string; c: string }> = { meta_ads: { l: 'Meta Ads', c: '#3b82f6' }, google_ads: { l: 'Google Ads', c: '#ef4444' }, organico: { l: 'Organico', c: '#22c55e' }, indicacao: { l: 'Indicacao', c: '#a855f7' }, outro: { l: 'Outro', c: '#6b7280' } }
const SC: Record<string, string> = { ativa: '#22c55e', pausada: '#f59e0b', encerrada: '#6b7280' }

export default function TrafegoPage() {
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [gargalo, setGargalo] = useState<{ nome: string; taxa: number; status: string } | null>(null)
  const [alertas, setAlertas] = useState<string[]>([])
  const [metas, setMetas] = useState<MetaRow[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [kpisCamp, setKpisCamp] = useState({ totalLeads: 0, cplMedio: 0, totalInvest: 0, ativas: 0 })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDados, setShowDados] = useState(false)
  const [showMetas, setShowMetas] = useState(false)
  const [showCamp, setShowCamp] = useState(false)
  const [dadosForm, setDadosForm] = useState({ investimento_total: '', leads: '', agendamentos: '', reunioes_realizadas: '', reunioes_qualificadas: '', fechamentos: '', faturamento: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [funilRes, campRes] = await Promise.all([
        fetch('/api/trafego/funil').then(r => r.json()),
        fetch('/api/trafego').then(r => r.json()),
      ])
      setEtapas(funilRes.etapas || [])
      setMetricas(funilRes.metricas || {})
      setGargalo(funilRes.gargalo || null)
      setAlertas(funilRes.alertas || [])
      setMetas(funilRes.metas || [])
      if (funilRes.funil) {
        const f = funilRes.funil
        setDadosForm({ investimento_total: String(f.investimento_total || ''), leads: String(f.leads || ''), agendamentos: String(f.agendamentos || ''), reunioes_realizadas: String(f.reunioes_realizadas || ''), reunioes_qualificadas: String(f.reunioes_qualificadas || ''), fechamentos: String(f.fechamentos || ''), faturamento: String(f.faturamento || '') })
      }
      setCampanhas(campRes.campanhas || [])
      setKpisCamp(campRes.kpis || { totalLeads: 0, cplMedio: 0, totalInvest: 0, ativas: 0 })
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        const { data: u } = await supabase.from('usuarios_internos').select('roles, role').eq('email', session.user.email).single()
        const roles: string[] = (u?.roles && Array.isArray(u.roles) && u.roles.length > 0) ? u.roles : [u?.role || '']
        setIsAdmin(roles.includes('admin'))
      }
    })()
  }, [])

  const salvarDados = async () => {
    setSaving(true)
    await fetch('/api/trafego/funil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mes: new Date().getMonth() + 1, ano: new Date().getFullYear(), investimento_total: Number(dadosForm.investimento_total), leads: Number(dadosForm.leads), agendamentos: Number(dadosForm.agendamentos), reunioes_realizadas: Number(dadosForm.reunioes_realizadas), reunioes_qualificadas: Number(dadosForm.reunioes_qualificadas), fechamentos: Number(dadosForm.fechamentos), faturamento: Number(dadosForm.faturamento) }) })
    setSaving(false); setShowDados(false); load()
  }

  const salvarMeta = async (nome: string, field: string, val: string) => {
    await fetch('/api/trafego/metas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome, [field]: Number(val) }) })
    load()
  }

  const mudarCamp = async (id: string, status: string) => {
    await fetch('/api/trafego', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) }); load()
  }

  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
  const maxFunil = Math.max(...etapas.filter(e => e.fmt === 'num').map(e => e.valor), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Trafego — BI Comercial</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Funil completo · Diagnostico automatico · Abril/2026</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowDados(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Atualizar dados do mes</button>
            {isAdmin && <button onClick={() => setShowMetas(true)} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>⚙️ Editar metas</button>}
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando...</div> : (
          <>
            {/* SEÇÃO 1 — FUNIL VISUAL HORIZONTAL */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Funil Comercial — Investimento → Faturamento</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {etapas.map((e, i) => {
                  const isNum = e.fmt === 'num'
                  const w = isNum ? Math.max(60, (e.valor / maxFunil) * 120) : 90
                  return (
                    <div key={e.nome} style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{ width: w, background: e.diag?.cor ? `${e.diag.cor}15` : '#1a1a2e', border: `1px solid ${e.diag?.cor || '#252535'}40`, borderRadius: 10, padding: '10px 8px', textAlign: 'center', position: 'relative' }}>
                        {e.diag && <span style={{ position: 'absolute', top: 4, right: 6, fontSize: 10 }}>{e.diag.emoji}</span>}
                        <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', marginBottom: 4 }}>{e.nome}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: e.diag?.cor || '#fff' }}>{e.fmt === 'R$' ? fmt$(e.valor) : e.valor}</div>
                        {e.taxa != null && <div style={{ fontSize: 10, color: e.diag?.cor || '#6b7280', marginTop: 2 }}>{e.taxa}%</div>}
                        {e.meta && <div style={{ fontSize: 8, color: '#4b5563', marginTop: 2 }}>meta: {e.meta.unidade === 'R$' ? fmt$(e.meta.minima) : e.meta.minima + '%'}</div>}
                      </div>
                      {i < etapas.length - 1 && <span style={{ color: '#374151', fontSize: 14, margin: '0 2px' }}>→</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SEÇÃO 2 — MÉTRICAS DERIVADAS */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {[
                { l: 'CPL', v: fmt$(metricas.cpl || 0), d: etapas.find(e => e.nome === 'CPL')?.diag },
                { l: 'CAC', v: fmt$(metricas.cac || 0), d: metricas.cac && metricas.cac > 300 ? { cor: '#ef4444', emoji: '🔴' } : metricas.cac && metricas.cac <= 200 ? { cor: '#22c55e', emoji: '🟢' } : { cor: '#f59e0b', emoji: '🟡' } },
                { l: 'Ticket Medio', v: fmt$(metricas.ticketMedio || 0), d: { cor: '#3b82f6', emoji: '💰' } },
                { l: 'ROAS', v: (metricas.roas || 0).toFixed(1) + 'x', d: metricas.roas >= 3 ? { cor: '#22c55e', emoji: '🟢' } : metricas.roas >= 1 ? { cor: '#f59e0b', emoji: '🟡' } : { cor: '#ef4444', emoji: '🔴' } },
              ].map(k => (
                <div key={k.l} style={{ background: '#13131f', border: `1px solid ${k.d?.cor || '#252535'}40`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{k.l}</span>
                    <span style={{ fontSize: 12 }}>{k.d?.emoji}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: k.d?.cor || '#fff', marginTop: 4 }}>{k.v}</div>
                </div>
              ))}
            </div>

            {/* SEÇÃO 3 — ALERTAS + GARGALO */}
            {(alertas.length > 0 || gargalo) && (
              <div style={{ background: '#13131f', border: '1px solid #ef444440', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                {gargalo && (
                  <div style={{ marginBottom: alertas.length > 0 ? 12 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>🚨 Gargalo principal: {gargalo.nome}</span>
                    <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 8 }}>{gargalo.taxa}% (status: {gargalo.status})</span>
                  </div>
                )}
                {alertas.map((a, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#f59e0b', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>⚠️</span> {a}
                  </div>
                ))}
              </div>
            )}

            {/* SEÇÃO 4 — METAS (barras comparativas) */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Metas vs Atual</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {metas.map(m => {
                  const etapa = etapas.find(e => {
                    if (m.nome === 'CPL') return e.nome === 'CPL'
                    if (m.nome === 'Taxa Agendamento') return e.nome === 'Agendamentos'
                    if (m.nome === 'Taxa Comparecimento') return e.nome === 'Reunioes'
                    if (m.nome === 'Taxa Qualificacao') return e.nome === 'Qualificadas'
                    if (m.nome === 'Taxa Conversao') return e.nome === 'Fechamentos'
                    return false
                  })
                  const atual = etapa?.taxa ?? (etapa?.nome === 'CPL' ? etapa.valor : 0)
                  const target = Number(m.meta_minima)
                  const pct = target > 0 ? Math.min((atual / target) * 100, 150) : 0
                  const cor = etapa?.diag?.cor || '#6b7280'
                  return (
                    <div key={m.nome}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>{m.nome}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: cor }}>{m.unidade === 'R$' ? fmt$(atual) : atual + '%'}</span>
                      </div>
                      <div style={{ height: 6, background: '#252535', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: cor, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>Meta minima: {m.unidade === 'R$' ? fmt$(target) : target + '%'}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* SEÇÃO 5 — CAMPANHAS */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>Campanhas Ativas</h3>
                <button onClick={() => setShowCamp(!showCamp)} style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11 }}>{showCamp ? 'Fechar' : '+ Nova'}</button>
              </div>
              {showCamp && (
                <div style={{ marginBottom: 16, padding: 12, background: '#1a1a2e', borderRadius: 8 }}>
                  <CampForm onDone={() => { setShowCamp(false); load() }} />
                </div>
              )}
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Campanha', 'Canal', 'Leads', 'CPL', 'Invest', 'Status', ''].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {campanhas.map(c => {
                    const cn = CN[c.canal] || { l: c.canal, c: '#6b7280' }
                    return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '8px 10px', color: '#fff', fontSize: 12 }}>{c.nome}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${cn.c}20`, color: cn.c }}>{cn.l}</span></td>
                        <td style={{ padding: '8px 10px', color: '#3b82f6', fontSize: 12, fontWeight: 700 }}>{c.leads}</td>
                        <td style={{ padding: '8px 10px', color: '#6b7280', fontSize: 11 }}>{Number(c.cpl) > 0 ? fmt$(Number(c.cpl)) : '-'}</td>
                        <td style={{ padding: '8px 10px', color: '#e5e7eb', fontSize: 11 }}>{fmt$(Number(c.investimento))}</td>
                        <td style={{ padding: '8px 10px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: `${SC[c.status] || '#6b7280'}20`, color: SC[c.status] || '#6b7280' }}>{c.status}</span></td>
                        <td style={{ padding: '8px 10px' }}>
                          {c.status === 'ativa' && <button onClick={() => mudarCamp(c.id, 'pausada')} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', cursor: 'pointer' }}>Pausar</button>}
                          {c.status === 'pausada' && <button onClick={() => mudarCamp(c.id, 'ativa')} style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30', cursor: 'pointer' }}>Ativar</button>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* MODAL DADOS */}
            {showDados && (
              <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowDados(false)}>
                <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 520 }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Atualizar dados — Abril/2026</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {[
                      { k: 'investimento_total', l: 'Investimento (R$)' }, { k: 'leads', l: 'Leads gerados' },
                      { k: 'agendamentos', l: 'Agendamentos' }, { k: 'reunioes_realizadas', l: 'Reunioes realizadas' },
                      { k: 'reunioes_qualificadas', l: 'Reunioes qualificadas' }, { k: 'fechamentos', l: 'Fechamentos' },
                      { k: 'faturamento', l: 'Faturamento (R$)' },
                    ].map(f => (
                      <div key={f.k}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>{f.l}</label><input type="number" value={(dadosForm as Record<string, string>)[f.k]} onChange={e => setDadosForm({ ...dadosForm, [f.k]: e.target.value })} style={inp} /></div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button onClick={salvarDados} disabled={saving} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Salvar'}</button>
                    <button onClick={() => setShowDados(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                  </div>
                </div>
              </div>
            )}

            {/* MODAL METAS */}
            {showMetas && (
              <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowMetas(false)}>
                <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 600 }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>⚙️ Editar Metas</h3>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Metrica', 'Minima', 'Boa', 'Excelente', 'Un.'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, padding: '6px 8px', textAlign: 'left' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {metas.map(m => (
                        <tr key={m.nome}>
                          <td style={{ padding: '6px 8px', color: '#fff', fontSize: 12 }}>{m.nome}</td>
                          {['meta_minima', 'meta_boa', 'meta_excelente'].map(f => (
                            <td key={f} style={{ padding: '4px 4px' }}><input type="number" defaultValue={Number((m as Record<string, unknown>)[f])} onBlur={e => salvarMeta(m.nome, f, e.target.value)} style={{ ...inp, width: 70, textAlign: 'center', padding: '4px 6px' }} /></td>
                          ))}
                          <td style={{ padding: '6px 8px', color: '#6b7280', fontSize: 11 }}>{m.unidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <button onClick={() => setShowMetas(false)} style={{ marginTop: 16, background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>Fechar</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function CampForm({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ nome: '', canal: 'meta_ads', investimento: '', inicio: new Date().toISOString().split('T')[0] })
  const [s, setS] = useState(false)
  const criar = async () => { setS(true); await fetch('/api/trafego', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); setS(false); onDone() }
  const inp: React.CSSProperties = { width: '100%', background: '#252535', border: '1px solid #374151', borderRadius: 6, padding: '6px 10px', color: '#fff', fontSize: 12, outline: 'none' }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, alignItems: 'end' }}>
      <div><label style={{ color: '#6b7280', fontSize: 10, display: 'block', marginBottom: 2 }}>Nome</label><input value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} style={inp} /></div>
      <div><label style={{ color: '#6b7280', fontSize: 10, display: 'block', marginBottom: 2 }}>Canal</label><select value={f.canal} onChange={e => setF({ ...f, canal: e.target.value })} style={inp}><option value="meta_ads">Meta</option><option value="google_ads">Google</option><option value="organico">Organico</option><option value="indicacao">Indicacao</option></select></div>
      <div><label style={{ color: '#6b7280', fontSize: 10, display: 'block', marginBottom: 2 }}>Invest R$</label><input type="number" value={f.investimento} onChange={e => setF({ ...f, investimento: e.target.value })} style={inp} /></div>
      <button onClick={criar} disabled={s || !f.nome} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700, opacity: s ? 0.5 : 1, height: 30 }}>Criar</button>
    </div>
  )
}
