'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import MetaAdsPanel from '../../components/MetaAdsPanel'
import { supabase } from '../../lib/supabase'
import { NumberTicker } from '@/components/ui/number-ticker'
import { TRAFEGO_METAS, RECEITA_METAS, META_ATIVA, LIMITES, CPL_MEDIO } from '../../lib/config'

type Etapa = { nome: string; valor: number; custo: number | null; custoLabel: string | null; taxa: number | null; diag: { cor: string; status: string; emoji: string } | null; baseline: number | null }
type Decisao = { metrica: string; valor: number; cor: string; status: string; emoji: string; acoes: string[]; baseline: number; unidade: string }
type MetasOps = { faturamento: number; vendas: number; reunioes: number; agendamentos: number; leads: number; leadsDia: number; agendDia: number; reunioesDia: number; vendasDia: number }
type DadoDiario = { data: string; investimento: number; leads: number; agendamentos: number; reunioes_realizadas: number; fechamentos: number; faturamento: number }
type InputRow = { id: string; email: string; nome: string; data: string; investimento: number; leads: number; agendamentos: number; reunioes_realizadas: number; reunioes_qualificadas: number; fechamentos: number; faturamento: number; observacoes: string }
type ConsolidadoDia = { data: string; investimento: number; leads: number; agendamentos: number; reunioes_realizadas: number; reunioes_qualificadas: number; fechamentos: number; faturamento: number; pessoas: string[] }
type PorPessoa = { nome: string; email: string; dias: number; investimento: number; leads: number; agendamentos: number; reunioes_realizadas: number; fechamentos: number; faturamento: number }

function f$(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: v < 100 ? 2 : 0 }) }
function pct(v: number) { return v.toFixed(1) + '%' }
function fmtData(d: string) { const p = d.split('-'); return p[2] + '/' + p[1] }

const PERIODOS = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7d', label: '7 dias' },
  { key: '14d', label: '14 dias' },
  { key: '30d', label: '30 dias' },
  { key: 'mes', label: 'Mes atual' },
  { key: 'custom', label: 'Personalizado' },
]

