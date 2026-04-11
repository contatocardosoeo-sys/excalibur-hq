'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../components/Sidebar'
import { etapaLabel } from '../../lib/etapas'
import { BlurFade } from '@/components/ui/blur-fade'
import { AnimatedShinyText } from '@/components/ui/animated-shiny-text'

type Cliente = {
  id: string; nome: string; data_inicio: string
  dias: number; faseMacro: string; etapa: string
  avisoPrevio: boolean
  score: number; classificacao: string
  status: 'saudavel' | 'atencao' | 'risco'
  totalAlertas: number; alertasCriticos: number
  tarefasAtrasadas: number; gargalo: string
  ultimaInteracao: string | null; proximaAcao: string; progresso: number
}

type KPIs = {
  total: number; onboarding: number; adocao: number
  consolidacao: number; retencao: number; embarcados: number; avisoPrevio: number
  emRisco: number; atrasados: number; semInteracao: number; alertasCriticos: number
}

const STATUS_COR = {
  saudavel: { borda: '#22c55e', bg: '#22c55e10', texto: '#22c55e', label: 'Saudavel' },
  atencao:  { borda: '#f59e0b', bg: '#f59e0b10', texto: '#f59e0b', label: 'Atencao' },
  risco:    { borda: '#ef4444', bg: '#ef444410', texto: '#ef4444', label: 'Risco' },
}

const FASES = [
  { key: 'D0-D7',   label: 'D0 → D7',   sub: 'Setup / Onboarding',     cor: '#3b82f6' },
  { key: 'D7-D15',  label: 'D7 → D15',  sub: 'Inicio da adocao',       cor: '#f59e0b' },
  { key: 'D15-D30', label: 'D15 → D30', sub: 'Consolidacao / Valor',   cor: '#a855f7' },
  { key: 'D30+',    label: 'D30+',      sub: 'Retencao',               cor: '#22c55e' },
  { key: 'D90+',    label: '🚀 D90+',   sub: 'Embarcado / Customer Mkt', cor: '#06b6d4' },
]

const GARGALO_COR: Record<string, string> = {
  'Marketing': '#ef4444', 'Atendimento / Comercial': '#f97316', 'Conversão': '#eab308',
  'Financeira': '#8b5cf6', 'Adoção / Execução': '#06b6d4', 'Sem gargalo identificado': '#374151',
}

