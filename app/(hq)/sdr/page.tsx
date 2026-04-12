'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import AcaoHoje from '../../components/AcaoHoje'
import CrmAoVivo from '../../components/CrmAoVivo'
import ComissoesPanel from '../../components/ComissoesPanel'
import ComissoesHero from '../../components/ComissoesHero'
import WascriptLive from '../../components/WascriptLive'
import WascriptEnvioRapido from '../../components/WascriptEnvioRapido'
import { useToast } from '../../components/Toast'
import { supabase } from '../../lib/supabase'
import { useDispararEvento } from '../../hooks/useDispararEvento'
import { NumberTicker } from '@/components/ui/number-ticker'
import { FUNIL_ATIVO, RECEITA_METAS, META_ATIVA, TAXAS_REAIS, TAXAS_META, detectarGargalo } from '../../lib/config'

type Acumulado = { leads: number; contatos: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number }
type MetasSet = { leads: number; contatos: number; agendamentos: number; comparecimentos: number; vendas: number }

interface Metricas {
  periodo?: string
  range?: { start: string; end: string }
  metricas_dia: { data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number; observacao: string | null } | null
  metricas_mes: Array<{ data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number }>
  metricas_periodo?: Array<{ data: string; leads_recebidos: number; contatos_realizados: number; agendamentos: number; comparecimentos: number; vendas: number; valor_vendas?: number }>
  acumulado: Acumulado
  acumulado_mes?: Acumulado
  taxas: { contato: number; agendamento: number; comparecimento: number; conversao: number }
  metas: MetasSet
  metas_mensais?: MetasSet
  metas_diarias?: MetasSet
  metas_semanais?: MetasSet
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
  const { toast } = useToast()
  const { disparar } = useDispararEvento()
  const [data, setData] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState<'rotina' | 'etapas' | 'historico' | 'overview'>('rotina')
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
    try {
      const novosAgend = Number(form.agendamentos) || 0
      const antesAgend = Number(data?.metricas_dia?.agendamentos) || 0
      const delta = Math.max(0, novosAgend - antesAgend)

      const r = await fetch('/api/sdr/metricas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, sdr_email: userEmail }),
      })
      if (!r.ok) throw new Error('falha')
      toast('success', '✅ Métricas do dia salvas com sucesso!')

      // Disparar um evento por novo agendamento registrado na sessao
      for (let i = 0; i < delta; i++) {
        disparar({
          tipo: 'agendamento',
          titulo: 'Agendamento Feito!',
          mensagem: 'Trindade marcou mais uma reunião na agenda',
          usuario_nome: 'Trindade',
        })
      }