export default function TrafegoBI() {
  const [periodo, setPeriodo] = useState('mes')
  const [customDe, setCustomDe] = useState('')
  const [customAte, setCustomAte] = useState('')
  const [etapas, setEtapas] = useState<Etapa[]>([])
  const [metricas, setMetricas] = useState<Record<string, number>>({})
  const [diario, setDiario] = useState<Record<string, number>>({})
  const [gargalo, setGargalo] = useState<{ nome: string; taxa: number; status: string; acoes: string[] } | null>(null)
  const [alertas, setAlertas] = useState<string[]>([])
  const [decisoes, setDecisoes] = useState<Decisao[]>([])
  const [metasOps, setMetasOps] = useState<{ minima: MetasOps; normal: MetasOps; super: MetasOps } | null>(null)
  const [resumo, setResumo] = useState('')
  const [dadosDiarios, setDadosDiarios] = useState<DadoDiario[]>([])
  const [periodoInfo, setPeriodoInfo] = useState<{ de: string; ate: string; dias: number }>({ de: '', ate: '', dias: 0 })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showDados, setShowDados] = useState(false)
  const [metaTab, setMetaTab] = useState<'minima' | 'normal' | 'super'>('normal')
  const [dadosForm, setDadosForm] = useState({ data: new Date().toISOString().split('T')[0], investimento: '', leads: '', agendamentos: '', reunioes_realizadas: '', reunioes_qualificadas: '', fechamentos: '', faturamento: '' })
  const [saving, setSaving] = useState(false)
  const [funil, setFunil] = useState<Record<string, number> | null>(null)
  // Aba Diário
  const [abaAtiva, setAbaAtiva] = useState<'bi' | 'diario'>('bi')
  const [inputRows, setInputRows] = useState<InputRow[]>([])
  const [consolidado, setConsolidado] = useState<ConsolidadoDia[]>([])
  const [porPessoa, setPorPessoa] = useState<PorPessoa[]>([])
  const [filtroPessoa, setFiltroPessoa] = useState('todos')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [inputForm, setInputForm] = useState({ data: new Date().toISOString().split('T')[0], investimento: '', leads: '', agendamentos: '', reunioes_realizadas: '', reunioes_qualificadas: '', fechamentos: '', faturamento: '', observacoes: '' })
  const [showInput, setShowInput] = useState(false)
  const [savingInput, setSavingInput] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let url = '/api/trafego/funil?periodo=' + periodo
      if (periodo === 'custom' && customDe && customAte) url = '/api/trafego/funil?de=' + customDe + '&ate=' + customAte
      const d = await (await fetch(url)).json()
      setEtapas(d.etapas || [])
      setMetricas(d.metricas || {})
      setDiario(d.diario || {})
      setGargalo(d.gargalo || null)
      setAlertas(d.alertas || [])
      setDecisoes(d.decisoes || [])
      setMetasOps(d.metasOps || null)
      setResumo(d.resumo || '')
      setFunil(d.funil || null)
      setDadosDiarios(d.dadosDiarios || [])
      setPeriodoInfo(d.periodo || { de: '', ate: '', dias: 0 })
    } catch { /* */ }
    setLoading(false)
  }, [periodo, customDe, customAte])

  const loadDiario = useCallback(async () => {
    const p = filtroPessoa !== 'todos' ? `&pessoa=${encodeURIComponent(filtroPessoa)}` : ''
    try {
      const d = await (await fetch(`/api/input-diario?de=${periodoInfo.de || ''}&ate=${periodoInfo.ate || ''}${p}`)).json()
      setInputRows(d.registros || [])
      setConsolidado(d.consolidado || [])
      setPorPessoa(d.porPessoa || [])
    } catch { /* */ }
  }, [periodoInfo.de, periodoInfo.ate, filtroPessoa])

  useEffect(() => { load(); const iv = setInterval(load, 120000); return () => clearInterval(iv) }, [load])
  useEffect(() => { if (abaAtiva === 'diario') loadDiario() }, [abaAtiva, loadDiario])
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user?.email) {
        setUserEmail(session.user.email)
        const { data: u } = await supabase.from('usuarios_internos').select('roles, role, nome').eq('email', session.user.email).single()
        const roles: string[] = (u?.roles && Array.isArray(u.roles) && u.roles.length > 0) ? u.roles : [u?.role || '']
        setIsAdmin(roles.includes('admin'))
        setUserName(u?.nome || '')
      }
    })()
  }, [])

  const salvarDados = async () => {
    setSavingInput(true)
    await fetch('/api/input-diario', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      email: userEmail, nome: userName, data: inputForm.data,
      investimento: Number(inputForm.investimento), leads: Number(inputForm.leads),
      agendamentos: Number(inputForm.agendamentos), reunioes_realizadas: Number(inputForm.reunioes_realizadas),
      reunioes_qualificadas: Number(inputForm.reunioes_qualificadas), fechamentos: Number(inputForm.fechamentos),
      faturamento: Number(inputForm.faturamento), observacoes: inputForm.observacoes,
    }) })
    setSavingInput(false); setShowInput(false)
    setInputForm({ data: new Date().toISOString().split('T')[0], investimento: '', leads: '', agendamentos: '', reunioes_realizadas: '', reunioes_qualificadas: '', fechamentos: '', faturamento: '', observacoes: '' })
    loadDiario(); load()
  }

  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
  const maxVal = Math.max(...etapas.filter(e => e.nome !== 'Faturamento').map(e => e.valor), 1)
  const metaSel = metasOps ? metasOps[metaTab] : null
  const maxChart = Math.max(...dadosDiarios.map(d => d.leads || 0), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', overflowX: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '16px 16px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, maxWidth: '100%' }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>BI Comercial — Funil de Vendas</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Guilherme · Meta Ads sincronizado automático + input manual</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowInput(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>+ Preencher meu dia</button>
            <button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '7px 10px', cursor: 'pointer' }}>🔄</button>
          </div>
        </div>

        {/* Painel Meta Ads — integração com o gerenciador de anúncios */}
        <MetaAdsPanel onSync={load} />

        {/* Card metas de tráfego — vindas do config (alinhadas com funil alvo) */}
        <div style={{ background: '#111827', border: '1px solid #3b82f630', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#60a5fa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            📣 Metas de marketing — derivadas do funil {META_ATIVA.toUpperCase()} (R$ {RECEITA_METAS[META_ATIVA].toLocaleString('pt-BR')}/mês)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>Leads a entregar/mês</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{TRAFEGO_METAS.leads_mes}</div>
              <div style={{ fontSize: 9, color: '#f59e0b' }}>{TRAFEGO_METAS.leads_dia}/dia · {TRAFEGO_METAS.leads_semana}/semana</div>
            </div>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>CPL alvo</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#4ade80' }}>R$ {CPL_MEDIO.toFixed(2)}</div>
              <div style={{ fontSize: 9, color: '#6b7280' }}>máx: R$ {TRAFEGO_METAS.cpl_max.toFixed(2)}</div>
            </div>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>Investimento mês</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>R$ {TRAFEGO_METAS.investimento_mensal.toLocaleString('pt-BR')}</div>
              <div style={{ fontSize: 9, color: '#6b7280' }}>R$ {TRAFEGO_METAS.investimento_dia}/dia</div>
            </div>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>CAC máximo</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>R$ {LIMITES.cac_max}</div>
              <div style={{ fontSize: 9, color: '#4ade80' }}>alvo: R$ {TRAFEGO_METAS.investimento_mensal && TRAFEGO_METAS.leads_mes ? Math.round(TRAFEGO_METAS.investimento_mensal / (TRAFEGO_METAS.leads_mes / 879 * 45)) : 209} ✓</div>
            </div>
          </div>
        </div>

        {/* ABAS: BI | Diário */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {([['bi', '📊 BI Comercial'], ['diario', '📋 Planilha Diaria']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setAbaAtiva(k)} style={{ background: abaAtiva === k ? '#f59e0b15' : '#13131f', border: `1px solid ${abaAtiva === k ? '#f59e0b' : '#252535'}`, color: abaAtiva === k ? '#f59e0b' : '#6b7280', borderRadius: '8px 8px 0 0', padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: abaAtiva === k ? 700 : 400, borderBottom: abaAtiva === k ? '2px solid #f59e0b' : '1px solid #252535' }}>{l}</button>
          ))}
        </div>

        {/* =========== ABA DIÁRIO =========== */}
        {abaAtiva === 'diario' && (
          <div>
            {/* Filtro por pessoa */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center' }}>
              <select value={filtroPessoa} onChange={e => setFiltroPessoa(e.target.value)} style={{ background: '#13131f', border: '1px solid #252535', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="todos">Todos</option>
                <option value="contato.cardosoeo@gmail.com">Cardoso</option>
                <option value="guilherme.excalibur@gmail.com">Guilherme</option>
                <option value="trindade.excalibur@gmail.com">Trindade</option>
              </select>
              <span style={{ fontSize: 12, color: '#4b5563' }}>{consolidado.length} dia{consolidado.length !== 1 ? 's' : ''} · {inputRows.length} registro{inputRows.length !== 1 ? 's' : ''}</span>
              <button onClick={loadDiario} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>🔄</button>
            </div>

            {/* Rendimento por pessoa (CEO vê) */}
            {isAdmin && porPessoa.length > 0 && filtroPessoa === 'todos' && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <h4 style={{ fontSize: 11, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Rendimento por Pessoa</h4>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${porPessoa.length}, 1fr)`, gap: 10 }}>
                  {porPessoa.map(p => (
                    <div key={p.email} style={{ background: '#09090f', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{p.nome}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {[
                          { l: 'Dias preenchidos', v: String(p.dias), c: '#6b7280' },
                          { l: 'Leads', v: String(p.leads), c: '#3b82f6' },
                          { l: 'Agendamentos', v: String(p.agendamentos), c: '#f59e0b' },
                          { l: 'Reunioes', v: String(p.reunioes_realizadas), c: '#a855f7' },
                          { l: 'Fechamentos', v: String(p.fechamentos), c: '#22c55e' },
                          { l: 'Faturamento', v: f$(p.faturamento), c: '#f59e0b' },
                        ].map(m => (
                          <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                            <span style={{ fontSize: 10, color: '#6b7280' }}>{m.l}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: m.c }}>{m.v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabela dia a dia */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>{['Data', 'Quem', 'Invest', 'Leads', 'Agend', 'Reunioes', 'Fech', 'Fat', 'Obs'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '10px 8px', textAlign: 'left', borderBottom: '1px solid #252535', textTransform: 'uppercase' }}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {inputRows.length === 0 ? (
                    <tr><td colSpan={9} style={{ padding: 30, textAlign: 'center', color: '#374151', fontSize: 13 }}>Nenhum registro ainda. Clique em "+ Preencher meu dia" para comecar.</td></tr>
                  ) : inputRows.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                      <td style={{ padding: '8px', color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' }}>{fmtData(r.data)}</td>
                      <td style={{ padding: '8px' }}><span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{r.nome}</span></td>
                      <td style={{ padding: '8px', color: '#e5e7eb', fontSize: 12 }}>{f$(Number(r.investimento))}</td>
                      <td style={{ padding: '8px', color: '#3b82f6', fontSize: 12, fontWeight: 700 }}>{r.leads}</td>
                      <td style={{ padding: '8px', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{r.agendamentos}</td>
                      <td style={{ padding: '8px', color: '#a855f7', fontSize: 12, fontWeight: 700 }}>{r.reunioes_realizadas}</td>
                      <td style={{ padding: '8px', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>{r.fechamentos}</td>
                      <td style={{ padding: '8px', color: '#f59e0b', fontSize: 12 }}>{f$(Number(r.faturamento))}</td>
                      <td style={{ padding: '8px', color: '#4b5563', fontSize: 10, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.observacoes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totais */}
                {inputRows.length > 0 && (
                  <tfoot>
                    <tr style={{ borderTop: '2px solid #252535', background: '#09090f' }}>
                      <td style={{ padding: '10px 8px', color: '#fff', fontSize: 12, fontWeight: 700 }} colSpan={2}>TOTAL</td>
                      <td style={{ padding: '10px 8px', color: '#fff', fontSize: 12, fontWeight: 700 }}>{f$(inputRows.reduce((s, r) => s + Number(r.investimento || 0), 0))}</td>
                      <td style={{ padding: '10px 8px', color: '#3b82f6', fontSize: 12, fontWeight: 700 }}>{inputRows.reduce((s, r) => s + (r.leads || 0), 0)}</td>
                      <td style={{ padding: '10px 8px', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{inputRows.reduce((s, r) => s + (r.agendamentos || 0), 0)}</td>
                      <td style={{ padding: '10px 8px', color: '#a855f7', fontSize: 12, fontWeight: 700 }}>{inputRows.reduce((s, r) => s + (r.reunioes_realizadas || 0), 0)}</td>
                      <td style={{ padding: '10px 8px', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>{inputRows.reduce((s, r) => s + (r.fechamentos || 0), 0)}</td>
                      <td style={{ padding: '10px 8px', color: '#f59e0b', fontSize: 12, fontWeight: 700 }}>{f$(inputRows.reduce((s, r) => s + Number(r.faturamento || 0), 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* =========== ABA BI (tudo que já existia) =========== */}
        {abaAtiva === 'bi' && <>

        {/* BARRA DE PERÍODO (estilo Gerenciador de Anúncios) */}
        <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {PERIODOS.map(p => (
            <button key={p.key} onClick={() => setPeriodo(p.key)}
              style={{ background: periodo === p.key ? '#f59e0b20' : 'transparent', border: `1px solid ${periodo === p.key ? '#f59e0b' : '#252535'}`, color: periodo === p.key ? '#f59e0b' : '#6b7280', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: periodo === p.key ? 700 : 400, transition: 'all 0.15s' }}>
              {p.label}
            </button>
          ))}
          {periodo === 'custom' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
              <input type="date" value={customDe} onChange={e => setCustomDe(e.target.value)} style={{ background: '#1a1a2e', border: '1px solid #252535', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, outline: 'none' }} />
              <span style={{ color: '#4b5563', fontSize: 11 }}>ate</span>
              <input type="date" value={customAte} onChange={e => setCustomAte(e.target.value)} style={{ background: '#1a1a2e', border: '1px solid #252535', borderRadius: 6, padding: '4px 8px', color: '#fff', fontSize: 12, outline: 'none' }} />
            </div>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {periodoInfo.de && <span style={{ fontSize: 11, color: '#4b5563' }}>{fmtData(periodoInfo.de)} — {fmtData(periodoInfo.ate)}</span>}
            <span style={{ fontSize: 11, color: '#6b7280', background: '#1a1a2e', padding: '2px 8px', borderRadius: 4 }}>{periodoInfo.dias} dia{periodoInfo.dias !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando...</div> : !funil ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Sem dados para este periodo</div> : (
          <>
            {/* ALERTAS */}
            {alertas.length > 0 && (
              <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: 10, padding: 14, marginBottom: 14 }}>
                {alertas.map((a, i) => <div key={i} style={{ fontSize: 12, color: '#ef4444', padding: '3px 0' }}>⚠️ {a}</div>)}
              </div>
            )}

            {/* FUNIL HORIZONTAL */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funil Comercial</h3>
              <div style={{ display: 'flex', alignItems: 'stretch', gap: 6 }}>
                {etapas.map((e, i) => {
                  const isLast = e.nome === 'Faturamento'
                  return (
                    <div key={e.nome} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <div style={{ flex: 1, background: e.diag ? `${e.diag.cor}10` : '#1a1a2e', border: `1px solid ${e.diag?.cor || '#252535'}30`, borderRadius: 10, padding: '12px 8px', textAlign: 'center' }}>
                        {e.diag && <div style={{ fontSize: 12, marginBottom: 2 }}>{e.diag.emoji}</div>}
                        <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>{e.nome}</div>
                        <div style={{ margin: '4px 0' }}>
                          <NumberTicker
                            value={Number(e.valor) || 0}
                            delay={i * 0.15}
                            prefix={isLast ? 'R$ ' : ''}
                            style={{ fontSize: 18, fontWeight: 800, color: isLast ? '#f59e0b' : e.diag?.cor || '#fff' }}
                          />
                        </div>
                        {e.taxa != null && <div style={{ fontSize: 11, color: e.diag?.cor || '#6b7280', fontWeight: 600 }}>{pct(e.taxa)}</div>}
                        {e.custo != null && <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>{e.custoLabel}: {f$(e.custo)}</div>}
                        {e.baseline != null && <div style={{ fontSize: 8, color: '#374151', marginTop: 2 }}>baseline: {e.baseline < 100 ? (e.baseline + (e.nome === 'Leads' ? '' : '%')) : f$(e.baseline)}</div>}
                      </div>
                      {i < etapas.length - 1 && <span style={{ color: '#374151', fontSize: 16, margin: '0 2px', flexShrink: 0 }}>→</span>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* MÉTRICAS 3 COLUNAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontSize: 10, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Conversoes</h4>
                {[{ l: 'Lead → Agend', v: metricas.txAgend }, { l: 'Agend → Reuniao', v: metricas.txComp }, { l: 'Reuniao → Qualif', v: metricas.txQual }, { l: 'Qualif → Venda', v: metricas.txConv }].map(m =>
                  <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>{m.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{m.v?.toFixed(1)}%</span></div>
                )}
              </div>
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontSize: 10, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Financeiro</h4>
                {[
                  { l: 'CPL', v: metricas.cpl, c: metricas.cpl <= 12 ? '#22c55e' : metricas.cpl <= 15 ? '#f59e0b' : '#ef4444' },
                  { l: 'Custo/agendamento', v: metricas.custoAgend, c: '#fff' },
                  { l: 'Custo/reuniao', v: metricas.custoReuniao, c: '#fff' },
                  { l: 'CAC', v: metricas.cac, c: metricas.cac <= 200 ? '#22c55e' : metricas.cac <= 300 ? '#f59e0b' : '#ef4444' },
                  { l: 'Receita/lead', v: metricas.receitaLead, c: '#3b82f6' },
                  { l: 'Receita/reuniao', v: metricas.receitaReuniao, c: '#3b82f6' },
                  { l: 'ROAS', v: metricas.roas, c: '#22c55e', x: true },
                ].map(m => <div key={m.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>{m.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: m.c }}>{m.x ? (m.v?.toFixed(1) + 'x') : f$(m.v || 0)}</span></div>)}
              </div>
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: 14 }}>
                <h4 style={{ fontSize: 10, color: '#6b7280', marginBottom: 10, textTransform: 'uppercase' }}>Operacional Diario</h4>
                {[{ l: 'Leads/dia', v: diario.leadsDia, m: 34 }, { l: 'Agend/dia', v: diario.agendDia, m: 12 }, { l: 'Reunioes/dia', v: diario.reunioesDia, m: 10 }, { l: 'Vendas/dia', v: diario.vendasDia, m: 2 }].map(mm => {
                  const ok = (mm.v || 0) >= mm.m
                  return <div key={mm.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #1a1a2e' }}><span style={{ fontSize: 11, color: '#9ca3af' }}>{mm.l}</span><span style={{ fontSize: 12, fontWeight: 700, color: ok ? '#22c55e' : '#ef4444' }}>{mm.v?.toFixed(1)} <span style={{ fontSize: 9, color: '#4b5563', fontWeight: 400 }}>meta {mm.m}</span></span></div>
                })}
              </div>
            </div>

            {/* GRÁFICO DIÁRIO */}
            {dadosDiarios.length > 1 && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 14 }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase' }}>Leads por Dia</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 100 }}>
                  {dadosDiarios.map(d => {
                    const h = Math.max(4, (d.leads / maxChart) * 88)
                    return (
                      <div key={d.data} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }} title={`${fmtData(d.data)}: ${d.leads} leads, ${d.agendamentos} agend, ${d.fechamentos} fech`}>
                        <span style={{ fontSize: 8, color: '#6b7280' }}>{d.leads}</span>
                        <div style={{ width: '100%', height: h, background: d.leads >= 7 ? '#22c55e' : d.leads >= 5 ? '#f59e0b' : '#ef4444', borderRadius: '3px 3px 0 0', transition: 'height 0.3s' }} />
                        <span style={{ fontSize: 7, color: '#4b5563' }}>{fmtData(d.data).split('/')[0]}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* DECISÕES + GARGALO */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 14 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 14, textTransform: 'uppercase' }}>Diagnostico + Acoes</h3>
              {gargalo && (
                <div style={{ background: '#ef444415', border: '1px solid #ef444430', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>🚨 GARGALO: {gargalo.nome} ({gargalo.taxa.toFixed(1)}%)</div>
                  {(gargalo.acoes || []).map((a, i) => <div key={i} style={{ fontSize: 11, color: '#e5e7eb', paddingLeft: 16, padding: '2px 0 2px 16px' }}>→ {a}</div>)}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8 }}>
                {decisoes.map(d => (
                  <div key={d.metrica} style={{ background: `${d.cor}08`, border: `1px solid ${d.cor}25`, borderRadius: 8, padding: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}><span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase' }}>{d.metrica}</span><span>{d.emoji}</span></div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: d.cor }}>{d.unidade === 'R$' ? f$(d.valor) : pct(d.valor)}</div>
                    <div style={{ fontSize: 8, color: '#4b5563', marginBottom: 6 }}>baseline: {d.unidade === 'R$' ? f$(d.baseline) : pct(d.baseline)}</div>
                    {d.acoes.slice(0, 2).map((a, i) => <div key={i} style={{ fontSize: 9, color: '#9ca3af', padding: '1px 0' }}>→ {a}</div>)}
                  </div>
                ))}
              </div>
            </div>

            {/* METAS 3 TIERS */}
            {metasOps && (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', margin: 0, textTransform: 'uppercase' }}>Metas Operacionais</h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {([['minima', '🔻 Minima R$74k', '#ef4444'], ['normal', '⚖️ Normal R$90k', '#f59e0b'], ['super', '🚀 Super R$106k', '#22c55e']] as const).map(([k, l, c]) => (
                      <button key={k} onClick={() => setMetaTab(k)} style={{ background: metaTab === k ? `${c}20` : 'transparent', border: `1px solid ${metaTab === k ? c : '#252535'}`, color: metaTab === k ? c : '#6b7280', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontWeight: metaTab === k ? 700 : 400 }}>{l}</button>
                    ))}
                  </div>
                </div>
                {metaSel && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                      {[
                        { l: 'Leads', atual: funil?.leads || 0, meta: metaSel.leads, dia: metaSel.leadsDia },
                        { l: 'Agendamentos', atual: funil?.agendamentos || 0, meta: metaSel.agendamentos, dia: metaSel.agendDia },
                        { l: 'Reunioes', atual: funil?.reunioes_realizadas || 0, meta: metaSel.reunioes, dia: metaSel.reunioesDia },
                        { l: 'Vendas', atual: funil?.fechamentos || 0, meta: metaSel.vendas, dia: metaSel.vendasDia },
                      ].map(m => {
                        const p = m.meta > 0 ? Math.min(Math.round((m.atual / m.meta) * 100), 100) : 0
                        const cor = p >= 80 ? '#22c55e' : p >= 50 ? '#f59e0b' : '#ef4444'
                        return (
                          <div key={m.l} style={{ background: '#09090f', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 6, textTransform: 'uppercase' }}>{m.l}</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}><span style={{ fontSize: 22, fontWeight: 800, color: cor }}>{m.atual}</span><span style={{ fontSize: 12, color: '#4b5563' }}>/ {m.meta}</span></div>
                            <div style={{ height: 6, background: '#252535', borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}><div style={{ height: '100%', width: `${p}%`, background: cor, borderRadius: 3 }} /></div>
                            <div style={{ fontSize: 9, color: '#4b5563' }}>{p}% · meta diaria: {m.dia}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginTop: 12, textAlign: 'center' }}>Meta: {f$(metaSel.faturamento)} · Atual: {f$(funil?.faturamento || 0)}</div>
                  </>
                )}
              </div>
            )}

            {/* RESUMO EXECUTIVO */}
            {resumo && (
              <div style={{ background: '#13131f', border: '1px solid #f59e0b30', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 11, fontWeight: 600, color: '#f59e0b', marginBottom: 10, textTransform: 'uppercase' }}>Resumo Executivo</h3>
                <p style={{ fontSize: 13, color: '#e5e7eb', lineHeight: 1.6, margin: 0 }}>{resumo}</p>
              </div>
            )}

          </>
        )}

        </>}

        {/* MODAL PREENCHER MEU DIA (compartilhado entre abas) */}
        {showInput && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setShowInput(false)}>
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 560 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Preencher meu dia</h3>
              <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>Preenchendo como <span style={{ color: '#f59e0b', fontWeight: 600 }}>{userName}</span></p>
              <div style={{ marginBottom: 12 }}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data</label><input type="date" value={inputForm.data} onChange={e => setInputForm({ ...inputForm, data: e.target.value })} style={inp} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ k: 'investimento', l: 'Investimento (R$)' }, { k: 'leads', l: 'Leads gerados' }, { k: 'agendamentos', l: 'Agendamentos' }, { k: 'reunioes_realizadas', l: 'Reunioes realizadas' }, { k: 'reunioes_qualificadas', l: 'Qualificadas' }, { k: 'fechamentos', l: 'Fechamentos' }, { k: 'faturamento', l: 'Faturamento (R$)' }].map(f => (
                  <div key={f.k}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>{f.l}</label><input type="number" value={(inputForm as Record<string, string>)[f.k]} onChange={e => setInputForm({ ...inputForm, [f.k]: e.target.value })} style={inp} placeholder="0" /></div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacoes (opcional)</label><input value={inputForm.observacoes} onChange={e => setInputForm({ ...inputForm, observacoes: e.target.value })} style={inp} placeholder="Notas do dia..." /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={salvarDados} disabled={savingInput} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: savingInput ? 0.5 : 1 }}>{savingInput ? 'Salvando...' : 'Salvar'}</button>
                <button onClick={() => setShowInput(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
