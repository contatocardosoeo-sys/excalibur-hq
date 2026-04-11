'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import AcaoHoje from '../../components/AcaoHoje'
import { useToast } from '../../components/Toast'
import Modal, { ModalButton } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { NumberTicker } from '@/components/ui/number-ticker'

/* ── Types ── */
interface Cliente {
  id: string
  nome: string
  plano: string
  valor_contrato: number
  cidade: string | null
  estado: string | null
  cs_responsavel: string
  etapa: string
  dias_na_plataforma: number
  data_inicio: string | null
  score: number
  classificacao: string
  alertas_count: number
  alertas_criticos: number
  faturamento_mes: number
  tarefas_total: number
  tarefas_pendentes: number
  tarefas_bloqueantes: number
  ultima_acao: string | null
  dias_sem_acao: number
  notas: string | null
}

interface Tarefa { id: string; clinica_id: string; clinica_nome: string; fase: string; titulo: string; status: string; bloqueante: boolean; data_prazo: string }
interface Acao { clinica_id: string; clinica_nome: string; motivo: string; tipo: string; urgencia: number }
interface Alerta { id: string; clinica_id: string; tipo: string; titulo: string; nivel: number; descricao: string; created_at: string }
interface Log { id: string; clinica_id: string; clinica_nome: string; tipo: string; descricao: string; responsavel: string; created_at: string }
interface Atrasado { cliente_nome: string; valor: number; status: string; data_vencimento: string }

interface Painel {
  kpis: {
    total_ativos: number; em_risco: number; em_atencao: number; saudaveis: number
    sem_interacao: number; alertas_criticos: number; alertas_total: number
    score_medio: number; faturamento_mes: number; mrr_total: number
    tarefas_semana: number; tarefas_bloqueantes: number
  }
  clientes: Cliente[]
  tarefas_semana: Tarefa[]
  acoes: Acao[]
  alertas: Alerta[]
  log_recente: Log[]
  atrasados_financeiro: Atrasado[]
  distribuicao_etapas: Record<string, number>
}

