'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import KPICard from '../../components/KPICard'
import MetaBarComponent from '../../components/MetaBar'
import { fmtRealCurto as fmt, pct } from '../../lib/utils'
function statusCor(val: number, meta: number, invert?: boolean) {
  const r = meta > 0 ? val / meta : 0
  if (invert) return r <= 0.1 ? '#4ade80' : r <= 0.3 ? '#fbbf24' : '#f87171'
  return r >= 0.8 ? '#4ade80' : r >= 0.5 ? '#fbbf24' : '#f87171'
}

type FinResumo = { caixa: number; recebido: number; total_receber: number; pago: number; total_pagar: number; tx_pagamento: number; tx_atraso: number; inadimplentes: { nome: string; valor: number }[] }
type CSData = { clinicas: { id: string; nome: string }[]; jornada: { clinica_id: string; etapa: string; dias_na_plataforma: number }[]; adocao: { clinica_id: string; score: number }[]; alertas: { id: string; clinica_id: string }[] }
type SDRStats = { total_leads: number; leads_hoje: number; agendamentos: number; conversoes: number; meta_leads: number; meta_reunioes: number; meta_conversoes: number }
type ComStats = { total_propostas: number; reunioes: number; fechamentos: number; mrr_gerado: number; meta_reunioes: number; meta_fechamentos: number; meta_mrr: number; esfriando: { nome: string; dias: number }[] }

