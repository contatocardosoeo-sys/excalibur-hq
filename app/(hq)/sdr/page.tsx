'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

interface Metricas {
  periodo?: string
  range?: { start: string; end: string }
  metricas_dia: { data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number; observacao: string | null } | null
  metricas_mes: Array<{ data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number }>
  metricas_periodo?: Array<{ data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number }>
  acumulado: { leads: number; contatos: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number }
  taxas: { contato: number; agendamento: number; comparecimento: number; conversao: number }
  metas: { leads: number; agendamentos: number; comparecimentos: number; vendas: number }
}

// 10 etapas reais do CRM (ACL — Acelera CRM)
const ETAPAS_ACL = [
  { num: 1, label: 'Recepcao', desc: 'Lead chegou — primeiro contato, confirmar nome e interesse', cor: '#3b82f6', prioridade: 2 },
  { num: 2, label: 'Explicacao', desc: 'Apresentar a Excalibur, gerar conexao e tirar duvidas iniciais', cor: '#8b5cf6', prioridade: 5 },
  { num: 3, label: 'Qualificacao', desc: 'Investigar dor, contexto, decisor e momento', cor: '#a855f7', prioridade: 4 },
  { num: 4, label: 'Agendamento', desc: 'Marcar reuniao com horario confirmado', cor: '#fbbf24', prioridade: 3 },
  { num: 5, label: 'Confirmacao', desc: 'Confirmar reuniao do dia — PRIMEIRA TAREFA AS 8H', cor: '#ef4444', prioridade: 1 },
  { num: 6, label: 'Reagendar', desc: 'Pessoa que precisou remarcar — manter quente', cor: '#f97316', prioridade: 6 },
  { num: 7, label: 'Sem CNPJ', desc: 'Pendencia de CNPJ — aguardando envio', cor: '#6b7280', prioridade: 7 },
  { num: 8, label: 'Futuro', desc: 'Pessoa interessada mas sem timing — manter aquecida', cor: '#06b6d4', prioridade: 8 },
  { num: 9, label: 'Lista Fria', desc: 'Reativacoes de leads antigos', cor: '#94a3b8', prioridade: 9 },
  { num: 10, label: 'Fora do CP', desc: 'Fora do perfil — descarte ou educacao', cor: '#475569', prioridade: 10 },
]

// Rotina diaria real do Trindade — ordem de prioridade
const ROTINA_DIA = [
  { hora: '08:00', titulo: '🚨 Confirmacoes de reuniao do dia', desc: 'PRIMEIRA TAREFA — antes de qualquer coisa, confirme TODAS as reunioes do dia (etapa Confirmacao)', critico: true },
  { hora: '08:30', titulo: '💬 Cadencias — responder TODO mundo no WhatsApp', desc: 'Mate as respostas pendentes antes de comecar o follow-up', critico: false },
  { hora: '09:30', titulo: '📥 Recepcao — pessoas que ainda nao iniciaram atendimento', desc: 'Disparar fluxo de Recepcao para todos os leads novos', critico: false },
  { hora: '10:30', titulo: '📅 Agendamento — converter qualificados em reuniao', desc: 'Trabalhar lista de qualificacao, marcar horarios', critico: false },
  { hora: '11:30', titulo: '🎯 Qualificacao — investigar dor e contexto', desc: 'Disparar fluxo de qualificacao + follow-ups', critico: false },
  { hora: '12:00', titulo: 'Almoco', desc: '', critico: false },
  { hora: '13:30', titulo: '📖 Explicacao — apresentar Excalibur', desc: 'Disparar fluxo de explicacao para os que avancaram', critico: false },
  { hora: '15:00', titulo: '🔄 Follow-ups — pessoas sem resposta', desc: 'Follow-up 1 hoje, follow-up 2 amanha (mesma cadencia)', critico: false },
  { hora: '16:00', titulo: '❄️ Lista fria + Futuro — reativacao', desc: 'Tentativa de reativar pessoas frias e do futuro', critico: false },
  { hora: '17:00', titulo: '📝 Atualizar metricas do dia + feedback', desc: 'Lancar numeros do dia + escrever feedback diario', critico: false },
]

function fmt(n: number) { return n.toLocaleString('pt-BR') }
function pct(a: number, b: number) { return b > 0 ? Math.round((a / b) * 100) : 0 }
function corPct(p: number) { return p >= 80 ? '#4ade80' : p >= 50 ? '#fbbf24' : '#f87171' }

