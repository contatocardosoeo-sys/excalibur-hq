'use client'

import { useEffect, useState, useCallback } from 'react'
import Sidebar from '../../components/Sidebar'

type Clinica = { id: string; nome: string; data_inicio: string; cs_responsavel: string }
type Tarefa = {
  id: string; fase: string; titulo: string; descricao: string
  responsavel: string; prazo_dia: number; data_prazo: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada' | 'bloqueada'
  bloqueante: boolean
}
type JornadaData = {
  clinica: Clinica
  tarefas: Tarefa[]
  fases: Record<string, Tarefa[]>
  jornada: { etapa: string; dias_na_plataforma: number } | null
  progresso: number
  total: number
  concluidas: number
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; bg: string; borda: string }> = {
  pendente:     { label: 'Pendente',      cor: '#6b7280', bg: '#6b728020', borda: '#6b728040' },
  em_andamento: { label: 'Em andamento',  cor: '#f59e0b', bg: '#f59e0b20', borda: '#f59e0b40' },
  concluida:    { label: 'Concluida',     cor: '#22c55e', bg: '#22c55e20', borda: '#22c55e40' },
  atrasada:     { label: 'Atrasada',      cor: '#ef4444', bg: '#ef444420', borda: '#ef444440' },
  bloqueada:    { label: 'Bloqueada',     cor: '#8b5cf6', bg: '#8b5cf620', borda: '#8b5cf640' },
}

const FASES_GRUPOS = [
  { label: 'D1 → D7', cor: '#3b82f6', fases: ['D1-D2', 'D2-D3', 'D3-D7', 'D7'] },
  { label: 'D7 → D15', cor: '#f59e0b', fases: ['D7-D15', 'D15'] },
  { label: 'D15 → D30', cor: '#22c55e', fases: ['D15-D30', 'D30'] },
]