export default function JornadaPage() {
  const router = useRouter()
  const [carteira, setCarteira] = useState<Cliente[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [trafegoMap, setTrafegoMap] = useState<Record<string, string>>({})
  const [filtroFase, setFiltroFase] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroAtrasado, setFiltroAtrasado] = useState(false)
  const [filtroAlerta, setFiltroAlerta] = useState(false)
  const [busca, setBusca] = useState('')
  const [kpiFiltro, setKpiFiltro] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const [res, rTraf] = await Promise.all([
      fetch('/api/jornada'),
      fetch('/api/trafego-clientes/clinicas').catch(() => null),
    ])
    const d = await res.json()
    setCarteira(d.carteira || [])
    setKpis(d.kpis || null)
    try {
      if (rTraf) {
        const dt = await rTraf.json()
        const map: Record<string, string> = {}
        ;(dt.clinicas || []).forEach((c: { id: string; status_trafego: string }) => { map[c.id] = c.status_trafego })
        setTrafegoMap(map)
      }
    } catch { /* */ }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = carteira.filter(c => {
    if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroFase && c.faseMacro !== filtroFase) return false
    if (filtroStatus && c.status !== filtroStatus) return false
    if (filtroAtrasado && c.tarefasAtrasadas === 0) return false
    if (filtroAlerta && c.totalAlertas === 0) return false
    if (kpiFiltro === 'risco' && c.status !== 'risco') return false
    if (kpiFiltro === 'atrasados' && c.tarefasAtrasadas === 0) return false
    if (kpiFiltro === 'alertas' && c.alertasCriticos === 0) return false
    if (kpiFiltro === 'onboarding' && c.faseMacro !== 'D0-D7') return false
    if (kpiFiltro === 'semInteracao' && (c.ultimaInteracao || c.dias <= 5)) return false
    if (kpiFiltro === 'avisoPrevio' && !c.avisoPrevio) return false
    if (kpiFiltro === 'embarcados' && c.faseMacro !== 'D90+') return false
    return true
  })

  const limpar = () => { setFiltroFase(''); setFiltroStatus(''); setFiltroAtrasado(false); setFiltroAlerta(false); setBusca(''); setKpiFiltro('') }
  const temFiltro = filtroFase || filtroStatus || filtroAtrasado || filtroAlerta || busca || kpiFiltro

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Jornada do Cliente</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>D0 → Embarcado · 6 etapas · Aviso prévio destacado · Ordenado por prioridade</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {temFiltro && <button onClick={limpar} style={{ background: 'transparent', border: '1px solid #374151', color: '#9ca3af', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12 }}>× Limpar filtros</button>}
            <button onClick={carregar} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 }}>🔄</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando carteira...</div>
        ) : (
          <>
            {/* KPIs */}
            {kpis && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10, marginBottom: 20 }}>
                {[
                  { key: '', label: 'Total ativos', val: kpis.total, cor: '#fff', icon: '🏥' },
                  { key: 'embarcados', label: 'Embarcados', val: kpis.embarcados || 0, cor: '#06b6d4', icon: '🚀' },
                  { key: 'risco', label: 'Em risco', val: kpis.emRisco, cor: '#ef4444', icon: '🔴' },
                  { key: 'avisoPrevio', label: 'Aviso prévio', val: kpis.avisoPrevio || 0, cor: '#dc2626', icon: '⚠️' },
                  { key: 'atrasados', label: 'Atrasados', val: kpis.atrasados, cor: '#f59e0b', icon: '⏱' },
                  { key: 'alertas', label: 'Alertas criticos', val: kpis.alertasCriticos, cor: '#8b5cf6', icon: '🚨' },
                ].map(k => (
                  <button key={k.key || 'total'} onClick={() => k.key && setKpiFiltro(kpiFiltro === k.key ? '' : k.key)}
                    style={{ background: kpiFiltro === k.key ? `${k.cor}15` : '#13131f', border: `1px solid ${kpiFiltro === k.key ? k.cor : '#252535'}`, borderRadius: 10, padding: '14px 16px', cursor: k.key ? 'pointer' : 'default', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{k.icon} {k.label}</div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: k.cor }}>{k.val}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Fases */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10, marginBottom: 20 }}>
              {FASES.map(fase => {
                const cl = carteira.filter(c => c.faseMacro === fase.key)
                const risco = cl.filter(c => c.status === 'risco').length
                const atrasados = cl.filter(c => c.tarefasAtrasadas > 0).length
                const ativo = filtroFase === fase.key
                return (
                  <button key={fase.key} onClick={() => setFiltroFase(ativo ? '' : fase.key)}
                    style={{ background: ativo ? `${fase.cor}15` : '#13131f', border: `1px solid ${ativo ? fase.cor : '#252535'}`, borderRadius: 10, padding: '14px 16px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: fase.cor, marginBottom: 2 }}>{fase.label}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>{fase.sub}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{cl.length}</div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
                      {risco > 0 && <span style={{ color: '#ef4444' }}>🔴 {risco} risco</span>}
                      {atrasados > 0 && <span style={{ color: '#f59e0b' }}>⚠️ {atrasados} atrasado</span>}
                      {risco === 0 && atrasados === 0 && <span style={{ color: '#22c55e' }}>✓ OK</span>}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar clinica..."
                style={{ background: '#13131f', border: '1px solid #252535', color: '#fff', borderRadius: 8, padding: '7px 12px', fontSize: 13, outline: 'none', width: 200 }} />
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                style={{ background: '#13131f', border: '1px solid #252535', color: '#fff', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="">Todos os status</option>
                <option value="saudavel">🟢 Saudavel</option>
                <option value="atencao">🟡 Atencao</option>
                <option value="risco">🔴 Risco</option>
              </select>
              <button onClick={() => setFiltroAtrasado(!filtroAtrasado)}
                style={{ background: filtroAtrasado ? '#f59e0b20' : 'transparent', border: `1px solid ${filtroAtrasado ? '#f59e0b' : '#252535'}`, color: filtroAtrasado ? '#f59e0b' : '#9ca3af', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                ⚠️ So atrasados
              </button>
              <button onClick={() => setFiltroAlerta(!filtroAlerta)}
                style={{ background: filtroAlerta ? '#ef444420' : 'transparent', border: `1px solid ${filtroAlerta ? '#ef4444' : '#252535'}`, color: filtroAlerta ? '#ef4444' : '#9ca3af', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12 }}>
                🚨 Com alertas
              </button>
              <span style={{ color: '#4b5563', fontSize: 12, marginLeft: 4 }}>{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Lista */}
            {filtrados.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '60px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>{carteira.length === 0 ? '🏥' : '🔍'}</div>
                {carteira.length === 0 ? (
                  <><p style={{ margin: 0, fontSize: 15 }}>Nenhuma clinica cadastrada</p><a href="/onboarding/novo" style={{ color: '#f59e0b', fontSize: 13, marginTop: 8, display: 'block' }}>Cadastrar primeira clinica →</a></>
                ) : (
                  <p style={{ margin: 0, fontSize: 14 }}>Nenhum cliente com esses filtros</p>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filtrados.map((c, idx) => {
                  const scor = STATUS_COR[c.status]
                  const gCor = GARGALO_COR[c.gargalo] || '#374151'
                  return (
                    <BlurFade key={c.id} delay={0.05 + Math.min(idx, 10) * 0.02} inView>
                    <div style={{ background: c.avisoPrevio ? '#3f1212' : '#13131f', border: `1px solid ${c.avisoPrevio ? '#dc2626' : scor.borda + '40'}`, borderLeft: `3px solid ${c.avisoPrevio ? '#dc2626' : scor.borda}`, borderRadius: 10, padding: '14px 16px', transition: 'all 0.15s' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                        {/* Nome */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.nome}</span>
                            {(() => {
                              const t = trafegoMap[c.id]
                              const icone = t === 'ativo' ? '🟢' : t === 'pausado' || t === 'problema' ? '🔴' : '⚫'
                              const titulo = t === 'ativo' ? 'Tráfego ativo' : t === 'pausado' ? 'Tráfego pausado' : t === 'problema' ? 'Problema de tráfego' : 'Sem tráfego configurado'
                              return <span title={titulo} style={{ fontSize: 11 }}>{icone}</span>
                            })()}
                            {c.avisoPrevio && (
                              <span title="Cliente em aviso prévio — risco de churn" style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#dc262630', border: '1px solid #dc2626', fontSize: 10, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                ⚠️ Aviso prévio
                              </span>
                            )}
                            {c.faseMacro === 'D90+' && !c.avisoPrevio && (
                              <span title="Cliente embarcado — Customer Marketing" style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#06b6d430', border: '1px solid #06b6d4', fontSize: 10, fontWeight: 800, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                🚀 Embarcado
                              </span>
                            )}
                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: scor.bg, border: `1px solid ${scor.borda}40` }}>
                              <AnimatedShinyText className="!text-[10px] font-semibold" style={{ color: scor.texto }}>
                                {scor.label}
                              </AnimatedShinyText>
                            </span>
                            {c.alertasCriticos > 0 && <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>🚨 {c.alertasCriticos}</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#6b7280' }}>
                            <span>📅 Dia {c.dias}</span><span>•</span><span>{etapaLabel(c.etapa)}</span>
                            {c.tarefasAtrasadas > 0 && <><span>•</span><span style={{ color: '#ef4444' }}>⚠️ {c.tarefasAtrasadas} atrasada{c.tarefasAtrasadas > 1 ? 's' : ''}</span></>}
                          </div>
                        </div>
                        {/* Score */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Health Score</div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: c.score >= 80 ? '#22c55e' : c.score >= 60 ? '#f59e0b' : '#ef4444' }}>{c.score}</div>
                          <div style={{ width: '100%', height: 3, background: '#252535', borderRadius: 2, marginTop: 3 }}><div style={{ height: '100%', width: `${c.score}%`, background: c.score >= 80 ? '#22c55e' : c.score >= 60 ? '#f59e0b' : '#ef4444', borderRadius: 2 }} /></div>
                        </div>
                        {/* Progresso */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Progresso</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{c.progresso}%</div>
                          <div style={{ width: '100%', height: 3, background: '#252535', borderRadius: 2, marginTop: 3 }}><div style={{ height: '100%', width: `${c.progresso}%`, background: '#3b82f6', borderRadius: 2 }} /></div>
                        </div>
                        {/* Gargalo */}
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 4 }}>Gargalo</div>
                          <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: `${gCor}20`, color: gCor, border: `1px solid ${gCor}40`, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {c.gargalo === 'Sem gargalo identificado' ? '✓ OK' : c.gargalo}
                          </span>
                        </div>
                        {/* Proxima */}
                        <div>
                          <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 3 }}>Proxima acao</div>
                          <div style={{ fontSize: 11, color: '#e5e7eb' }}>{c.proximaAcao}</div>
                          {c.ultimaInteracao && <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>Ultima: {c.ultimaInteracao.slice(0, 40)}</div>}
                        </div>
                        {/* Ações */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <button onClick={() => router.push(`/jornada/${c.id}`)}
                            style={{ background: '#f59e0b', color: '#000', border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                            Ver jornada
                          </button>
                          <button onClick={() => router.push('/clientes')}
                            style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>
                            Ver perfil
                          </button>
                        </div>
                      </div>
                    </div>
                    </BlurFade>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
