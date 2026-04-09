'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type FunilEtapa = { label: string; valor: number; cor: string }

function fmt(v: number) { return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 }) }

export default function DashboardHQ() {
  const [loading, setLoading] = useState(true)
  const [comercial, setComercial] = useState({ totalLeadsTrafego: 0, leadsSDRAtivos: 0, reunioes: 0, fechamentos: 0, mrrTotal: 0 })
  const [saude, setSaude] = useState({ clinicasAtivas: 0, emRisco: 0, alertasCriticos: 0, healthScoreMedio: 0 })
  const [financeiro, setFinanceiro] = useState({ mrrTotal: 0, investTrafego: 0, cplMedio: 0 })
  const [funil, setFunil] = useState<FunilEtapa[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const d = await (await fetch('/api/dashboard')).json()
      setComercial(d.comercial || comercial)
      setSaude(d.saude || saude)
      setFinanceiro(d.financeiro || financeiro)
      setFunil(d.funil || [])
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const kpiCard = (label: string, valor: string | number, cor: string, sub?: string) => (
    <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: cor }}>{valor}</div>
      {sub && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>{sub}</div>}
    </div>
  )

  const maxFunil = Math.max(...funil.map(f => f.valor), 1)

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Dashboard Executivo</h1>
          <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Visao consolidada — dados reais de todos os setores</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando...</div>
        ) : (
          <>
            {/* Funil Comercial */}
            <div style={{ marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Funil Comercial</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {kpiCard('Leads Trafego', comercial.totalLeadsTrafego, '#3b82f6', 'gerados pelas campanhas')}
              {kpiCard('Leads SDR', comercial.leadsSDRAtivos, '#f59e0b', 'em prospeccao ativa')}
              {kpiCard('Reunioes', comercial.reunioes, '#a855f7', 'realizadas + agendadas')}
              {kpiCard('Fechamentos', comercial.fechamentos, '#22c55e', `MRR ${fmt(comercial.mrrTotal)}`)}
            </div>

            {/* Saúde CS */}
            <div style={{ marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saude da Carteira CS</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {kpiCard('Clinicas ativas', saude.clinicasAtivas, '#06b6d4')}
              {kpiCard('Em risco', saude.emRisco, saude.emRisco > 0 ? '#ef4444' : '#22c55e')}
              {kpiCard('Alertas criticos', saude.alertasCriticos, saude.alertasCriticos > 0 ? '#ef4444' : '#22c55e')}
              {kpiCard('Health Score medio', saude.healthScoreMedio + '%', saude.healthScoreMedio >= 70 ? '#22c55e' : saude.healthScoreMedio >= 50 ? '#f59e0b' : '#ef4444')}
            </div>

            {/* Financeiro */}
            <div style={{ marginBottom: 8 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Financeiro</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 24 }}>
              {kpiCard('MRR Total', fmt(financeiro.mrrTotal), '#22c55e', 'receita recorrente mensal')}
              {kpiCard('Investimento Trafego', fmt(financeiro.investTrafego), '#ef4444', 'total em campanhas')}
              {kpiCard('CPL Medio', fmt(financeiro.cplMedio), financeiro.cplMedio > 0 && financeiro.cplMedio <= 100 ? '#22c55e' : '#f59e0b', 'custo por lead')}
            </div>

            {/* Funil Visual */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 16 }}>Funil Completo — Trafego → Cliente Ativo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {funil.map((etapa, i) => {
                  const pct = Math.max(5, (etapa.valor / maxFunil) * 100)
                  const topo = funil[0]?.valor || 0
                  // Conversão desde o topo do funil (tráfego)
                  const convFromTop = i > 0 && topo > 0
                    ? Math.round((etapa.valor / topo) * 100)
                    : null
                  // Conversão entre etapas adjacentes
                  const convAdj = i > 0 && funil[i - 1].valor > 0
                    ? Math.round((etapa.valor / funil[i - 1].valor) * 100)
                    : null
                  return (
                    <div key={etapa.label}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: '#9ca3af', width: 110, textAlign: 'right' }}>{etapa.label}</span>
                        <div style={{ flex: 1, height: 28, background: '#252535', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: etapa.cor, borderRadius: 6, transition: 'width 0.5s', display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{etapa.valor}</span>
                          </div>
                        </div>
                        {convFromTop !== null && (
                          <span style={{ fontSize: 11, color: convFromTop >= 10 ? '#22c55e' : convFromTop >= 3 ? '#f59e0b' : '#ef4444', width: 80, textAlign: 'right', fontWeight: 600 }}>
                            {convFromTop}%
                            {convAdj !== null && <span style={{ color: '#4b5563', fontWeight: 400 }}> ({convAdj}%)</span>}
                          </span>
                        )}
                      </div>
                      {i < funil.length - 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 122 }}>
                          <span style={{ fontSize: 10, color: '#374151' }}>↓</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 12, fontSize: 10, color: '#4b5563' }}>
                % principal = conversao desde trafego · (%) = conversao da etapa anterior
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