export default function JornadaPage() {
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [clinicaSel, setClinicaSel] = useState('')
  const [dados, setDados] = useState<JornadaData | null>(null)
  const [loading, setLoading] = useState(false)
  const [atualizando, setAtualizando] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/jornada').then(r => r.json()).then(d => {
      setClinicas(d.clinicas || [])
      if (d.clinicas?.length > 0) setClinicaSel(d.clinicas[0].id)
    })
  }, [])

  const carregarJornada = useCallback(async () => {
    if (!clinicaSel) return
    setLoading(true)
    const res = await fetch(`/api/jornada?clinica_id=${clinicaSel}`)
    const d = await res.json()
    setDados(d)
    setLoading(false)
  }, [clinicaSel])

  useEffect(() => { carregarJornada() }, [carregarJornada])

  const atualizarStatus = async (tarefa: Tarefa, novoStatus: Tarefa['status']) => {
    setAtualizando(tarefa.id)
    await fetch('/api/jornada', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tarefa_id: tarefa.id, status: novoStatus, clinica_id: clinicaSel }),
    })
    await carregarJornada()
    setAtualizando(null)
  }

  const diasRestantes = (dataStr: string) => {
    const hoje = new Date()
    const prazo = new Date(dataStr)
    return Math.ceil((prazo.getTime() - hoje.getTime()) / 86400000)
  }

  const tarefasPorGrupo = (fases: string[]) => {
    if (!dados?.tarefas) return []
    return dados.tarefas.filter(t => fases.includes(t.fase))
  }

  const contarPorStatus = (tarefas: Tarefa[], status: string) =>
    tarefas.filter(t => t.status === status).length

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Jornada D1-D30</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Gerencie as tarefas de cada clinica</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 12, color: '#6b7280' }}>Clinica:</label>
            <select value={clinicaSel} onChange={e => setClinicaSel(e.target.value)}
              style={{ background: '#13131f', border: '1px solid #252535', color: '#fff', borderRadius: 8, padding: '8px 14px', fontSize: 14, outline: 'none', cursor: 'pointer', minWidth: 220 }}>
              {clinicas.length === 0 && <option value="">Nenhuma clinica</option>}
              {clinicas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <button onClick={carregarJornada} style={{ background: 'transparent', border: '1px solid #252535', color: '#9ca3af', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>
              🔄
            </button>
          </div>
        </div>

        {clinicas.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
            <p style={{ fontSize: 16, margin: 0 }}>Nenhuma clinica cadastrada ainda</p>
            <p style={{ fontSize: 13, marginTop: 8 }}><a href="/onboarding/novo" style={{ color: '#f59e0b', textDecoration: 'none' }}>Cadastrar primeira clinica →</a></p>
          </div>
        ) : loading ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Carregando jornada...</div>
        ) : dados ? (
          <>
            {/* Info + progresso */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 24, background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{dados.clinica?.nome}</span>
                  <span style={{ fontSize: 11, background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 999, padding: '2px 10px' }}>
                    {dados.jornada?.etapa?.replace(/_/g, ' ') || 'D0'}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Dia {dados.jornada?.dias_na_plataforma || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 8, background: '#252535', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dados.progresso}%`, background: dados.progresso >= 80 ? '#22c55e' : dados.progresso >= 40 ? '#f59e0b' : '#3b82f6', borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700, flexShrink: 0 }}>{dados.progresso}%</span>
                  <span style={{ fontSize: 12, color: '#6b7280', flexShrink: 0 }}>{dados.concluidas}/{dados.total} tarefas</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { label: 'Pendentes', val: contarPorStatus(dados.tarefas, 'pendente'), cor: '#6b7280' },
                  { label: 'Atrasadas', val: contarPorStatus(dados.tarefas, 'atrasada'), cor: '#ef4444' },
                  { label: 'Concluidas', val: dados.concluidas, cor: '#22c55e' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '8px 16px', background: '#09090f', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.cor }}>{s.val}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Kanban 3 colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {FASES_GRUPOS.map(grupo => {
                const tarefas = tarefasPorGrupo(grupo.fases)
                const concl = contarPorStatus(tarefas, 'concluida')
                return (
                  <div key={grupo.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: `${grupo.cor}15`, border: `1px solid ${grupo.cor}30`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: grupo.cor }}>{grupo.label}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{concl}/{tarefas.length} concluidas</div>
                      </div>
                      <div style={{ width: 60, height: 4, background: '#252535', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: tarefas.length > 0 ? `${(concl / tarefas.length) * 100}%` : '0%', background: grupo.cor, borderRadius: 2 }} />
                      </div>
                    </div>

                    {tarefas.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#374151', fontSize: 12, padding: '20px 0' }}>Sem tarefas nesta fase</div>
                    ) : (
                      tarefas.map(tarefa => {
                        const cfg = STATUS_CONFIG[tarefa.status] || STATUS_CONFIG.pendente
                        const dias = diasRestantes(tarefa.data_prazo)
                        const atrasada = dias < 0 && tarefa.status !== 'concluida'
                        const isAtt = atualizando === tarefa.id

                        return (
                          <div key={tarefa.id} style={{
                            background: tarefa.status === 'concluida' ? '#13131f80' : '#13131f',
                            border: `1px solid ${atrasada ? '#ef444440' : tarefa.status === 'concluida' ? '#22c55e20' : tarefa.bloqueante ? '#8b5cf640' : '#252535'}`,
                            borderRadius: 10, padding: '12px 14px',
                            opacity: tarefa.status === 'concluida' ? 0.7 : 1,
                            transition: 'all 0.15s',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                  <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: `${grupo.cor}20`, color: grupo.cor, border: `1px solid ${grupo.cor}30`, fontWeight: 600 }}>{tarefa.fase}</span>
                                  {tarefa.bloqueante && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>🔒 bloqueante</span>}
                                  {atrasada && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>⚠️ atrasada</span>}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: tarefa.status === 'concluida' ? '#6b7280' : '#fff', lineHeight: 1.3, textDecoration: tarefa.status === 'concluida' ? 'line-through' : 'none' }}>
                                  {tarefa.titulo}
                                </div>
                              </div>
                              <button onClick={() => atualizarStatus(tarefa, tarefa.status === 'concluida' ? 'pendente' : 'concluida')} disabled={isAtt}
                                title={tarefa.status === 'concluida' ? 'Marcar pendente' : 'Marcar concluida'}
                                style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: `2px solid ${tarefa.status === 'concluida' ? '#22c55e' : '#374151'}`, background: tarefa.status === 'concluida' ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', transition: 'all 0.15s' }}>
                                {isAtt ? '⏳' : tarefa.status === 'concluida' ? '✓' : ''}
                              </button>
                            </div>

                            {tarefa.descricao && tarefa.status !== 'concluida' && (
                              <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4, marginBottom: 8 }}>
                                {tarefa.descricao.slice(0, 100)}{tarefa.descricao.length > 100 ? '...' : ''}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: cfg.bg, color: cfg.cor, border: `1px solid ${cfg.borda}` }}>{cfg.label}</span>
                                <span style={{ fontSize: 9, color: '#4b5563' }}>{tarefa.responsavel === 'CS' ? '👤 CS' : '🏥 Clinica'}</span>
                              </div>
                              {tarefa.status !== 'concluida' && (
                                <span style={{ fontSize: 9, fontWeight: 600, color: dias < 0 ? '#ef4444' : dias <= 2 ? '#f59e0b' : '#6b7280' }}>
                                  {dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? 'vence hoje' : `D${tarefa.prazo_dia} · ${dias}d`}
                                </span>
                              )}
                            </div>

                            {tarefa.status === 'pendente' && !isAtt && (
                              <button onClick={() => atualizarStatus(tarefa, 'em_andamento')}
                                style={{ marginTop: 8, width: '100%', background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontSize: 11 }}>
                                → Iniciar tarefa
                              </button>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )
              })}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
