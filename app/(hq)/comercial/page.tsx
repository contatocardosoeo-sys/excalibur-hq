'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'
import AcaoHoje from '../../components/AcaoHoje'
import ComissoesPanel from '../../components/ComissoesPanel'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { useDispararEvento } from '../../hooks/useDispararEvento'
import { NumberTicker } from '@/components/ui/number-ticker'
import { COMERCIAL_METAS, RECEITA_METAS, META_ATIVA } from '../../lib/config'

type PipeItem = { id: string; lead_id: string; nome_clinica: string; plano: string; mrr_proposto: number; status: string; data_reuniao: string; data_fechamento: string; observacoes: string; created_at: string }
type MetaBar = { atual: number; meta: number }
type Metas = { reunioes: MetaBar; fechamentos: MetaBar; mrr: MetaBar; comissao_pct: number; comissao_valor: number } | null
type LogEntry = { id: string; evento: string; numero: string; nome: string; etiqueta: string; usuario_wa: string; acao_executada: string; processado: boolean; created_at: string }

const COLS = [
  { key: 'reuniao_agendada', label: '📅 Reuniao Agendada', cor: '#3b82f6' },
  { key: 'proposta_enviada', label: '💼 Proposta Enviada', cor: '#f59e0b' },
  { key: 'fechado', label: '✅ Fechado', cor: '#22c55e' },
  { key: 'perdido', label: '❌ Perdido', cor: '#ef4444' },
]
const ORDER = ['reuniao_agendada', 'proposta_enviada', 'fechado', 'perdido']
const PLANOS = [
  { nome: 'Completo (sem fidelidade)', mrr: 3500 },
  { nome: 'Completo (90 dias garantia)', mrr: 3000 },
  { nome: 'Apenas Financeira', mrr: 1000 },
  { nome: 'Apenas Marketing', mrr: 1500 },
]