export default function VisaoGeral() {
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')
  const [fin, setFin] = useState<FinResumo | null>(null)
  const [cs, setCs] = useState<CSData | null>(null)
  const [sdr, setSdr] = useState<SDRStats | null>(null)
  const [com, setCom] = useState<ComStats | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const q = `mes=${now.getMonth() + 1}&ano=${now.getFullYear()}`
    const [fRes, cRes, sRes, coRes] = await Promise.all([
      fetch(`/api/financeiro/resumo?${q}`).then(r => r.json()).catch(() => null),
      fetch('/api/cs/cockpit').then(r => r.json()).catch(() => null),
      fetch('/api/sdr/stats').then(r => r.json()).catch(() => null),
      fetch('/api/comercial/stats').then(r => r.json()).catch(() => null),
    ])
    setFin(fRes); setCs(cRes); setSdr(sRes); setCom(coRes)
    setLastUpdate(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => { load(); const iv = setInterval(load, 120000); return () => clearInterval(iv) }, [load])

  const csClinicas = cs?.clinicas?.length || 0
  const csAlertasCount = cs?.alertas?.length || 0
  const csScores = (cs?.clinicas || []).map(c => {
    const a = (cs?.adocao || []).find(x => x.clinica_id === c.id)
    return a?.score || 0
  })
  const csScoreMedio = csScores.length > 0 ? Math.round(csScores.reduce((a, b) => a + b, 0) / csScores.length) : 0
  const csRisco = csScores.filter(s => s < 60).length

  /* ── Card ── */
  // Wrapper para manter API antiga compativel
  const Card = ({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor: string }) => (
    <KPICard label={label} valor={valor} sub={sub} cor={cor} size="sm" />
  )

  // Usar MetaBar global
  const MetaBar = MetaBarComponent

  /* ── Section ── */
  const Section = ({ icon, title, href, children }: { icon: string; title: string; href: string; children: React.ReactNode }) => (
    <div style={{ background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1f2937' }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{icon} {title}</span>
        <Link href={href} style={{ fontSize: 10, color: '#f59e0b', textDecoration: 'none', fontWeight: 600 }}>Ver detalhes →</Link>
      </div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  )

  /* ── Skeleton ── */
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: '24px 32px' }}>
          <div style={{ marginBottom: 24 }}><div style={{ height: 28, width: 200, background: '#111827', borderRadius: 8, animation: 'pulse 1.5s infinite' }} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 200, animation: 'pulse 1.5s infinite' }} />)}
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto', maxWidth: 1200 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Visao Geral</h1>
            <p style={{ color: '#4b5563', fontSize: 12, margin: '4px 0 0' }}>Painel consolidado de todos os setores</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 10, color: '#4b5563' }}>Atualizado as {lastUpdate}</span>
            <button onClick={load} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
          </div>
        </div>

        {/* Grid 2 colunas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>

          {/* ══ FINANCEIRO ══ */}
          <Section icon="💰" title="Financeiro" href="/operacao/financeiro">
            {fin ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                  <Card label="A Receber" valor={fmt(fin.total_receber)} cor="#60a5fa" />
                  <Card label="Recebido" valor={fmt(fin.recebido)} sub={`${fin.tx_pagamento}%`} cor="#4ade80" />
                  <Card label="Caixa" valor={fmt(fin.caixa)} cor={fin.caixa >= 0 ? '#4ade80' : '#f87171'} />
                </div>
                <MetaBar label="Recebimentos" atual={fin.recebido} meta={fin.total_receber} cor="#22c55e" />
                <MetaBar label="Pagamentos" atual={fin.pago} meta={fin.total_pagar} cor="#ef4444" />
                {fin.inadimplentes.length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700, marginBottom: 4 }}>🔴 {fin.inadimplentes.length} inadimplente{fin.inadimplentes.length > 1 ? 's' : ''}</div>
                    {fin.inadimplentes.slice(0, 3).map((i, idx) => (
                      <div key={idx} style={{ fontSize: 10, color: '#9ca3af', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{i.nome}</span><span style={{ color: '#f87171', fontFamily: 'monospace' }}>{fmt(i.valor)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: 20 }}>Sem dados</div>}
          </Section>

          {/* ══ CUSTOMER SUCCESS ══ */}
          <Section icon="🎯" title="Customer Success" href="/cs">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
              <Card label="Clinicas ativas" valor={String(csClinicas)} cor="#60a5fa" />
              <Card label="Health Score medio" valor={`${csScoreMedio}%`} cor={csScoreMedio >= 70 ? '#4ade80' : csScoreMedio >= 50 ? '#fbbf24' : '#f87171'} />
              <Card label="Em risco" valor={String(csRisco)} cor={csRisco > 0 ? '#f87171' : '#4ade80'} />
              <Card label="Alertas ativos" valor={String(csAlertasCount)} cor={csAlertasCount > 0 ? '#fbbf24' : '#4ade80'} />
            </div>
            {csRisco > 0 && (
              <div style={{ padding: '8px 10px', background: '#ef444410', border: '1px solid #ef444430', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#f87171', fontWeight: 700 }}>⚠️ {csRisco} clinica{csRisco > 1 ? 's' : ''} com score abaixo de 60</div>
              </div>
            )}
          </Section>

          {/* ══ SDR ══ */}
          <Section icon="📞" title="SDR — Prospeccao" href="/sdr">
            {sdr ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                  <Card label="Leads total" valor={String(sdr.total_leads)} sub={`${sdr.leads_hoje} hoje`} cor="#60a5fa" />
                  <Card label="Agendamentos" valor={String(sdr.agendamentos)} cor="#fbbf24" />
                </div>
                <MetaBar label="Leads" atual={sdr.total_leads} meta={sdr.meta_leads} cor={statusCor(sdr.total_leads, sdr.meta_leads)} />
                <MetaBar label="Reunioes" atual={sdr.conversoes} meta={sdr.meta_reunioes} cor={statusCor(sdr.conversoes, sdr.meta_reunioes)} />
                <MetaBar label="Conversoes" atual={sdr.conversoes} meta={sdr.meta_conversoes} cor={statusCor(sdr.conversoes, sdr.meta_conversoes)} />
              </>
            ) : <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: 20 }}>Sem dados</div>}
          </Section>

          {/* ══ COMERCIAL ══ */}
          <Section icon="💼" title="Comercial — Closer" href="/comercial">
            {com ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12 }}>
                  <Card label="Propostas" valor={String(com.total_propostas)} cor="#60a5fa" />
                  <Card label="MRR gerado" valor={fmt(com.mrr_gerado)} cor="#4ade80" />
                </div>
                <MetaBar label="Reunioes" atual={com.reunioes} meta={com.meta_reunioes} cor={statusCor(com.reunioes, com.meta_reunioes)} />
                <MetaBar label="Fechamentos" atual={com.fechamentos} meta={com.meta_fechamentos} cor={statusCor(com.fechamentos, com.meta_fechamentos)} />
                <MetaBar label="MRR" atual={com.mrr_gerado} meta={com.meta_mrr} cor={statusCor(com.mrr_gerado, com.meta_mrr)} />
                {com.esfriando.length > 0 && (
                  <div style={{ marginTop: 8, padding: '8px 10px', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, marginBottom: 4 }}>⏳ {com.esfriando.length} proposta{com.esfriando.length > 1 ? 's' : ''} esfriando</div>
                    {com.esfriando.slice(0, 3).map((p, idx) => (
                      <div key={idx} style={{ fontSize: 10, color: '#9ca3af' }}>{p.nome} — {p.dias} dias sem movimentacao</div>
                    ))}
                  </div>
                )}
              </>
            ) : <div style={{ color: '#4b5563', fontSize: 12, textAlign: 'center', padding: 20 }}>Sem dados</div>}
          </Section>

          {/* ══ TRAFEGO ══ */}
          <Section icon="📣" title="Trafego" href="/trafego">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <Card label="Leads captados" valor={String(sdr?.total_leads || 0)} cor="#60a5fa" />
              <Card label="CPL estimado" valor={sdr && sdr.total_leads > 0 ? fmt(Math.round((fin?.total_pagar || 0) * 0.3 / sdr.total_leads)) : 'R$ 0'} sub="estimativa" cor="#fbbf24" />
            </div>
          </Section>

          {/* ══ OPERACAO ══ */}
          <Section icon="⚙️" title="Operacao" href="/onboarding">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <Card label="Colaboradores" valor="-" sub="ver detalhes" cor="#9ca3af" />
              <Card label="Tarefas CS" valor="-" sub="ver calendario" cor="#9ca3af" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <Link href="/operacao/colaboradores" style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#f59e0b', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '8px 0', textDecoration: 'none', fontWeight: 600 }}>👥 Colaboradores</Link>
              <Link href="/cs/calendario" style={{ flex: 1, textAlign: 'center', fontSize: 10, color: '#f59e0b', background: '#f59e0b10', border: '1px solid #f59e0b30', borderRadius: 8, padding: '8px 0', textDecoration: 'none', fontWeight: 600 }}>📅 Calendario CS</Link>
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}
