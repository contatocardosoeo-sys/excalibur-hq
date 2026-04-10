'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { useDispararEvento } from '../../../hooks/useDispararEvento'

type Tarefa = {
  id: string; fase: string; titulo: string; descricao: string
  responsavel: string; prazo_dia: number; data_prazo: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada' | 'bloqueada'
  bloqueante: boolean
}

type JornadaData = {
  clinica: { id: string; nome: string; data_inicio: string; cs_responsavel: string }
  tarefas: Tarefa[]
  jornada: { etapa: string; dias_na_plataforma: number } | null
  progresso: number; total: number; concluidas: number
}

const STATUS_CFG: Record<string, { label: string; cor: string; bg: string; borda: string }> = {
  pendente:     { label: 'Pendente',     cor: '#6b7280', bg: '#6b728020', borda: '#6b728040' },
  em_andamento: { label: 'Em andamento', cor: '#f59e0b', bg: '#f59e0b20', borda: '#f59e0b40' },
  concluida:    { label: 'Concluida',    cor: '#22c55e', bg: '#22c55e20', borda: '#22c55e40' },
  atrasada:     { label: 'Atrasada',     cor: '#ef4444', bg: '#ef444420', borda: '#ef444440' },
  bloqueada:    { label: 'Bloqueada',    cor: '#8b5cf6', bg: '#8b5cf620', borda: '#8b5cf640' },
}

const GRUPOS = [
  { label: 'D1 → D7', cor: '#3b82f6', fases: ['D1-D2', 'D2-D3', 'D3-D7', 'D7'] },
  { label: 'D7 → D15', cor: '#f59e0b', fases: ['D7-D15', 'D15'] },
  { label: 'D15 → D30', cor: '#22c55e', fases: ['D15-D30', 'D30'] },
]