function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function ComercialPage() {
  const { toast } = useToast()
  const { disparar } = useDispararEvento()
  const [pipeline, setPipeline] = useState<PipeItem[]>([])
  const [kpis, setKpis] = useState({ reunioesSemana: 0, propostasEnviadas: 0, fechamentos: 0, mrrMes: 0 })
  const [metas, setMetas] = useState<Metas>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [ativarModal, setAtivarModal] = useState<PipeItem | null>(null)
  const [ativarEmail, setAtivarEmail] = useState('')
  const [ativarData, setAtivarData] = useState(new Date().toISOString().split('T')[0])
  const [form, setForm] = useState({ nome_clinica: '', plano: 'Completo (90 dias garantia)', mrr_proposto: '3000', data_reuniao: '', observacoes: '', origem: 'outbound' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  // Aba
  const [aba, setAba] = useState<'pipeline' | 'whatsapp'>('pipeline')
  // CRM WhatsApp
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [waKpis, setWaKpis] = useState({ webhooksHoje: 0, leadsAtualizados: 0, etapasMovidas: 0, usersAtivos: 0 })
  const [waTab, setWaTab] = useState<'log' | 'closer'>('log')
  const [closerWA, setCloserWA] = useState<Array<Record<string, unknown>>>([])
  const [waLoading, setWaLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/comercial/pipeline')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setPipeline(d.pipeline || [])
      setKpis(d.kpis || { reunioesSemana: 0, propostasEnviadas: 0, fechamentos: 0, mrrMes: 0 })
      setMetas(d.metas || null)
    } catch (err) {
      console.error('Erro ao carregar pipeline comercial:', err)
      toast('error', 'Erro ao carregar pipeline. Tente novamente.')
    }
    setLoading(false)
  }, [])
  useEffect(() => { load(); const iv = setInterval(load, 120000); return () => clearInterval(iv) }, [load])

  const loadWA = useCallback(async () => {
    setWaLoading(true)
    const hoje = new Date().toISOString().split('T')[0]
    const [{ data: logData }, { data: closerData }] = await Promise.all([
      supabase.from('prospecta_webhooks_log').select('*').order('created_at', { ascending: false }).limit(100),
      supabase.from('pipeline_closer').select('id, nome_clinica, status, etiqueta_wa, ultimo_contato_wa, total_disparos_wa, usuario_wa').gt('total_disparos_wa', 0).order('ultimo_contato_wa', { ascending: false }),
    ])
    const all = logData || []
    setLogs(all as LogEntry[])
    setCloserWA(closerData || [])
    const hojeItems = all.filter(l => l.created_at?.startsWith(hoje))
    setWaKpis({ webhooksHoje: hojeItems.length, leadsAtualizados: hojeItems.filter(l => l.processado).length, etapasMovidas: hojeItems.filter(l => l.acao_executada?.includes('etapa')).length, usersAtivos: new Set(hojeItems.map(l => l.usuario_wa).filter(Boolean)).size })
    setWaLoading(false)
  }, [])
  useEffect(() => { if (aba === 'whatsapp') loadWA() }, [aba, loadWA])

  function tempo(d: string) { if (!d) return '-'; const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000); if (min < 60) return min + 'min'; const h = Math.floor(min / 60); return h < 24 ? h + 'h' : Math.floor(h / 24) + 'd' }

  const criar = async () => {
    if (!form.nome_clinica) return; setSaving(true)
    await fetch('/api/comercial/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, mrr_proposto: Number(form.mrr_proposto) || 0, observacoes: form.observacoes + (form.origem !== 'outbound' ? ` [Origem: ${form.origem}]` : '') }) })
    setForm({ nome_clinica: '', plano: 'Completo (90 dias garantia)', mrr_proposto: '3000', data_reuniao: '', observacoes: '', origem: 'outbound' }); setModal(false); setSaving(false); load()
  }

  const mover = async (id: string, dir: 'next' | string) => {
    const item = pipeline.find(p => p.id === id); if (!item) return
    let s: string
    if (dir === 'next') { const i = ORDER.indexOf(item.status); s = ORDER[Math.min(i + 1, 2)] } else s = dir
    const updates: Record<string, unknown> = { status: s }
    if (s === 'fechado') updates.data_fechamento = new Date().toISOString().split('T')[0]
    await fetch('/api/comercial/pipeline', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) })
    if (s === 'fechado' && item.status !== 'fechado') {
      disparar({
        tipo: 'venda_fechada',
        titulo: 'VENDA FECHADA!',
        mensagem: `${item.nome_clinica} entrou no time!`,
        usuario_nome: 'Guilherme',
        valor: Number(item.mrr_proposto) || 0,
      })
    }
    load()
  }

  const ativar = async () => {
    if (!ativarModal) return; setSaving(true)
    const d = await (await fetch('/api/comercial/ativar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pipeline_id: ativarModal.id, email: ativarEmail, data_inicio: ativarData }) })).json()
    setSaving(false); setAtivarModal(null)
    if (d.success) { setMsg(`✅ Clinica ${ativarModal.nome_clinica} ativada! Medina foi notificado.`); load() } else setMsg('Erro: ' + (d.error || 'falha'))
    setTimeout(() => setMsg(''), 5000)
  }

  const onPlanoChange = (plano: string) => {
    const p = PLANOS.find(x => x.nome === plano)
    setForm({ ...form, plano, mrr_proposto: String(p?.mrr || 1500) })
  }

  const inp: React.CSSProperties = { width: '100%', background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }
  const pctBar = (atual: number, meta: number, cor: string) => {
    const pct = meta > 0 ? Math.min(Math.round((atual / meta) * 100), 100) : 0
    return (<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ flex: 1, height: 8, background: '#252535', borderRadius: 4, overflow: 'hidden' }}><div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4 }} /></div><span style={{ fontSize: 12, color: '#fff', fontWeight: 700, minWidth: 40, textAlign: 'right' }}>{typeof atual === 'number' && atual > 100 ? fmt(atual) : atual}/{typeof meta === 'number' && meta > 100 ? fmt(meta) : meta}</span><span style={{ fontSize: 11, color: pct >= 100 ? '#22c55e' : '#6b7280', minWidth: 35 }}>{pct}%</span></div>)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex', overflowX: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '16px 16px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, maxWidth: '100%' }}>
        {/* Card de acao do dia (imperativo) */}
        <AcaoHoje role="closer" />

        {/* Comissões do closer */}
        <div style={{ marginBottom: 14 }}>
          <ComissoesPanel visao="closer" />
        </div>

        {/* Card funil alvo — vindo do config (fonte única) */}
        <div style={{ background: '#111827', border: '1px solid #22c55e30', borderRadius: 12, padding: '14px 18px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#4ade80', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              💰 Meta {META_ATIVA} — R$ {RECEITA_METAS[META_ATIVA].toLocaleString('pt-BR')} MRR
            </span>
            <div style={{ display: 'flex', gap: 14, fontSize: 10, color: '#6b7280' }}>
              <span>Fechar: <span style={{ color: '#fff', fontWeight: 700 }}>{COMERCIAL_METAS.fechamentos_mes} vendas</span></span>
              <span>Ticket: <span style={{ color: '#fff' }}>R$ 2.000</span></span>
              <span>Comissão (10%): <span style={{ color: '#4ade80', fontWeight: 700 }}>R$ {(RECEITA_METAS[META_ATIVA] * COMERCIAL_METAS.comissao_pct).toLocaleString('pt-BR')}</span></span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>Reuniões necessárias</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{COMERCIAL_METAS.reunioes_mes}<span style={{ fontSize: 9, color: '#6b7280' }}>/mês</span></div>
              <div style={{ fontSize: 9, color: '#f59e0b' }}>{COMERCIAL_METAS.reunioes_dia}/dia · {COMERCIAL_METAS.reunioes_semana}/semana</div>
            </div>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>Fechamentos</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>{COMERCIAL_METAS.fechamentos_mes}<span style={{ fontSize: 9, color: '#6b7280' }}>/mês</span></div>
              <div style={{ fontSize: 9, color: '#f59e0b' }}>{COMERCIAL_METAS.fechamentos_dia}/dia · {COMERCIAL_METAS.fechamentos_semana}/semana</div>
            </div>
            <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>Taxa de fechamento meta</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>30%</div>
              <div style={{ fontSize: 9, color: '#6b7280' }}>real Fev/Mar: 32.5%</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div><h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Comercial — Pipeline de Fechamento</h1><p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Gestao de propostas e fechamentos</p></div>
          <div style={{ display: 'flex', gap: 8 }}><button onClick={() => setModal(true)} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>+ Nova Proposta</button><button onClick={load} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>🔄</button></div>
        </div>

        {msg && <div style={{ background: msg.includes('✅') ? '#22c55e20' : '#ef444420', border: `1px solid ${msg.includes('✅') ? '#22c55e' : '#ef4444'}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: msg.includes('✅') ? '#22c55e' : '#ef4444', fontSize: 13 }}>{msg}</div>}

        {/* ABAS */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {([['pipeline', '💼 Pipeline'], ['whatsapp', '📱 WhatsApp CRM']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setAba(k)} style={{ background: aba === k ? '#f59e0b15' : '#13131f', border: `1px solid ${aba === k ? '#f59e0b' : '#252535'}`, color: aba === k ? '#f59e0b' : '#6b7280', borderRadius: '8px 8px 0 0', padding: '10px 20px', cursor: 'pointer', fontSize: 13, fontWeight: aba === k ? 700 : 400, borderBottom: aba === k ? '2px solid #f59e0b' : '1px solid #252535' }}>{l}</button>
          ))}
        </div>

        {aba === 'pipeline' && <>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'Reunioes (semana)', v: kpis.reunioesSemana, c: '#3b82f6', prefix: '' },
            { l: 'Propostas enviadas', v: kpis.propostasEnviadas, c: '#f59e0b', prefix: '' },
            { l: 'Fechamentos', v: kpis.fechamentos, c: '#22c55e', prefix: '' },
            { l: 'MRR gerado', v: kpis.mrrMes, c: '#a855f7', prefix: 'R$ ' },
          ].map(k => (
            <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
              <NumberTicker value={k.v} prefix={k.prefix} style={{ fontSize: 26, fontWeight: 800, color: k.c }} />
            </div>
          ))}
        </div>

        {/* Metas + Comissao */}
        {metas && (
          <div style={{ background: '#13131f', border: '1px solid #f59e0b30', borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>Minha Performance — Abril/2026</h3>
              <div style={{ background: '#f59e0b15', border: '1px solid #f59e0b40', borderRadius: 8, padding: '6px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: '#f59e0b' }}>Comissao estimada</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{fmt(metas.comissao_valor)}</div>
                <div style={{ fontSize: 9, color: '#6b7280' }}>{metas.comissao_pct}% do MRR</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Reunioes</div>{pctBar(metas.reunioes.atual, metas.reunioes.meta, '#3b82f6')}</div>
              <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>Fechamentos</div>{pctBar(metas.fechamentos.atual, metas.fechamentos.meta, '#22c55e')}</div>
              <div><div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>MRR gerado</div>{pctBar(metas.mrr.atual, metas.mrr.meta, '#a855f7')}</div>
            </div>
          </div>
        )}

        {/* Modal Nova Proposta */}
        {modal && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal(false)}>
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 16, padding: 24, width: 560 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Nova Proposta</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Clinica *</label><input value={form.nome_clinica} onChange={e => setForm({ ...form, nome_clinica: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Plano</label><select value={form.plano} onChange={e => onPlanoChange(e.target.value)} style={inp}>{PLANOS.map(p => <option key={p.nome} value={p.nome}>{p.nome} (R${p.mrr})</option>)}</select></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>MRR (R$)</label><input type="number" value={form.mrr_proposto} onChange={e => setForm({ ...form, mrr_proposto: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data reuniao</label><input type="date" value={form.data_reuniao} onChange={e => setForm({ ...form, data_reuniao: e.target.value })} style={inp} /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Origem</label><select value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={inp}><option value="sdr">Via SDR</option><option value="indicacao">Indicacao</option><option value="outbound">Outbound</option><option value="evento">Evento</option><option value="outro">Outro</option></select></div>
              </div>
              <div style={{ marginTop: 10 }}><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Observacoes</label><textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} style={{ ...inp, minHeight: 50, resize: 'vertical' }} /></div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button onClick={criar} disabled={saving || !form.nome_clinica} style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving || !form.nome_clinica ? 0.5 : 1 }}>{saving ? 'Salvando...' : 'Criar Proposta'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ativar */}
        {ativarModal && (
          <div style={{ position: 'fixed', inset: 0, background: '#00000080', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setAtivarModal(null)}>
            <div style={{ background: '#13131f', border: '1px solid #22c55e40', borderRadius: 16, padding: 24, width: 440 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Ativar como cliente</h3>
              <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>Confirme os dados para iniciar o onboarding</p>
              <div style={{ background: '#09090f', borderRadius: 8, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{ativarModal.nome_clinica}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>💳 {ativarModal.plano} · {fmt(Number(ativarModal.mrr_proposto))}/mes</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Email do responsavel</label><input value={ativarEmail} onChange={e => setAtivarEmail(e.target.value)} style={inp} placeholder="clinica@email.com" /></div>
                <div><label style={{ color: '#6b7280', fontSize: 11, display: 'block', marginBottom: 4 }}>Data de inicio</label><input type="date" value={ativarData} onChange={e => setAtivarData(e.target.value)} style={inp} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={ativar} disabled={saving} style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13, fontWeight: 700, opacity: saving ? 0.5 : 1 }}>{saving ? 'Ativando...' : 'Confirmar ativacao'}</button>
                <button onClick={() => setAtivarModal(null)} style={{ background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Kanban (pipeline tab) */}
        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>Carregando...</div> : (
          <>
          <div className="md:hidden text-[10px] text-gray-500 mb-2 flex items-center gap-1">
            <span>👉 Arraste para ver todas as etapas</span>
          </div>
          <div className="overflow-x-auto -mx-4 px-4 pb-4 md:mx-0 md:px-0" style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
          <div style={{ display: 'flex', gap: 12, minWidth: 960 }}>
            {COLS.map(col => {
              const items = pipeline.filter(p => p.status === col.key)
              const mrr = items.reduce((s, p) => s + Number(p.mrr_proposto || 0), 0)
              const idx = ORDER.indexOf(col.key)
              return (
                <div key={col.key} style={{ flex: '0 0 240px', scrollSnapAlign: 'start' }}>
                  <div style={{ background: `${col.cor}15`, border: `1px solid ${col.cor}30`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 12, fontWeight: 700, color: col.cor }}>{col.label}</span><span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{items.length}</span></div>
                    {mrr > 0 && <div style={{ fontSize: 10, color: col.cor, marginTop: 2 }}>{fmt(mrr)} MRR</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 80 }}>
                    {items.map(p => (
                      <div key={p.id} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{p.nome_clinica}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>💳 {p.plano || '-'}</div>
                        <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 700, marginBottom: 4 }}>{fmt(Number(p.mrr_proposto || 0))}/mes</div>
                        {p.lead_id && <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: '#3b82f620', color: '#3b82f6', fontWeight: 600, display: 'inline-block', marginBottom: 4 }}>via SDR</span>}
                        {p.data_reuniao && <div style={{ fontSize: 10, color: '#6b7280' }}>📅 {p.data_reuniao}</div>}
                        {p.observacoes && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 3 }}>{p.observacoes.slice(0, 60)}{p.observacoes.length > 60 ? '...' : ''}</div>}
                        <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                          {idx < 2 && col.key !== 'perdido' && <button onClick={() => mover(p.id, 'next')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: `${COLS[idx + 1]?.cor || '#6b7280'}20`, color: COLS[idx + 1]?.cor || '#6b7280', border: `1px solid ${COLS[idx + 1]?.cor || '#6b7280'}30`, cursor: 'pointer' }}>Avancar →</button>}
                          {col.key !== 'perdido' && col.key !== 'fechado' && <button onClick={() => mover(p.id, 'perdido')} style={{ fontSize: 9, padding: '3px 8px', borderRadius: 4, background: '#ef444415', color: '#ef4444', border: '1px solid #ef444430', cursor: 'pointer' }}>✕ Perdido</button>}
                          {col.key === 'fechado' && <button onClick={() => { setAtivarModal(p); setAtivarEmail(''); setAtivarData(new Date().toISOString().split('T')[0]) }} style={{ fontSize: 9, padding: '3px 10px', borderRadius: 4, background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40', cursor: 'pointer', fontWeight: 700 }}>Ativar como cliente →</button>}
                        </div>
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div style={{ textAlign: 'center', border: '1px dashed #374151', borderRadius: 10, padding: '20px 12px', margin: '8px 0' }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>
                          {col.key === 'reuniao_agendada' ? '📅' : col.key === 'proposta_enviada' ? '📋' : col.key === 'fechado' ? '✅' : '📌'}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginBottom: 4 }}>Nenhum lead aqui</div>
                        <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 8, lineHeight: 1.4 }}>
                          {col.key === 'reuniao_agendada' ? 'Leads com reunião marcada' :
                           col.key === 'proposta_enviada' ? 'Propostas aguardando resposta' :
                           col.key === 'fechado' ? 'Contratos fechados' :
                           'Leads perdidos ou descartados'}
                        </div>
                        {col.key === 'reuniao_agendada' && (
                          <button onClick={() => setModal(true)} style={{ fontSize: 10, color: '#f59e0b', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                            + Adicionar primeiro lead →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
          </>
        )}
        </>}

        {/* =========== ABA WHATSAPP CRM =========== */}
        {aba === 'whatsapp' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[{ l: 'Webhooks hoje', v: waKpis.webhooksHoje, c: '#3b82f6' }, { l: 'Leads atualizados', v: waKpis.leadsAtualizados, c: '#22c55e' }, { l: 'Etapas movidas', v: waKpis.etapasMovidas, c: '#f59e0b' }, { l: 'Usuarios ativos', v: waKpis.usersAtivos, c: '#a855f7' }].map(k => (
                <div key={k.l} style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.l}</div>
                  <NumberTicker value={k.v} style={{ fontSize: 26, fontWeight: 800, color: k.c }} />
                </div>
              ))}
            </div>
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Webhook:</span>
              <code style={{ fontSize: 12, color: '#f59e0b', background: '#252535', padding: '4px 10px', borderRadius: 6, flex: 1 }}>https://excalibur-hq.vercel.app/api/crm/webhook</code>
              <button onClick={() => navigator.clipboard.writeText('https://excalibur-hq.vercel.app/api/crm/webhook')} style={{ background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Copiar</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {(['log', 'closer'] as const).map(k => <button key={k} onClick={() => setWaTab(k)} style={{ background: waTab === k ? '#f59e0b20' : 'transparent', border: `1px solid ${waTab === k ? '#f59e0b' : '#252535'}`, color: waTab === k ? '#f59e0b' : '#9ca3af', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12 }}>{k === 'log' ? 'Log Webhooks' : 'Pipeline WA'}</button>)}
            </div>
            {waLoading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Carregando...</div> : waTab === 'log' ? (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Hora', 'Evento', 'Nome', 'Numero', 'Etiqueta', 'Acao', ''].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '10px 10px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {logs.length === 0 ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#374151' }}>Nenhum webhook ainda</td></tr> :
                    logs.map(l => (
                      <tr key={l.id} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: 11 }}>{tempo(l.created_at)}</td>
                        <td style={{ padding: '6px 10px', color: '#e5e7eb', fontSize: 11 }}>{l.evento}</td>
                        <td style={{ padding: '6px 10px', color: '#fff', fontSize: 11 }}>{l.nome || '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: 10, fontFamily: 'monospace' }}>{l.numero || '-'}</td>
                        <td style={{ padding: '6px 10px' }}>{l.etiqueta ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: '#a855f720', color: '#a855f7' }}>{l.etiqueta}</span> : '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#9ca3af', fontSize: 10 }}>{l.acao_executada || '-'}</td>
                        <td style={{ padding: '6px 10px' }}><span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: l.processado ? '#22c55e20' : '#ef444420', color: l.processado ? '#22c55e' : '#ef4444' }}>{l.processado ? 'OK' : '!'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Clinica', 'Status', 'Etiqueta WA', 'Ultimo', 'Disparos', 'Usuario'].map(h => <th key={h} style={{ color: '#6b7280', fontSize: 10, fontWeight: 600, padding: '10px 10px', textAlign: 'left', borderBottom: '1px solid #252535' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {closerWA.length === 0 ? <tr><td colSpan={6} style={{ padding: 30, textAlign: 'center', color: '#374151' }}>Sem atividade WA</td></tr> :
                    closerWA.map(p => (
                      <tr key={String(p.id)} style={{ borderBottom: '1px solid #1a1a2e' }}>
                        <td style={{ padding: '6px 10px', color: '#fff', fontSize: 12 }}>{String(p.nome_clinica)}</td>
                        <td style={{ padding: '6px 10px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#f59e0b20', color: '#f59e0b' }}>{String(p.status)}</span></td>
                        <td style={{ padding: '6px 10px' }}>{p.etiqueta_wa ? <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 999, background: '#a855f720', color: '#a855f7' }}>{String(p.etiqueta_wa)}</span> : '-'}</td>
                        <td style={{ padding: '6px 10px', color: '#6b7280', fontSize: 11 }}>{tempo(String(p.ultimo_contato_wa || ''))}</td>
                        <td style={{ padding: '6px 10px', color: '#22c55e', fontSize: 12, fontWeight: 700 }}>{String(p.total_disparos_wa)}</td>
                        <td style={{ padding: '6px 10px', color: '#9ca3af', fontSize: 11 }}>{String(p.usuario_wa || '-')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