export default function SDRPage() {
  const [data, setData] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'overview' | 'rotina' | 'etapas' | 'historico'>('overview')
  const [userEmail, setUserEmail] = useState('trindade.excalibur@gmail.com')

  // Filtros de periodo
  const [periodo, setPeriodo] = useState<'hoje' | 'semana' | 'mes' | 'personalizado'>('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [form, setForm] = useState({
    leads_recebidos: '', contatos_realizados: '', agendamentos: '',
    comparecimentos: '', vendas: '', valor_vendas: '', observacao: '',
  })
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const email = session?.user?.email || 'trindade.excalibur@gmail.com'
      setUserEmail(email)

      let qs = `email=${encodeURIComponent(email)}&periodo=${periodo}`
      if (periodo === 'personalizado' && dataInicio && dataFim) {
        qs += `&start=${dataInicio}&end=${dataFim}`
      }
      const res = await fetch(`/api/sdr/metricas?${qs}`)
      const d = await res.json()
      setData(d)

      if (d.metricas_dia) {
        setForm({
          leads_recebidos: String(d.metricas_dia.leads_recebidos || ''),
          contatos_realizados: String(d.metricas_dia.contatos_realizados || ''),
          agendamentos: String(d.metricas_dia.agendamentos || ''),
          comparecimentos: String(d.metricas_dia.comparecimentos || ''),
          vendas: String(d.metricas_dia.vendas || ''),
          valor_vendas: String(d.metricas_dia.valor_vendas || ''),
          observacao: d.metricas_dia.observacao || '',
        })
      }
    } catch { /* */ }
    setLoading(false)
  }, [periodo, dataInicio, dataFim])

  useEffect(() => { load(); const iv = setInterval(load, 120000); return () => clearInterval(iv) }, [load])

  const salvarMetricas = async () => {
    setSalvando(true)
    await fetch('/api/sdr/metricas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, sdr_email: userEmail }),
    })
    setSalvando(false)
    setEditando(false)
    load()
  }

  if (loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: 32 }}>
          <div style={{ height: 28, width: 200, background: '#111827', borderRadius: 8, animation: 'pulse 1.5s infinite', marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 90, animation: 'pulse 1.5s infinite' }} />)}
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      </div>
    )
  }

  const { acumulado, taxas, metas, metricas_mes } = data

  const KPI = ({ icon, label, atual, meta, cor }: { icon: string; label: string; atual: number; meta: number; cor: string }) => {
    const p = pct(atual, meta)
    return (
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>{fmt(atual)}</span>
          <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>/ {fmt(meta)}</span>
        </div>
        <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', background: corPct(p), width: `${Math.min(p, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: 9, color: corPct(p), marginTop: 4, fontWeight: 700 }}>{p}% da meta mensal</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxWidth: 1400 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>📞 SDR — Prospeccao</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Operacao diaria + metas + rotina + etapas ACL</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/sdr/feedbacks" style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, textDecoration: 'none' }}>📝 Feedbacks</Link>
            <button onClick={load} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
          </div>
        </div>

        {/* Filtros de periodo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: 8 }}>
          <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginLeft: 8, marginRight: 4 }}>Periodo:</span>
          {[
            { k: 'hoje' as const, l: 'Hoje' },
            { k: 'semana' as const, l: 'Semana' },
            { k: 'mes' as const, l: 'Mes' },
            { k: 'personalizado' as const, l: 'Personalizado' },
          ].map(p => (
            <button key={p.k} onClick={() => setPeriodo(p.k)}
              style={{ background: periodo === p.k ? '#f59e0b' : '#1f2937', color: periodo === p.k ? '#030712' : '#9ca3af', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 11, cursor: 'pointer', fontWeight: periodo === p.k ? 700 : 500 }}>
              {p.l}
            </button>
          ))}
          {periodo === 'personalizado' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 11, outline: 'none' }} />
              <span style={{ color: '#4b5563', fontSize: 10 }}>até</span>
              <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 11, outline: 'none' }} />
            </div>
          )}
          {data.range && (
            <span style={{ fontSize: 10, color: '#4b5563', marginLeft: 'auto', marginRight: 8 }}>
              {data.range.start === data.range.end
                ? new Date(data.range.start + 'T12:00:00').toLocaleDateString('pt-BR')
                : `${new Date(data.range.start + 'T12:00:00').toLocaleDateString('pt-BR')} → ${new Date(data.range.end + 'T12:00:00').toLocaleDateString('pt-BR')}`}
            </span>
          )}
        </div>

        {/* KPIs com metas — 6 cards (5 numericos + 1 valor) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 20 }}>
          <KPI icon="📥" label="Leads" atual={acumulado.leads} meta={metas.leads} cor="#60a5fa" />
          <KPI icon="📞" label="Contatos" atual={acumulado.contatos} meta={metas.leads} cor="#a78bfa" />
          <KPI icon="📅" label="Agendamentos" atual={acumulado.agendamentos} meta={metas.agendamentos} cor="#fbbf24" />
          <KPI icon="✅" label="Comparecimentos" atual={acumulado.comparecimentos} meta={metas.comparecimentos} cor="#fb923c" />
          <KPI icon="🎯" label="Vendas" atual={acumulado.vendas} meta={metas.vendas} cor="#4ade80" />
          {/* Card de valor de vendas — destaque */}
          <div style={{ background: 'linear-gradient(135deg, #14532d 0%, #166534 100%)', border: '1px solid #22c55e40', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 12 }}>💰</span>
              <span style={{ fontSize: 9, color: '#86efac', textTransform: 'uppercase', fontWeight: 700 }}>Valor gerado</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', fontFamily: 'monospace' }}>
              R$ {Number(acumulado.valor_vendas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: 9, color: '#86efac', marginTop: 4 }}>{acumulado.vendas} venda{acumulado.vendas !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {/* Taxas */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 12 }}>📈 Taxas de conversao do mes</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Lead → Contato', value: taxas.contato },
              { label: 'Contato → Agend.', value: taxas.agendamento },
              { label: 'Agend. → Comparec.', value: taxas.comparecimento },
              { label: 'Comparec. → Venda', value: taxas.conversao },
            ].map((t, i) => (
              <div key={i} style={{ background: '#0a0f1a', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: corPct(t.value), fontFamily: 'monospace' }}>{t.value}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 16, background: '#111827', borderRadius: 10, padding: 3 }}>
          {[
            { key: 'overview' as const, label: '📊 Lancar dia' },
            { key: 'rotina' as const, label: '⏰ Rotina' },
            { key: 'etapas' as const, label: '🎯 Etapas ACL' },
            { key: 'historico' as const, label: '📅 Historico' },
          ].map(t => (
            <button key={t.key} onClick={() => setAba(t.key)}
              style={{ flex: 1, background: aba === t.key ? '#f59e0b' : 'transparent', color: aba === t.key ? '#030712' : '#6b7280', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: aba === t.key ? 700 : 500, cursor: 'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ABA OVERVIEW */}
        {aba === 'overview' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Metricas de hoje — {new Date().toLocaleDateString('pt-BR')}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Lance os numeros do dia ao final de cada bloco ou no fechamento</div>
              </div>
              {!editando && data.metricas_dia && (
                <button onClick={() => setEditando(true)} style={{ background: '#3b82f615', color: '#60a5fa', border: '1px solid #3b82f630', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>✏️ Editar</button>
              )}
            </div>

            {!editando && data.metricas_dia ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    { l: '📥 Leads', v: data.metricas_dia.leads_recebidos, formato: 'num' },
                    { l: '📞 Contatos', v: data.metricas_dia.contatos_realizados, formato: 'num' },
                    { l: '📅 Agendamentos', v: data.metricas_dia.agendamentos, formato: 'num' },
                    { l: '✅ Comparecimentos', v: data.metricas_dia.comparecimentos, formato: 'num' },
                    { l: '🎯 Vendas', v: data.metricas_dia.vendas, formato: 'num' },
                    { l: '💰 Valor', v: data.metricas_dia.valor_vendas || 0, formato: 'rs' },
                  ].map((m, i) => (
                    <div key={i} style={{ background: '#0a0f1a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>{m.l}</div>
                      <div style={{ fontSize: m.formato === 'rs' ? 18 : 24, fontWeight: 800, color: '#f59e0b', fontFamily: 'monospace' }}>
                        {m.formato === 'rs' ? `R$ ${Number(m.v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : fmt(m.v)}
                      </div>
                    </div>
                  ))}
                </div>
                {data.metricas_dia.observacao && (
                  <div style={{ background: '#0a0f1a', borderRadius: 8, padding: 12, fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>
                    💬 {data.metricas_dia.observacao}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10, marginBottom: 12 }}>
                  {[
                    { k: 'leads_recebidos', l: '📥 Leads' },
                    { k: 'contatos_realizados', l: '📞 Contatos' },
                    { k: 'agendamentos', l: '📅 Agendam.' },
                    { k: 'comparecimentos', l: '✅ Comparec.' },
                    { k: 'vendas', l: '🎯 Vendas' },
                    { k: 'valor_vendas', l: '💰 Valor R$' },
                  ].map(f => (
                    <div key={f.k}>
                      <label style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.l}</label>
                      <input type="number" step={f.k === 'valor_vendas' ? '0.01' : '1'} value={form[f.k as keyof typeof form]} onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                        style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 16, outline: 'none', textAlign: 'center', fontWeight: 700 }} />
                    </div>
                  ))}
                </div>
                <textarea value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} placeholder="Observacoes do dia (opcional)..."
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 12, color: '#fff', fontSize: 12, outline: 'none', minHeight: 60, marginBottom: 12, resize: 'vertical' }} />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={salvarMetricas} disabled={salvando}
                    style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}>
                    {salvando ? 'Salvando...' : '💾 Salvar metricas do dia'}
                  </button>
                  {editando && (
                    <button onClick={() => { setEditando(false); load() }}
                      style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ABA ROTINA */}
        {aba === 'rotina' && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>⏰ Rotina diaria do SDR — ordem de prioridade</div>
            <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 16 }}>Comece SEMPRE pelas confirmacoes do dia. Voce tem autonomia para variar entre os blocos depois disso.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROTINA_DIA.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, padding: '14px 16px',
                  background: r.critico ? 'linear-gradient(90deg, #7f1d1d20 0%, #0a0f1a 100%)' : '#0a0f1a',
                  borderRadius: 8, border: `1px solid ${r.critico ? '#ef444450' : '#1f293750'}`,
                  borderLeft: `4px solid ${r.critico ? '#ef4444' : '#f59e0b'}`,
                }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: r.critico ? '#f87171' : '#f59e0b', fontFamily: 'monospace', minWidth: 56 }}>{r.hora}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{r.titulo}</div>
                    {r.desc && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{r.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA ETAPAS — 10 etapas reais do CRM (ACL — Acelera CRM) */}
        {aba === 'etapas' && (
          <div>
            <div style={{ background: '#111827', border: '1px solid #f59e0b30', borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b', marginBottom: 6 }}>🎯 Ordem de prioridade do dia</div>
              <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.6, margin: 0 }}>
                As 10 etapas do CRM (Acelera) tem ordem de prioridade. Trabalhe sempre na sequencia abaixo —
                comece pelas <strong style={{ color: '#f87171' }}>confirmacoes</strong> as 8h antes de qualquer coisa.
                Cada etapa tem fluxo automatico para disparar mensagens. Se a pessoa nao responder no fluxo: <strong>follow-up 1 no mesmo dia, follow-up 2 no dia seguinte</strong>.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[...ETAPAS_ACL].sort((a, b) => a.prioridade - b.prioridade).map(e => (
                <div key={e.num} style={{ background: '#111827', border: `1px solid ${e.cor}30`, borderRadius: 12, padding: 16, borderLeft: `4px solid ${e.cor}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ background: e.cor + '20', color: e.cor, minWidth: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                      #{e.prioridade}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{e.label}</div>
                      <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase' }}>Etapa {e.num} no CRM · prioridade {e.prioridade}</div>
                    </div>
                    {e.prioridade === 1 && (
                      <span style={{ background: '#ef444420', color: '#f87171', padding: '2px 8px', borderRadius: 6, fontSize: 9, fontWeight: 700 }}>🚨 8H</span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5, margin: 0 }}>{e.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA HISTORICO */}
        {aba === 'historico' && (
          <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>📅 Historico do mes — {metricas_mes.length} dias lancados</span>
            </div>
            {metricas_mes.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>📊</div>
                <div>Nenhuma metrica lancada ainda este mes</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Data', 'Leads', 'Contatos', 'Agend.', 'Comparec.', 'Vendas'].map(h => (
                    <th key={h} style={{ color: '#4b5563', fontSize: 9, fontWeight: 600, padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {[...metricas_mes].reverse().map(m => (
                    <tr key={m.data} style={{ borderBottom: '1px solid #1f293730' }}>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                      <td style={{ padding: '10px 14px', color: '#60a5fa', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.leads_recebidos}</td>
                      <td style={{ padding: '10px 14px', color: '#a78bfa', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.contatos_realizados}</td>
                      <td style={{ padding: '10px 14px', color: '#fbbf24', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.agendamentos}</td>
                      <td style={{ padding: '10px 14px', color: '#fb923c', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.comparecimentos}</td>
                      <td style={{ padding: '10px 14px', color: '#4ade80', fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.vendas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
