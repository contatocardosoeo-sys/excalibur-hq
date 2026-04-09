'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

type Etapa = { nome: string; valor: number; custo: number | null; custoLabel: string | null; taxa: number | null; diag: { cor: string; status: string; emoji: string } | null; baseline: number | null }
type Decisao = { metrica: string; valor: number; cor: string; status: string; emoji: string; acoes: string[]; baseline: number; unidade: string }
type MetasOps = { faturamento: number; vendas: number; reunioes: number; agendamentos: number; leads: number; leadsDia: number; agendDia: number; reunioesDia: number; vendasDia: number }

function f$(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v < 100 ? 2 : 0 }) }
function pct(v: number) { return v.toFixed(1) + '%' }

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function TrafegoBI() {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [ano, setAno] = useState(new Date().getFullYear())
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [diario, setDiario] = useState<Record<string, number>>({})
  const [gargalo, setGargalo] = useState<{ nome: string; taxa: number; status: string; acoes: string[] } | null>(null)
  const [alertas, setAlertas] = useState<string[]>([])
  const [decisoes, setDecisoes] = useState<Decisao[]>([])
  const [metasOps, setMetasOps] = useState<{ minima: MetasOps; normal: MetasOps; super: MetasOps } | null>(null)
  const [resumo, setResumo] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDados, setShowDados] = useState(false)
  const [metaTab, setMetaTab] = useState<'minima' | 'normal' | 'super'>('normal')
  const [dadosForm, setDadosForm] = useState({ investimento_total: '', leads: '', agendamentos: '', reunioes_realizadas: '', reunioes_qualificadas: '', fechamentos: '', faturamento: '' })
  const [saving, setSaving] = useState(false)
  const [funil, setFunil] = useState<Record<string, number> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await (await fetch(`/api/trafego/funil?mes=${mes}&ano=${ano}`)).json()
      setEtapas(d.etapas || [])
      setMetricas(d.metricas || {})
      setDiario(d.diario || {})
      setGargalo(d.gargalo || null)
      setAlertas(d.alertas || [])
      setDecisoes(d.decisoes || [])
      setMetasOps(d.metasOps || null)
      setResumo(d.resumo || '')
      setFunil(d.funil || null)
      if (d.funil) {
        const ff = d.funil
        setDadosForm({ investimento_total: String(ff.investimento_total || ''), leads: String(ff.leads || ''), agendamentos: String(ff.agendamentos || ''), reunioes_realizadas: String(ff.reunioes_realizadas || ''), reunioes_qualificadas: String(ff.reunioes_qualificadas || ''), fechamentos: String(ff.fechamentos || ''), faturamento: String(ff.faturamento || '') })
      }
    } catch { /* */ }
    setLoading(false)
  }, [mes, ano])

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
    await fetch('/api/trafego/funil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mes, ano, investimento_total: Number(dadosForm.investimento_total), leads: Number(dadosForm.leads), agendamentos: Number(dadosForm.agendamentos), reunioes_realizadas: Number(dadosForm.reunioes_realizadas), reunioes_qualificadas: Number(dadosForm.reunioes_qualificadas), fechamentos: Number(dadosForm.fechamentos), faturamento: Number(dadosForm.faturamento) }) })
    setSaving(false); setShowDados(false); load()
  }

  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
  const maxVal = Math.max(...etapas.filter(e => e.nome !== 'Faturamento').map(e => e.valor), 1)

  const metaSel = metasOps ? metasOps[metaTab] : null

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>BI Comercial — Funil de Vendas</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>2 closers · 10 reunioes/dia · Ticket medio R$2.000</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select value={mes} onChange={e => setMes(Number(e.target.value))} style={{ background: '#13131f', border: '1px solid #252535', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <select value={ano} onChange={e => setAno(Number(e.target.value))} style={{ background: '#13131f', border: '1px solid #252535', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {[2025, 2026, 2027].map(a => <option key={a}>{a}</option>)}
            </select>
            <button onClick={() => setShowDados(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Atualizar dados</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando...</div> : !funil ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Sem dados para {MESES[mes - 1]}/{ano}</div> : (
          <>
            {/* 1. ALERTAS */}
            {alertas.length > 0 && (
              <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                {alertas.map((a, i) => <div key={i} style={{ fontSize: 12, color: '#ef4444', padding: '3px 0' }}>⚠️ {a}</div>)}
              </div>
            )}

            {/* 2. FUNIL HORIZONTAL */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funil Comercial</h3>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                {etapas.map((e, i) => {
                  const isLast = e.nome === 'Faturamento'
                  const barH = isLast ? 80 : Math.max(40, (e.valor / maxVal) * 80)
                  return (
                    <div key={e.nome} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ flex: 1, background: e.diag ? `${e.diag.cor}10` : '#1a1a2e', border: `1px solid ${e.diag?.cor || '#252535'}30`, borderRadius: 10, padding: '12px 10px', textAlign: 'center', minHeight: barH }}>
                        {e.diag && <div style={{ fontSize: 12, marginBottom: 4 }}>{e.diag.emoji}</div>}
                        <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{e.nome}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: isLast ? '#f59e0b' : e.diag?.cor || '#fff', margin: '4px 0' }}>{isLast ? f$(e.valor) : e.valor}</div>
                        {e.taxa != null && <div style={{ fontSize: 11, color: e.diag?.cor || '#6b7280', fontWeight: 600 }}>{pct(e.taxa)}</div>}
                        {e.custo != null && <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>{e.custoLabel}: {f$(e.custo)}</div>}
                        {e.baseline != null && <div style={{ fontSize: 8, color: '#374151', marginTop: 2 }}>baseline: {e.baseline < 100 ? (e.baseline < 1 ? f$(e.baseline) : e.baseline + '%') : f$(e.baseline)}</div>}
                      </div>
                      {i < etapas.length - 1 && <span style={{ color: '#374151', fontSize: 16, margin: '0 2px', flexShrink: 0 }}>→</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 3. MÉTRICAS + CUSTOS + DIÁRIO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
              {/* Conversões */}
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Conversoes</h4>
                {[
                  { l: 'Lead → Agend', v: metricas.txAgend, u: '%' },
                  { l: 'Agend → Reuniao', v: metricas.txComp, u: '%' },
                  { l: 'Reuniao → Qualif', v: metricas.txQual, u: '%' },
                  { l: 'Qualif → Venda', v: metricas.txConv, u: '%' },
                ].map(m => <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>{m.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{m.v?.toFixed(1)}{m.u}</span></div>)}
              </div>
              {/* Custos */}
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Custos</h4>
                {[
                  { l: 'CPL', v: metricas.cpl, c: metricas.cpl <= 12 ? '#22c55e' : '#f59e0b' },
                  { l: 'Custo/agendamento', v: metricas.custoAgend, c: '#fff' },
                  { l: 'Custo/reuniao', v: metricas.custoReuniao, c: '#fff' },
                  { l: 'CAC', v: metricas.cac, c: metricas.cac <= 200 ? '#22c55e' : metricas.cac <= 300 ? '#f59e0b' : '#ef4444' },
                  { l: 'ROAS', v: metricas.roas, c: '#3b82f6', fmt: 'x' },
                ].map(m => <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>{m.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: m.c }}>{m.fmt === 'x' ? (m.v?.toFixed(1) + 'x') : f$(m.v || 0)}</span></div>)}
              </div>
              {/* Diário */}
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Operacional Diario</h4>
                {[
                  { l: 'Leads/dia', v: diario.leadsDia, meta: 34 },
                  { l: 'Agendamentos/dia', v: diario.agendDia, meta: 12 },
                  { l: 'Reunioes/dia', v: diario.reunioesDia, meta: 10 },
                  { l: 'Vendas/dia', v: diario.vendasDia, meta: 2 },
                ].map(m => {
                  const ok = (m.v || 0) >= m.meta
                  return <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>{m.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: ok ? '#22c55e' : '#ef4444' }}>{m.v?.toFixed(1)} <span style={{ fontSize: 9, color: '#4b5563', fontWeight: 400 }}>meta: {m.meta}</span></span></div>
                })}
              </div>
            </div>

            {/* 4. DECISÕES POR MÉTRICA + GARGALO */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase' }}>Diagnostico + Acoes</h3>
              {gargalo && (
                <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>🚨 GARGALO PRINCIPAL: {gargalo.nome} ({gargalo.taxa.toFixed(1)}%)</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {(gargalo.acoes || []).map((a, i) => <div key={i} style={{ fontSize: 11, color: '#e5e7eb', paddingLeft: 16 }}>→ {a}</div>)}
                  </div>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                {decisoes.map(d => (
                  <div key={d.metrica} style={{ background: `${d.cor}08`, border: `1px solid ${d.cor}25`, borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{d.metrica}</span>
                      <span style={{ fontSize: 12 }}>{d.emoji}</span>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: d.cor }}>{d.unidade === 'R$' ? f$(d.valor) : pct(d.valor)}</div>
                    <div style={{ fontSize: 8, color: '#4b5563', marginBottom: 6 }}>baseline: {d.unidade === 'R$' ? f$(d.baseline) : pct(d.baseline)}</div>
                    {d.acoes.slice(0, 2).map((a, i) => <div key={i} style={{ fontSize: 9, color: '#9ca3af', padding: '2px 0' }}>→ {a}</div>)}
                  </div>
                ))}
              </div>
            </div>

            {/* 5. METAS OPERACIONAIS — 3 TIERS */}
            {metasOps && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', margin: 0, textTransform: 'uppercase' }}>Metas Operacionais</h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {([['minima', '🔻 Minima R$74k', '#ef4444'], ['normal', '⚖️ Normal R$90k', '#f59e0b'], ['super', '🚀 Super R$106k', '#22c55e']] as const).map(([k, l, c]) => (
                      <button key={k} onClick={() => setMetaTab(k)} style={{ background: metaTab === k ? `${c}20` : 'transparent', border: `1px solid ${metaTab === k ? c : '#252535'}`, color: metaTab === k ? c : '#6b7280', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: metaTab === k ? 700 : 400 }}>{l}</button>
                    ))}
                  </div>
                </div>
                {metaSel && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {[
                      { l: 'Leads', atual: funil?.leads || 0, meta: metaSel.leads, diario: metaSel.leadsDia },
                      { l: 'Agendamentos', atual: funil?.agendamentos || 0, meta: metaSel.agendamentos, diario: metaSel.agendDia },
                      { l: 'Reunioes', atual: funil?.reunioes_realizadas || 0, meta: metaSel.reunioes, diario: metaSel.reunioesDia },
                      { l: 'Vendas', atual: funil?.fechamentos || 0, meta: metaSel.vendas, diario: metaSel.vendasDia },
                    ].map(m => {
                      const p = m.meta > 0 ? Math.min(Math.round((m.atual / m.meta) * 100), 100) : 0
                      const cor = p >= 80 ? '#22c55e' : p >= 50 ? '#f59e0b' : '#ef4444'
                      return (
                        <div key={m.l} style={{ background: '#09090f', borderRadius: 8, padding: 12 }}>
                          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>{m.l}</div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                            <span style={{ fontSize: 22, fontWeight: 800, color: cor }}>{m.atual}</span>
                            <span style={{ fontSize: 12, color: '#4b5563' }}>/ {m.meta}</span>
                          </div>
                          <div style={{ height: 6, background: '#252535', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                            <div style={{ height: '100%', width: `${p}%`, background: cor, borderRadius: 3 }} />
                          </div>
                          <div style={{ fontSize: 9, color: '#4b5563' }}>{p}% · meta diaria: {m.diario}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
                {metaSel && <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginTop: 12, textAlign: 'center' }}>Meta faturamento: {f$(metaSel.faturamento)} · Atual: {f$(funil?.faturamento || 0)}</div>}
              </div>
            )}

            {/* 6. RESUMO EXECUTIVO */}
            {resumo && (
              <div style={{ background: '#13131f', border: '1px solid #f59e0b30', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 10 }}>Resumo Executivo</h3>
                <p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.6, margin: 0 }}>{resumo}</p>
              </div>
            )}

            {/* MODAL DADOS */}
            {showDados && (
              <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowDados(false)}>
                <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 520 }} onClick={e => e.stopPropagation()}>
                  <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Dados — {MESES[mes - 1]}/{ano}</h3>
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
          </>
        )}
      </div>
    </div>
  )
}