export default function JornadaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { disparar } = useDispararEvento()
  const [dados, setDados] = useState<JornadaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [att, setAtt] = useState<string | null>(null)
  const [criando, setCriando] = useState(false)

  const carregar = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const res = await fetch(`/api/jornada?clinica_id=${id}`)
    setDados(await res.json())
    setLoading(false)
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  const mudarStatus = async (t: Tarefa, s: Tarefa['status']) => {
    setAtt(t.id)
    // Optimistic update: altera localmente e recalcula agregados sem refetch
    setDados(prev => {
      if (!prev) return prev
      const novas = prev.tarefas.map(x => (x.id === t.id ? { ...x, status: s } : x))
      const total = novas.length
      const concluidas = novas.filter(x => x.status === 'concluida').length
      const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0
      return { ...prev, tarefas: novas, total, concluidas, progresso }
    })
    try {
      await fetch('/api/jornada', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tarefa_id: t.id, status: s, clinica_id: id }) })
      if (s === 'concluida' && t.status !== 'concluida') {
        const clinicaNome = dados?.clinica?.nome || 'Clinica'
        // Marcos especiais D7 e D30 -> evento pra empresa toda
        if (t.fase === 'D7' || t.fase === 'D7-D15') {
          disparar({
            tipo: 'marco_d7',
            titulo: 'Marco D7 Concluído!',
            mensagem: `${clinicaNome} completou a primeira semana!`,
            usuario_nome: 'Medina',
          })
        } else if (t.fase === 'D30' || t.fase === 'D15-D30') {
          disparar({
            tipo: 'marco_d30',
            titulo: 'MARCO D30 CONCLUÍDO!',
            mensagem: `${clinicaNome} completou a jornada D30!`,
            usuario_nome: 'Medina',
          })
        } else {
          // Tarefas comuns -> evento privado de CS
          disparar({
            tipo: 'tarefa_concluida',
            titulo: 'Tarefa concluída',
            mensagem: `${t.titulo} — ${clinicaNome}`,
            usuario_nome: 'Medina',
          })
        }
      }
    } finally {
      setAtt(null)
    }
  }

  const criarTarefasPadrao = async () => {
    if (!id || criando) return
    setCriando(true)
    const res = await fetch('/api/jornada/criar-tarefas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clinica_id: id }),
    })
    if (res.ok) {
      await carregar()
    } else {
      const err = await res.json().catch(() => ({}))
      alert('Erro ao criar tarefas: ' + (err.error || 'desconhecido'))
    }
    setCriando(false)
  }

  const diasR = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
  const contar = (ts: Tarefa[], s: string) => ts.filter(t => t.status === s).length

  const stats = useMemo(() => {
    const ts = dados?.tarefas || []
    const pendentes = ts.filter(t => t.status === 'pendente').length
    const concluidas = ts.filter(t => t.status === 'concluida').length
    const emAndamento = ts.filter(t => t.status === 'em_andamento').length
    const atrasadas = ts.filter(t => t.status !== 'concluida' && t.data_prazo && diasR(t.data_prazo) < 0).length
    return { pendentes, concluidas, emAndamento, atrasadas }
  }, [dados])

  return (
    <div style={{ minHeight: '100vh', background: '#09090f', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '20px 24px', overflowY: 'auto' }}>

        {/* Voltar */}
        <button onClick={() => router.push('/jornada')} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
          ← Voltar para carteira
        </button>

        {loading || !dados ? (
          <div>
            {/* Skeleton do header */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <div style={{ height: 18, width: '40%', background: '#252535', borderRadius: 4, marginBottom: 12 }} />
              <div style={{ height: 8, background: '#252535', borderRadius: 4 }} />
            </div>
            {/* Skeleton das 3 colunas Kanban */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ height: 48, background: '#13131f', border: '1px solid #252535', borderRadius: 10 }} />
                  {[0, 1, 2, 3].map(j => (
                    <div key={j} style={{ height: 96, background: '#13131f', border: '1px solid #252535', borderRadius: 10, opacity: 1 - j * 0.15 }} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : !dados.clinica ? (
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '80px 0' }}>Clinica nao encontrada</div>
        ) : (
          <>
            {/* Header + progresso */}
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 12, padding: 20, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{dados.clinica.nome}</span>
                  <span style={{ fontSize: 11, background: '#f59e0b20', color: '#f59e0b', border: '1px solid #f59e0b40', borderRadius: 999, padding: '2px 10px' }}>
                    {dados.jornada?.etapa?.replace(/_/g, ' ') || 'D0'}
                  </span>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Dia {dados.jornada?.dias_na_plataforma || 0}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, height: 8, background: '#252535', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${dados.progresso}%`, background: dados.progresso >= 80 ? '#22c55e' : dados.progresso >= 40 ? '#f59e0b' : '#3b82f6', borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                  <span style={{ fontSize: 13, color: '#fff', fontWeight: 700 }}>{dados.progresso}%</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{dados.concluidas}/{dados.total} tarefas</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { l: 'Pendentes', v: stats.pendentes, c: '#6b7280' },
                  { l: 'Em andamento', v: stats.emAndamento, c: '#f59e0b' },
                  { l: 'Atrasadas', v: stats.atrasadas, c: '#ef4444' },
                  { l: 'Concluidas', v: stats.concluidas, c: '#22c55e' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign: 'center', padding: '8px 16px', background: '#09090f', borderRadius: 8 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Empty state — clinica sem tarefas */}
            {dados.tarefas.length === 0 && (
              <div style={{ background: '#13131f', border: '1px dashed #f59e0b40', borderRadius: 12, padding: 48, textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>Nenhuma tarefa criada ainda</div>
                <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>
                  Esta clínica ainda não tem a jornada D0-D30 populada. Clique abaixo para gerar as 22 tarefas padrão.
                </div>
                <button onClick={criarTarefasPadrao} disabled={criando}
                  style={{ background: criando ? '#9a6a00' : '#f59e0b', border: 'none', color: '#09090f', fontWeight: 700, padding: '10px 22px', borderRadius: 8, cursor: criando ? 'wait' : 'pointer', fontSize: 13 }}>
                  {criando ? '⏳ Criando...' : '⚔️ Criar tarefas padrão (D0-D30)'}
                </button>
              </div>
            )}

            {/* Kanban 3 colunas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {GRUPOS.map(g => {
                const ts = dados.tarefas.filter(t => g.fases.includes(t.fase))
                const concl = contar(ts, 'concluida')
                return (
                  <div key={g.label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ background: `${g.cor}15`, border: `1px solid ${g.cor}30`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: g.cor }}>{g.label}</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{concl}/{ts.length} concluidas</div>
                      </div>
                      <div style={{ width: 60, height: 4, background: '#252535', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: ts.length > 0 ? `${(concl / ts.length) * 100}%` : '0%', background: g.cor, borderRadius: 2 }} />
                      </div>
                    </div>

                    {ts.length === 0 ? (
                      <div style={{ textAlign: 'center', color: '#374151', fontSize: 12, padding: '20px 0' }}>Sem tarefas</div>
                    ) : ts.map(t => {
                      const cfg = STATUS_CFG[t.status] || STATUS_CFG.pendente
                      const dias = diasR(t.data_prazo)
                      const atr = dias < 0 && t.status !== 'concluida'
                      const isAtt = att === t.id
                      return (
                        <div key={t.id} style={{
                          background: t.status === 'concluida' ? '#13131f80' : '#13131f',
                          border: `1px solid ${atr ? '#ef444440' : t.status === 'concluida' ? '#22c55e20' : t.bloqueante ? '#8b5cf640' : '#252535'}`,
                          borderRadius: 10, padding: '12px 14px', opacity: t.status === 'concluida' ? 0.7 : 1, transition: 'all 0.15s',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: `${g.cor}20`, color: g.cor, border: `1px solid ${g.cor}30`, fontWeight: 600 }}>{t.fase}</span>
                                {t.bloqueante && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: '#8b5cf620', color: '#8b5cf6', border: '1px solid #8b5cf640' }}>🔒 bloqueante</span>}
                                {atr && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 999, background: '#ef444420', color: '#ef4444', border: '1px solid #ef444440' }}>⚠️ atrasada</span>}
                              </div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: t.status === 'concluida' ? '#6b7280' : '#fff', lineHeight: 1.3, textDecoration: t.status === 'concluida' ? 'line-through' : 'none' }}>{t.titulo}</div>
                            </div>
                            <button onClick={() => mudarStatus(t, t.status === 'concluida' ? 'pendente' : 'concluida')} disabled={isAtt}
                              style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0, border: `2px solid ${t.status === 'concluida' ? '#22c55e' : '#374151'}`, background: t.status === 'concluida' ? '#22c55e' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#000', transition: 'all 0.15s' }}>
                              {isAtt ? '⏳' : t.status === 'concluida' ? '✓' : ''}
                            </button>
                          </div>
                          {t.descricao && t.status !== 'concluida' && (
                            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4, marginBottom: 8 }}>{t.descricao.slice(0, 100)}{t.descricao.length > 100 ? '...' : ''}</div>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: 9, padding: '1px 7px', borderRadius: 999, background: cfg.bg, color: cfg.cor, border: `1px solid ${cfg.borda}` }}>{cfg.label}</span>
                              <span style={{ fontSize: 9, color: '#4b5563' }}>{t.responsavel === 'CS' ? '👤 CS' : '🏥 Clinica'}</span>
                            </div>
                            {t.status !== 'concluida' && (
                              <span style={{ fontSize: 9, fontWeight: 600, color: dias < 0 ? '#ef4444' : dias <= 2 ? '#f59e0b' : '#6b7280' }}>
                                {dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? 'vence hoje' : `D${t.prazo_dia} · ${dias}d`}
                              </span>
                            )}
                          </div>
                          {t.status === 'pendente' && !isAtt && (
                            <button onClick={() => mudarStatus(t, 'em_andamento')}
                              style={{ marginTop: 8, width: '100%', background: 'transparent', border: '1px solid #252535', color: '#6b7280', borderRadius: 6, padding: '4px 0', cursor: 'pointer', fontSize: 11 }}>
                              → Iniciar tarefa
                            </button>
                          )}
                          {t.status === 'em_andamento' && !isAtt && (
                            <button onClick={() => mudarStatus(t, 'concluida')}
                              style={{ marginTop: 8, width: '100%', background: '#22c55e20', border: '1px solid #22c55e60', color: '#22c55e', borderRadius: 6, padding: '5px 0', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                              ✅ Concluir tarefa
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