      setEditando(false)
      load()
    } catch {
      toast('error', 'Erro ao salvar metricas')
    }
    setSalvando(false)
  }

  if (loading || !data) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: 32 }}>
          <div style={{ height: 28, width: 200, background: '#111827', borderRadius: 8, animation: 'pulse 1.5s infinite', marginBottom: 24 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 90, animation: 'pulse 1.5s infinite' }} />)}
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      </div>
    )
  }

  const { acumulado, taxas, metas, metricas_mes } = data

  // KPI DESTAQUE (80/20) — cards grandes pros 2 principais (Agendamentos + Reuniões Realizadas)
  const KPIDestaque = ({ icon, label, sublabel, atual, meta, metaMensal }: { icon: string; label: string; sublabel: string; atual: number; meta: number; metaMensal: number }) => {
    const p = pct(atual, meta)
    const cor = corPct(p)
    const acMes = data.acumulado_mes
    const realMes = label.includes('Agendamentos') ? (acMes?.agendamentos || 0) : (acMes?.comparecimentos || 0)
    const pctMes = metaMensal > 0 ? Math.round((realMes / metaMensal) * 100) : 0
    return (
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #111827 100%)', border: `2px solid ${cor}40`, borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <div>
              <div style={{ fontSize: 13, color: '#fff', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>{label}</div>
              <div style={{ fontSize: 9, color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase' }}>⚡ {sublabel}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
          <NumberTicker value={atual} style={{ fontSize: 42, fontWeight: 900, color: cor, fontFamily: 'monospace', lineHeight: 1 }} />
          <span style={{ fontSize: 14, color: '#6b7280', fontFamily: 'monospace' }}>/ {fmt(meta)}</span>
        </div>
        <div style={{ height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden', marginTop: 10 }}>
          <div style={{ height: '100%', background: cor, width: `${Math.min(p, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10 }}>
          <span style={{ color: cor, fontWeight: 700 }}>{p}% do período</span>
          <span style={{ color: '#4b5563' }}>mês: {realMes}/{metaMensal} ({pctMes}%)</span>
        </div>
      </div>
    )
  }

  // KPI com cor SEMPRE dinâmica baseada em % da meta (vermelho → amarelo → verde)
  // param `cor` virou opcional e só é usado como fallback do ícone
  const KPI = ({ icon, label, atual, meta }: { icon: string; label: string; atual: number; meta: number }) => {
    const p = pct(atual, meta)
    const cor = corPct(p) // dinâmica: 0 vermelho, subindo amarelo, alto verde
    return (
      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12 }}>{icon}</span>
          <span style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <NumberTicker value={atual} style={{ fontSize: 22, fontWeight: 800, color: cor, fontFamily: 'monospace' }} />
          <span style={{ fontSize: 11, color: '#4b5563', fontFamily: 'monospace' }}>/ {fmt(meta)}</span>
        </div>
        <div style={{ height: 4, background: '#1f2937', borderRadius: 2, overflow: 'hidden', marginTop: 8 }}>
          <div style={{ height: '100%', background: cor, width: `${Math.min(p, 100)}%`, transition: 'width 0.5s' }} />
        </div>
        <div style={{ fontSize: 9, color: cor, marginTop: 4, fontWeight: 700 }}>{p}% da meta mensal</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', overflowX: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '16px 16px', overflowY: 'auto', overflowX: 'hidden', maxWidth: '100%', minWidth: 0 }}>

        {/* ⚔️ COMISSÃO GIGANTE — pedido do Trindade, no topo da tela */}
        <ComissoesHero role="sdr" nome="Trindade" email="trindade.excalibur@gmail.com" />

        {/* 📲 WhatsApp etiquetas ao vivo (Wascript API) */}
        <WascriptLive />

        {/* 📱 Envio rápido WhatsApp (mensagens padrão + custom) */}
        <WascriptEnvioRapido />

        {/* Card de acao do dia (imperativo) */}
        <AcaoHoje role="sdr" />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>📲 SDR — Prospeccao</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Operacao diaria + metas + rotina + etapas ACL</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/sdr/feedbacks" style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, textDecoration: 'none' }}>📝 Feedbacks</Link>
            <button onClick={load} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
          </div>
        </div>

        {/* Card funil visual integrado — 5 etapas + gargalo */}
        {(() => {
          const garg = detectarGargalo()
          return (
            <div style={{ background: '#111827', border: '1px solid #f59e0b30', borderRadius: 12, padding: '16px 18px', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🎯 Meta {META_ATIVA} — R$ {RECEITA_METAS[META_ATIVA].toLocaleString('pt-BR')}/mês
                  </span>
                  <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 8 }}>
                    {FUNIL_ATIVO.mensal.vendas} vendas · ticket R$ 2.000
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#6b7280' }}>
                  <span>CPL: <span style={{ color: '#fff' }}>R$ 10,70</span></span>
                  <span>CAC: <span style={{ color: '#4ade80' }}>R$ {FUNIL_ATIVO.custos.cac}</span> &lt; R$300 ✓</span>
                  <span>Invest/mês: <span style={{ color: '#fff' }}>R$ {FUNIL_ATIVO.custos.investimento_mensal.toLocaleString('pt-BR')}</span></span>
                </div>
              </div>

              {/* 5 etapas do funil */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 6 }}>
                {[
                  { emoji: '📥', label: 'Leads', mes: FUNIL_ATIVO.mensal.leads, dia: FUNIL_ATIVO.diario.leads },
                  { emoji: '✅', label: 'Qualif.', mes: FUNIL_ATIVO.mensal.qualificados, dia: FUNIL_ATIVO.diario.qualificados },
                  { emoji: '📅', label: 'Agend.', mes: FUNIL_ATIVO.mensal.agendamentos, dia: FUNIL_ATIVO.diario.agendamentos },
                  { emoji: '🤝', label: 'Comparec.', mes: FUNIL_ATIVO.mensal.comparecimentos, dia: FUNIL_ATIVO.diario.comparecimentos },
                  { emoji: '💰', label: 'Vendas', mes: FUNIL_ATIVO.mensal.vendas, dia: FUNIL_ATIVO.diario.vendas },
                ].map((et, i) => (
                  <div key={i} style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8, padding: '10px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18 }}>{et.emoji}</div>
                    <div style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>{et.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'monospace', marginTop: 3 }}>{et.mes}<span style={{ fontSize: 9, color: '#6b7280', fontWeight: 400 }}>/mês</span></div>
                    <div style={{ fontSize: 9, color: '#f59e0b', fontWeight: 700, marginTop: 1 }}>{et.dia}/dia</div>
                  </div>
                ))}
              </div>

              {/* Gargalo detectado */}
              {garg && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: '#ea580c20', border: '1px solid #ea580c40', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                  <span style={{ color: '#fb923c' }}>⚠️ Gargalo: {garg.etapa}</span>
                  <span style={{ color: '#6b7280' }}>
                    real {(garg.real * 100).toFixed(0)}% vs meta {(garg.meta * 100).toFixed(0)}%
                    — cada 1% = +{Math.round(FUNIL_ATIVO.mensal.agendamentos * 0.01)} agendamentos/mês
                  </span>
                </div>
              )}
            </div>
          )
        })()}

        {/* Contexto do período + meta visível */}
        {(() => {
          const hoje = new Date()
          const ctxLabel = periodo === 'hoje'
            ? `📅 Hoje, ${hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`
            : periodo === 'semana'
              ? `📅 Esta semana`
              : periodo === 'mes'
                ? `📅 ${hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`
                : `📅 Período personalizado`
          return (
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>{ctxLabel}</span>
              <span style={{ color: '#4b5563' }}>—</span>
              <span style={{ color: '#6b7280' }}>meta:</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{metas.agendamentos} agendamentos</span>
              <span style={{ color: '#4b5563' }}>·</span>
              <span style={{ color: '#fbbf24', fontWeight: 700 }}>{metas.comparecimentos} reuniões realizadas</span>
              <span style={{ color: '#4b5563' }}>·</span>
              <span style={{ color: '#6b7280' }}>{metas.leads} leads · {metas.contatos} contatos · {metas.vendas} vendas</span>
            </div>
          )
        })()}

        {/* Card fixo "Como está seu dia hoje" — sempre visível mesmo filtrando outro período */}
        {(() => {
          const ac = data.acumulado_mes || acumulado
          const metaDia = data.metas_diarias || { leads: 14, contatos: 5, agendamentos: 2, comparecimentos: 1, vendas: 1 }
          // Dados de HOJE vêm de metricas_dia quando existe (aggregated daily row)
          const hoje = data.metricas_dia
          const hojeLeads = hoje?.leads_recebidos || 0
          const hojeAgend = hoje?.agendamentos || 0
          const hojeComp = hoje?.comparecimentos || 0
          const pctDia = metaDia.agendamentos > 0 ? Math.round((hojeAgend / metaDia.agendamentos) * 100) : 0
          const emoji = pctDia >= 100 ? '🔥' : pctDia >= 70 ? '💪' : pctDia > 0 ? '📈' : '⚡'
          const corPctDia = pctDia >= 100 ? '#4ade80' : pctDia >= 70 ? '#fbbf24' : pctDia > 0 ? '#fb923c' : '#f87171'
          return (
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ fontSize: 28 }}>{emoji}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Hoje até agora</div>
                <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, marginTop: 2 }}>
                  {hojeAgend} agendamentos <span style={{ color: '#6b7280', fontWeight: 400 }}>/ meta {metaDia.agendamentos}</span>
                  <span style={{ color: '#4b5563', margin: '0 8px' }}>·</span>
                  {hojeComp} reuniões <span style={{ color: '#6b7280', fontWeight: 400 }}>/ meta {metaDia.comparecimentos}</span>
                  <span style={{ color: '#4b5563', margin: '0 8px' }}>·</span>
                  {hojeLeads} leads <span style={{ color: '#6b7280', fontWeight: 400 }}>/ meta {metaDia.leads}</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: corPctDia, fontFamily: 'monospace', lineHeight: 1 }}>{pctDia}%</div>
                <div style={{ fontSize: 9, color: '#4b5563', marginTop: 2 }}>da meta diária</div>
              </div>
            </div>
          )
        })()}

        {/* CRM ao vivo (Waseller) */}
        <div style={{ marginBottom: 14 }}>
          <CrmAoVivo />
        </div>

        {/* Comissões do SDR */}
        <div style={{ marginBottom: 14 }}>
          <ComissoesPanel visao="sdr" />
        </div>

        {/* Filtros de periodo — com meta no label */}
        {(() => {
          const md = data.metas_diarias
          const ms = data.metas_semanais
          const mm = data.metas_mensais
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginLeft: 8, marginRight: 4 }}>Periodo:</span>
              {[
                { k: 'hoje' as const, l: 'Hoje', sub: md ? `meta: ${md.agendamentos} agend.` : '' },
                { k: 'semana' as const, l: 'Semana', sub: ms ? `meta: ${ms.agendamentos} agend.` : '' },
                { k: 'mes' as const, l: 'Mês', sub: mm ? `meta: ${mm.agendamentos} agend.` : '' },
                { k: 'personalizado' as const, l: 'Personalizado', sub: '' },
              ].map(p => (
                <button key={p.k} onClick={() => setPeriodo(p.k)}
                  style={{ background: periodo === p.k ? '#f59e0b' : '#1f2937', color: periodo === p.k ? '#030712' : '#9ca3af', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: periodo === p.k ? 700 : 500, minHeight: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 11 }}>{p.l}</span>
                  {p.sub && <span style={{ fontSize: 9, opacity: 0.75 }}>{p.sub}</span>}
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
          )
        })()}

        {/* ⚡ KPI PRINCIPAL — AGENDAMENTOS (foco total 80/20 do Trindade) */}
        {(() => {
          const metaAjust = (data as unknown as { meta_ajustada?: { meta_hoje: number; meta_base: number; deficit_acumulado: number; compensacao_diaria: number; no_ritmo: boolean; projecao_fim_mes: number; dias_restantes: number; mensagem: string } }).meta_ajustada
          const acMes = data.acumulado_mes || acumulado
          const metaMesAgend = data.metas_mensais?.agendamentos || 315
          const metaDiaAgend = data.metas_diarias?.agendamentos || 15
          const pctAgend = metas.agendamentos > 0 ? Math.round((acumulado.agendamentos / metas.agendamentos) * 100) : 0
          const pctMesAgend = metaMesAgend > 0 ? Math.round((acMes.agendamentos / metaMesAgend) * 100) : 0
          const reunEsp = Math.floor(acumulado.agendamentos * 0.696)
          const noshowEsp = Math.ceil(acumulado.agendamentos * 0.304)
          const vendasEsp = Math.floor(acumulado.agendamentos * 0.696 * 0.30)
          const corPctP = pctAgend >= 100 ? '#22c55e' : pctAgend >= 80 ? '#4ade80' : pctAgend >= 50 ? '#fbbf24' : pctAgend > 0 ? '#fb923c' : '#f87171'
          return (
            <div style={{ background: 'linear-gradient(135deg, #1c1205 0%, #0a0a14 100%)', border: '2px solid #f59e0b60', borderRadius: 16, padding: 20, marginBottom: 12, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 12, right: 12, background: '#f59e0b20', color: '#fbbf24', padding: '3px 10px', borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: 0.5 }}>
                ⚡ META PRINCIPAL
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                  <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 }}>📅 Agendamentos</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
                    <NumberTicker value={acumulado.agendamentos} style={{ fontSize: 54, fontWeight: 900, color: '#fff', fontFamily: 'monospace', lineHeight: 1 }} />
                    <span style={{ fontSize: 14, color: '#6b7280' }}>/ {metas.agendamentos}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    meta {periodo === 'hoje' ? 'de hoje' : periodo === 'semana' ? 'da semana' : 'do mês'}:
                    <span style={{ color: '#fbbf24', fontWeight: 800, marginLeft: 4 }}>{metaAjust?.meta_hoje ?? metas.agendamentos}</span>
                    {metaAjust && metaAjust.compensacao_diaria > 0 && (
                      <span style={{ color: '#fb923c', fontSize: 10, marginLeft: 6 }}>
                        (base {metaAjust.meta_base} + {metaAjust.compensacao_diaria} reposição)
                      </span>
                    )}
                  </div>
                </div>

                {/* Funil rápido */}
                <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', padding: '4px 0', borderBottom: '1px solid #1f2937' }}>
                    <span>→ Reuniões esperadas (×69.6%)</span>
                    <span style={{ color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>~{reunEsp}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', padding: '4px 0', borderBottom: '1px solid #1f2937' }}>
                    <span>→ No-shows esperados (×30.4%)</span>
                    <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>~{noshowEsp}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af', padding: '4px 0' }}>
                    <span>→ Vendas esperadas (×30%)</span>
                    <span style={{ color: '#4ade80', fontFamily: 'monospace', fontWeight: 700 }}>~{vendasEsp}</span>
                  </div>
                </div>
              </div>

              {/* Barra de progresso */}
              <div style={{ position: 'relative', height: 10, background: '#1f2937', borderRadius: 5, overflow: 'hidden', marginTop: 14 }}>
                <div style={{ height: '100%', width: `${Math.min(pctAgend, 100)}%`, background: corPctP, transition: 'width 0.5s', borderRadius: 5 }} />
                <div style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: 'rgba(255,255,255,0.3)', left: '80%' }} title="Meta mínima 80%" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10 }}>
                <span style={{ color: corPctP, fontWeight: 700 }}>{pctAgend}% da meta do período</span>
                <span style={{ color: '#4b5563' }}>mês: {acMes.agendamentos}/{metaMesAgend} ({pctMesAgend}%)</span>
              </div>

              {/* Mensagem de compensação */}
              {metaAjust && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: metaAjust.no_ritmo ? '#14532d20' : '#ea580c20', border: `1px solid ${metaAjust.no_ritmo ? '#4ade8040' : '#ea580c40'}`, borderRadius: 8, fontSize: 11, color: metaAjust.no_ritmo ? '#86efac' : '#fed7aa' }}>
                  {metaAjust.mensagem}
                </div>
              )}

              {/* Pace / projeção (só se filtro = mes) */}
              {periodo === 'mes' && metaAjust && (
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 8 }}>
                  <span style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>📈 Projeção</span>
                  <div style={{ flex: 1, height: 5, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min((metaAjust.projecao_fim_mes / metaMesAgend) * 100, 100)}%`, background: metaAjust.projecao_fim_mes >= metaMesAgend ? '#4ade80' : '#fbbf24', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: metaAjust.projecao_fim_mes >= metaMesAgend ? '#4ade80' : '#fbbf24', fontFamily: 'monospace' }}>{metaAjust.projecao_fim_mes}</div>
                    <div style={{ fontSize: 9, color: '#4b5563' }}>proj. fim do mês / meta {metaMesAgend}</div>
                  </div>
                </div>
              )}
              {/* usar metaDiaAgend pra evitar unused */}
              <div style={{ display: 'none' }}>{metaDiaAgend}</div>
            </div>
          )
        })()}

        {/* No-show tracker — faz parte do processo */}
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>
              📊 No-show do período — <span style={{ color: '#6b7280' }}>faz parte do processo</span>
            </span>
            <span style={{ fontSize: 10, color: '#4b5563' }}>meta esperada: ~30.4% de no-show (comp. 69.6%)</span>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{Math.max(0, acumulado.agendamentos - acumulado.comparecimentos)}</div>
              <div style={{ fontSize: 9, color: '#6b7280' }}>não compareceram</div>
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#4ade80', fontFamily: 'monospace' }}>{acumulado.comparecimentos}</div>
              <div style={{ fontSize: 9, color: '#6b7280' }}>compareceram ✓</div>
            </div>
            <div>
              {(() => {
                const tx = acumulado.agendamentos > 0 ? (acumulado.comparecimentos / acumulado.agendamentos) * 100 : 0
                const cor = tx >= 69.6 ? '#4ade80' : tx >= 50 ? '#fbbf24' : '#f87171'
                return (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800, color: cor, fontFamily: 'monospace' }}>{tx.toFixed(0)}%</div>
                    <div style={{ fontSize: 9, color: '#6b7280' }}>taxa real (meta 69.6%)</div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>

        {/* KPIs secundários — Leads, Qualificados, Reuniões, Vendas + Valor */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 20 }}>
          <KPI icon="📥" label="Leads" atual={acumulado.leads} meta={metas.leads} />
          <KPI icon="✅" label="Qualificados" atual={acumulado.contatos} meta={metas.contatos} />
          <KPI icon="🤝" label="Reuniões" atual={acumulado.comparecimentos} meta={metas.comparecimentos} />
          <KPI icon="💰" label="Vendas" atual={acumulado.vendas} meta={metas.vendas} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
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
            { key: 'rotina' as const, label: '⏰ Rotina' },
            { key: 'etapas' as const, label: '🎯 Etapas ACL' },
            { key: 'historico' as const, label: '📅 Historico' },
            { key: 'overview' as const, label: '📊 Lancar dia' },
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 12 }}>
                  {[
                    { l: '📥 Leads', v: data.metricas_dia.leads_recebidos, formato: 'num' },
                    { l: '💬 Contatos', v: data.metricas_dia.contatos_realizados, formato: 'num' },
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3">
                  {[
                    { k: 'leads_recebidos', l: '📥 Leads', aria: 'Leads recebidos' },
                    { k: 'contatos_realizados', l: '💬 Contatos', aria: 'Contatos realizados' },
                    { k: 'agendamentos', l: '📅 Agendam.', aria: 'Agendamentos' },
                    { k: 'comparecimentos', l: '✅ Comparec.', aria: 'Comparecimentos' },
                    { k: 'vendas', l: '🎯 Vendas', aria: 'Vendas fechadas' },
                    { k: 'valor_vendas', l: '💰 Valor R$', aria: 'Valor total em reais' },
                  ].map(f => (
                    <div key={f.k}>
                      <label htmlFor={`input-${f.k}`} style={{ fontSize: 9, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: 4 }}>{f.l}</label>
                      <input
                        id={`input-${f.k}`}
                        type="number"
                        min="0"
                        step={f.k === 'valor_vendas' ? '0.01' : '1'}
                        placeholder="0"
                        aria-label={f.aria}
                        value={form[f.k as keyof typeof form]}
                        onChange={e => setForm({ ...form, [f.k]: e.target.value })}
                        style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 16, outline: 'none', textAlign: 'center', fontWeight: 700 }}
                      />
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
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
                  {[...metricas_mes].reverse().map(m => {
                    // Cores dinâmicas por dia: compara valor diário vs meta diária
                    const md = data.metas_diarias
                    const metaLeadsDia = md?.leads || 14
                    const metaContatosDia = md?.contatos || 5
                    const metaAgendDia = md?.agendamentos || 2
                    const metaCompDia = md?.comparecimentos || 1
                    const metaVendasDia = md?.vendas || 1
                    const corLead = corPct(pct(m.leads_recebidos, metaLeadsDia))
                    const corCont = corPct(pct(m.contatos_realizados, metaContatosDia))
                    const corAg = corPct(pct(m.agendamentos, metaAgendDia))
                    const corComp = corPct(pct(m.comparecimentos, metaCompDia))
                    const corVendas = corPct(pct(m.vendas, metaVendasDia))
                    return (
                      <tr key={m.data} style={{ borderBottom: '1px solid #1f293730' }}>
                        <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, fontFamily: 'monospace' }}>{new Date(m.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td style={{ padding: '10px 14px', color: corLead, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.leads_recebidos}</td>
                        <td style={{ padding: '10px 14px', color: corCont, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.contatos_realizados}</td>
                        <td style={{ padding: '10px 14px', color: corAg, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.agendamentos}</td>
                        <td style={{ padding: '10px 14px', color: corComp, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.comparecimentos}</td>
                        <td style={{ padding: '10px 14px', color: corVendas, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{m.vendas}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