/* ── Helpers ── */
function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function fmtDate(d: string | null) {
  if (!d) return '-'
  const dt = new Date(d.length === 10 ? d + 'T12:00:00' : d)
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`
}
function tempoAtras(d: string) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

const scoreCor = (s: number) => s >= 80 ? '#4ade80' : s >= 60 ? '#fbbf24' : '#f87171'
const etapaCor = (e: string) => {
  if (e.match(/D0|D1|D3|D5/)) return '#a78bfa'
  if (e.match(/D7|D15/)) return '#fbbf24'
  if (e.match(/D30|D60|D90/)) return '#4ade80'
  if (e === 'RISCO' || e === 'CHURN') return '#f87171'
  return '#6b7280'
}
const tipoAcaoCor = (t: string) => {
  if (t === 'critico') return '#ef4444'
  if (t === 'risco') return '#f97316'
  if (t === 'bloqueante') return '#f59e0b'
  if (t === 'onboarding') return '#a855f7'
  return '#3b82f6'
}

/* ══════════════ COMPONENT ══════════════ */
export default function CSPainel() {
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<Painel | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [aba, setAba] = useState<'overview' | 'clientes' | 'tarefas' | 'acoes' | 'log'>('overview')
  const [busca, setBusca] = useState('')
  const [filtroScore, setFiltroScore] = useState('')

  // Modal contato
  const [modalCliente, setModalCliente] = useState<Cliente | null>(null)
  const [contatoTipo, setContatoTipo] = useState('mensagem')
  const [contatoDesc, setContatoDesc] = useState('')
  const [salvando, setSalvando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/cs/painel')
      const d = await res.json()
      setData(d)
      setLastUpdate(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { load(); const iv = setInterval(load, 60000); return () => clearInterval(iv) }, [load])

  const registrarContato = async () => {
    if (!modalCliente || !contatoDesc.trim()) {
      toast('error', 'Descreva o contato realizado')
      return
    }
    setSalvando(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await fetch('/api/cs/registrar-contato', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id: modalCliente.id, tipo: contatoTipo, descricao: contatoDesc, cs_email: user?.email || '' }),
      })
      await fetch('/api/cs/log', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clinica_id: modalCliente.id, clinica_nome: modalCliente.nome, tipo: contatoTipo, descricao: contatoDesc, responsavel: 'CS' }),
      })
      toast('success', `Contato registrado para ${modalCliente.nome}`)
      setModalCliente(null); setContatoDesc('')
      load()
    } catch {
      toast('error', 'Erro ao registrar contato')
    }
    setSalvando(false)
  }

  /* ── Loading state ── */
  if (loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: 32 }}>
          <div style={{ height: 28, width: 200, background: '#111827', borderRadius: 8, animation: 'pulse 1.5s infinite', marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 80, animation: 'pulse 1.5s infinite' }} />)}
          </div>
          {[1, 2, 3].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 200, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />)}
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      </div>
    )
  }

  const { kpis, clientes, tarefas_semana, acoes, alertas, log_recente, atrasados_financeiro, distribuicao_etapas } = data

  /* ── Filtros ── */
  const clientesFiltrados = clientes.filter(c => {
    if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroScore === 'risco' && c.score >= 60) return false
    if (filtroScore === 'atencao' && (c.score < 60 || c.score >= 80)) return false
    if (filtroScore === 'saudavel' && c.score < 80) return false
    return true
  })

  /* ── Card ── */
  const KPICard = ({ icon, label, valor, sub, cor, onClick }: { icon: string; label: string; valor: React.ReactNode; sub?: string; cor: string; onClick?: () => void }) => (
    <div onClick={onClick} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: '12px 14px', cursor: onClick ? 'pointer' : 'default', transition: 'border 0.2s' }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = cor + '60' }}
      onMouseLeave={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.borderColor = '#1f2937' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 12 }}>{icon}</span>
        <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>{valor}</div>
      {sub && <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', overflowX: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '16px 16px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, maxWidth: '100%' }}>

        {/* Card de acao do dia (imperativo) */}
        <AcaoHoje role="cs" />

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>🎯 Customer Success</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Painel completo da operacao CS · atualiza a cada 60s</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: '#4b5563' }}>Atualizado as {lastUpdate}</span>
            <button onClick={load} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
          </div>
        </div>

        {/* ── KPIs principais ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
          <KPICard icon="👥" label="Clientes ativos" valor={<NumberTicker value={kpis.total_ativos} style={{ color: '#60a5fa' }} />} sub={`MRR ${fmt(kpis.mrr_total)}`} cor="#60a5fa" />
          <KPICard icon="💚" label="Saudaveis" valor={<NumberTicker value={kpis.saudaveis} style={{ color: '#4ade80' }} />} sub="score >= 80" cor="#4ade80" onClick={() => { setAba('clientes'); setFiltroScore('saudavel') }} />
          <KPICard icon="⚠️" label="Em atencao" valor={<NumberTicker value={kpis.em_atencao} style={{ color: '#fbbf24' }} />} sub="60-79" cor="#fbbf24" onClick={() => { setAba('clientes'); setFiltroScore('atencao') }} />
          <KPICard icon="🔴" label="Em risco" valor={<NumberTicker value={kpis.em_risco} style={{ color: '#f87171' }} />} sub="< 60" cor="#f87171" onClick={() => { setAba('clientes'); setFiltroScore('risco') }} />
          <KPICard icon="🚨" label="Alertas criticos" valor={<NumberTicker value={kpis.alertas_criticos} style={{ color: kpis.alertas_criticos > 0 ? '#f87171' : '#4ade80' }} />} sub={`${kpis.alertas_total} totais`} cor={kpis.alertas_criticos > 0 ? '#f87171' : '#4ade80'} />
          <KPICard icon="📅" label="Tarefas semana" valor={<NumberTicker value={kpis.tarefas_semana} style={{ color: kpis.tarefas_bloqueantes > 0 ? '#fbbf24' : '#9ca3af' }} />} sub={`${kpis.tarefas_bloqueantes} bloqueantes`} cor={kpis.tarefas_bloqueantes > 0 ? '#fbbf24' : '#9ca3af'} onClick={() => router.push('/cs/calendario')} />
        </div>

        {/* ── KPIs secundarios ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10, marginBottom: 20 }}>
          <KPICard icon="📊" label="Score medio" valor={`${kpis.score_medio}%`} sub={kpis.score_medio >= 80 ? '🟢 Saudável · meta 80' : kpis.score_medio >= 60 ? '🟡 Atenção · meta 80' : kpis.score_medio >= 40 ? '🟠 Ação hoje · meta 80' : '🔴 Crítico · agir já'} cor={scoreCor(kpis.score_medio)} />
          <KPICard icon="💰" label="Faturamento mes" valor={fmt(kpis.faturamento_mes)} sub="dos clientes" cor="#fbbf24" />
          <KPICard icon="⏳" label="Sem interacao" valor={kpis.sem_interacao} sub=">= 5 dias" cor={kpis.sem_interacao > 0 ? '#f97316' : '#4ade80'} />
          <KPICard icon="🎯" label="Acoes pendentes" valor={acoes.length} sub="obrigatorias" cor={acoes.length > 0 ? '#fbbf24' : '#4ade80'} />
        </div>

        {/* ── Abas ── */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#111827', borderRadius: 10, padding: 3 }}>
          {[
            { key: 'overview' as const, label: '📊 Visao Geral' },
            { key: 'acoes' as const, label: `🎯 Acoes (${acoes.length})` },
            { key: 'clientes' as const, label: `👥 Clientes (${clientes.length})` },
            { key: 'tarefas' as const, label: `📅 Tarefas (${tarefas_semana.length})` },
            { key: 'log' as const, label: '📝 Log' },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)}
              className="min-h-[44px] md:min-h-[36px]"
              style={{ flex: 1, background: aba === t.key ? '#f59e0b' : 'transparent', color: aba === t.key ? '#030712' : '#6b7280', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: aba === t.key ? 700 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ════════ ABA OVERVIEW ════════ */}
        {aba === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            {/* Coluna esquerda */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Top 5 acoes obrigatorias */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>🎯 Acoes prioritarias</span>
                  {acoes.length > 5 && <button onClick={() => setAba('acoes')} style={{ fontSize: 10, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Ver todas {acoes.length} →</button>}
                </div>
                {acoes.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#4ade80', fontSize: 12 }}>✅ Tudo em dia!</div>
                ) : (
                  <div>
                    {acoes.slice(0, 5).map((a, i) => (
                      <div key={i} onClick={() => router.push(`/jornada/${a.clinica_id}`)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: i < 4 ? '1px solid #1f293730' : 'none', cursor: 'pointer' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: tipoAcaoCor(a.tipo), flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{a.clinica_nome}</div>
                          <div style={{ color: '#6b7280', fontSize: 10 }}>{a.motivo}</div>
                        </div>
                        <span style={{ background: tipoAcaoCor(a.tipo) + '20', color: tipoAcaoCor(a.tipo), padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>{a.tipo}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top 5 clientes em risco */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>🔴 Clientes que precisam de atencao</span>
                </div>
                {clientes.filter(c => c.score < 80).slice(0, 5).length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#4ade80', fontSize: 12 }}>✅ Todos saudaveis</div>
                ) : (
                  clientes.filter(c => c.score < 80).slice(0, 5).map(c => (
                    <div key={c.id} onClick={() => router.push(`/jornada/${c.id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1f293730', cursor: 'pointer' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{c.nome}</div>
                        <div style={{ color: '#6b7280', fontSize: 10 }}>{c.cidade ? `${c.cidade}/${c.estado} · ` : ''}CS: {c.cs_responsavel}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ background: etapaCor(c.etapa) + '20', color: etapaCor(c.etapa), padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600 }}>{c.etapa}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 60 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: scoreCor(c.score), fontFamily: 'monospace' }}>{c.score}</span>
                          <div style={{ flex: 1, height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: scoreCor(c.score), width: `${c.score}%` }} />
                          </div>
                        </div>
                        <button onClick={e => { e.stopPropagation(); setModalCliente(c) }} style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Contato</button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Tarefas da semana */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📅 Proximas tarefas da semana</span>
                  <button onClick={() => router.push('/cs/calendario')} style={{ fontSize: 10, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Ver calendario →</button>
                </div>
                {tarefas_semana.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 12 }}>Nenhuma tarefa esta semana</div>
                ) : (
                  tarefas_semana.slice(0, 6).map(t => (
                    <div key={t.id} onClick={() => router.push(`/jornada/${t.clinica_id}`)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', borderBottom: '1px solid #1f293730', cursor: 'pointer', borderLeft: t.bloqueante ? '3px solid #f59e0b' : '3px solid transparent' }}>
                      <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace', minWidth: 36 }}>{fmtDate(t.data_prazo)}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#fff', fontSize: 11, fontWeight: 500 }}>{t.titulo}</div>
                        <div style={{ color: '#6b7280', fontSize: 9 }}>{t.clinica_nome} · {t.fase}</div>
                      </div>
                      {t.bloqueante && <span style={{ color: '#f59e0b', fontSize: 10 }}>🔒</span>}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Coluna direita */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Distribuicao por etapa */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>📈 Distribuicao por etapa</div>
                {Object.keys(distribuicao_etapas).length === 0 ? (
                  <div style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', padding: 12 }}>Sem dados</div>
                ) : (
                  Object.entries(distribuicao_etapas).sort((a, b) => b[1] - a[1]).map(([etapa, qtd]) => (
                    <div key={etapa} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: etapaCor(etapa) }}>{etapa}</span>
                        <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>{qtd}</span>
                      </div>
                      <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: etapaCor(etapa), width: `${(qtd / kpis.total_ativos) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Inadimplentes do mes */}
              <div style={{ background: '#111827', border: `1px solid ${atrasados_financeiro.length > 0 ? '#ef444430' : '#1f2937'}`, borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: atrasados_financeiro.length > 0 ? '#f87171' : '#fff', marginBottom: 12 }}>
                  {atrasados_financeiro.length > 0 ? '🔴' : '✅'} Inadimplentes do mes
                </div>
                {atrasados_financeiro.length === 0 ? (
                  <div style={{ color: '#4ade80', fontSize: 11, textAlign: 'center', padding: 12 }}>Nenhum inadimplente</div>
                ) : (
                  atrasados_financeiro.slice(0, 5).map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < Math.min(4, atrasados_financeiro.length - 1) ? '1px solid #1f293740' : 'none' }}>
                      <span style={{ fontSize: 11, color: '#fff' }}>{a.cliente_nome}</span>
                      <span style={{ fontSize: 11, color: '#f87171', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(Number(a.valor))}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Atividade recente */}
              <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>📝 Atividade recente</div>
                {log_recente.length === 0 ? (
                  <div style={{ color: '#6b7280', fontSize: 11, textAlign: 'center', padding: 12 }}>Nenhuma atividade registrada</div>
                ) : (
                  log_recente.slice(0, 6).map(l => (
                    <div key={l.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #1f293730' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>{l.clinica_nome}</span>
                        <span style={{ fontSize: 9, color: '#4b5563' }}>{tempoAtras(l.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#6b7280' }}>{l.tipo}: {l.descricao.substring(0, 50)}{l.descricao.length > 50 ? '...' : ''}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════ ABA ACOES ════════ */}
        {aba === 'acoes' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>🎯 Todas as acoes obrigatorias</span>
              <span style={{ fontSize: 11, color: '#6b7280' }}>{acoes.length} acoes</span>
            </div>
            {acoes.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#4ade80' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                <div>Tudo em dia! Nenhuma acao pendente</div>
              </div>
            ) : (
              acoes.map((a, i) => (
                <div key={i} onClick={() => router.push(`/jornada/${a.clinica_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #1f293730', cursor: 'pointer' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: tipoAcaoCor(a.tipo), flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{a.clinica_nome}</div>
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>{a.motivo}</div>
                  </div>
                  <span style={{ background: tipoAcaoCor(a.tipo) + '20', color: tipoAcaoCor(a.tipo), padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{a.tipo}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════════ ABA CLIENTES ════════ */}
        {aba === 'clientes' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente..."
                style={{ flex: 1, background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
              {filtroScore && (
                <button onClick={() => setFiltroScore('')} style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', borderRadius: 8, padding: '6px 12px', fontSize: 11, cursor: 'pointer' }}>
                  Limpar filtro: {filtroScore} ✕
                </button>
              )}
            </div>
            <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Cliente', 'Etapa', 'Dias', 'Score', 'Tarefas', 'Alertas', 'Faturamento', 'Acao'].map(h => (
                    <th key={h} style={{ color: '#4b5563', fontSize: 9, fontWeight: 600, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {clientesFiltrados.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #1f293730', cursor: 'pointer' }} onClick={() => router.push(`/jornada/${c.id}`)}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{c.nome}</div>
                        <div style={{ color: '#6b7280', fontSize: 9 }}>{c.plano} · {c.cs_responsavel}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: etapaCor(c.etapa) + '20', color: etapaCor(c.etapa), padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600 }}>{c.etapa}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{c.dias_na_plataforma}d</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: scoreCor(c.score), fontFamily: 'monospace', width: 24 }}>{c.score}</span>
                          <div style={{ width: 50, height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: scoreCor(c.score), width: `${c.score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 10, color: '#9ca3af' }}>
                        {c.tarefas_pendentes}/{c.tarefas_total}
                        {c.tarefas_bloqueantes > 0 && <span style={{ color: '#f59e0b', marginLeft: 4 }}>🔒{c.tarefas_bloqueantes}</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {c.alertas_count > 0 ? (
                          <span style={{ background: '#ef444420', color: '#f87171', padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700 }}>
                            {c.alertas_count}{c.alertas_criticos > 0 ? ` (${c.alertas_criticos}!)` : ''}
                          </span>
                        ) : (
                          <span style={{ color: '#4ade80', fontSize: 9 }}>OK</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#fbbf24', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}>{fmt(c.faturamento_mes)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <button onClick={e => { e.stopPropagation(); setModalCliente(c) }} style={{ background: '#f59e0b15', color: '#f59e0b', border: '1px solid #f59e0b30', borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 600, cursor: 'pointer' }}>Contato</button>
                      </td>
                    </tr>
                  ))}
                  {clientesFiltrados.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Nenhum cliente encontrado</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ════════ ABA TAREFAS ════════ */}
        {aba === 'tarefas' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📅 Tarefas da semana</span>
              <button onClick={() => router.push('/cs/calendario')} style={{ fontSize: 10, color: '#f59e0b', background: 'none', border: 'none', cursor: 'pointer' }}>Abrir calendario →</button>
            </div>
            {tarefas_semana.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📅</div>
                <div>Nenhuma tarefa esta semana</div>
              </div>
            ) : (
              tarefas_semana.map(t => (
                <div key={t.id} onClick={() => router.push(`/jornada/${t.clinica_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #1f293730', cursor: 'pointer', borderLeft: t.bloqueante ? '3px solid #f59e0b' : '3px solid transparent' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace', minWidth: 50 }}>{fmtDate(t.data_prazo)}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>{t.titulo}</div>
                    <div style={{ color: '#6b7280', fontSize: 10 }}>{t.clinica_nome}</div>
                  </div>
                  <span style={{ background: '#37415120', color: '#9ca3af', padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600 }}>{t.fase}</span>
                  {t.bloqueante && <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700 }}>🔒 BLOQUEANTE</span>}
                </div>
              ))
            )}
          </div>
        )}

        {/* ════════ ABA LOG ════════ */}
        {aba === 'log' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📝 Log de atividades</span>
            </div>
            {log_recente.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📝</div>
                <div>Nenhuma atividade registrada</div>
                <div style={{ fontSize: 10, marginTop: 4 }}>Quando registrar contatos com clientes, aparecera aqui</div>
              </div>
            ) : (
              log_recente.map(l => (
                <div key={l.id} style={{ padding: '12px 16px', borderBottom: '1px solid #1f293730' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 600 }}>{l.clinica_nome}</span>
                    <span style={{ fontSize: 10, color: '#4b5563' }}>{tempoAtras(l.created_at)} · {l.responsavel}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#3b82f620', color: '#60a5fa', padding: '1px 8px', borderRadius: 6, fontSize: 9, fontWeight: 600 }}>{l.tipo}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{l.descricao}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ════════ MODAL CONTATO (componente global) ════════ */}
        <Modal
          open={!!modalCliente}
          onClose={() => setModalCliente(null)}
          title="Registrar contato"
          subtitle={modalCliente ? `${modalCliente.nome} · Score ${modalCliente.score} · ${modalCliente.etapa}` : ''}
          width={480}
          footer={
            <>
              <ModalButton variant="secondary" onClick={() => setModalCliente(null)}>Cancelar</ModalButton>
              <ModalButton variant="primary" onClick={registrarContato} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Registrar'}
              </ModalButton>
            </>
          }
        >
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {['mensagem', 'ligacao', 'reuniao', 'ajuste'].map(t => (
              <button key={t} onClick={() => setContatoTipo(t)}
                style={{ background: contatoTipo === t ? '#f59e0b' : '#1f2937', color: contatoTipo === t ? '#030712' : '#9ca3af', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: contatoTipo === t ? 700 : 500 }}>
                {t}
              </button>
            ))}
          </div>
          <textarea value={contatoDesc} onChange={e => setContatoDesc(e.target.value)} placeholder="Descreva o contato realizado..."
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 12, outline: 'none', minHeight: 80, resize: 'vertical' }} />
        </Modal>
      </div>
    </div>
  )
}
