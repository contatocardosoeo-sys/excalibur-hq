'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'

interface Tarefa {
  id: string
  clinica_id: string
  clinica_nome: string
  fase: string
  titulo: string
  status: string
  bloqueante: boolean
  data_prazo: string
}

function getWeekDates(offset: number) {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now)
  start.setDate(diff)
  start.setHours(12, 0, 0, 0)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function toISO(d: Date) { return d.toISOString().split('T')[0] }
function fmtDia(d: Date) {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
  return `${nomes[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}
function isToday(d: Date) {
  const h = new Date()
  return d.getDate() === h.getDate() && d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear()
}

export default function CalendarioCS() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [loading, setLoading] = useState(true)

  const days = getWeekDates(weekOffset)
  const startStr = toISO(days[0])
  const endStr = toISO(days[6])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cs/tarefas-semana?start=${startStr}&end=${endStr}`)
      const data = await res.json()
      setTarefas(data.tarefas || [])
    } catch {
      setTarefas([])
    }
    setLoading(false)
  }, [startStr, endStr])

  useEffect(() => { load() }, [load])

  const tarefasDia = (dia: Date) => {
    const dStr = toISO(dia)
    return tarefas.filter(t => t.data_prazo === dStr)
  }

  const totalSemana = tarefas.length
  const bloqueantes = tarefas.filter(t => t.bloqueante).length

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Calendario CS</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>
              {totalSemana} tarefa{totalSemana !== 1 ? 's' : ''} esta semana
              {bloqueantes > 0 && <span style={{ color: '#f59e0b', marginLeft: 8 }}>({bloqueantes} bloqueante{bloqueantes !== 1 ? 's' : ''})</span>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>← Anterior</button>
            <button onClick={() => setWeekOffset(0)} style={{ background: weekOffset === 0 ? '#f59e0b' : '#1f2937', color: weekOffset === 0 ? '#030712' : '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Hoje</button>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Seguinte →</button>
          </div>
        </div>

        {loading ? (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: 8, minWidth: 910 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} style={{ background: '#111827', borderRadius: 12, height: 200, animation: 'pulse 1.5s infinite' }} />)}
            <style>{`@keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
          </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(130px, 1fr))', gap: 8, minWidth: 910 }}>
            {days.map(dia => {
              const items = tarefasDia(dia)
              const hoje = isToday(dia)
              const fimSemana = dia.getDay() === 0 || dia.getDay() === 6
              return (
                <div key={toISO(dia)} style={{
                  background: hoje ? 'linear-gradient(180deg, #1f140820 0%, #0a0f1a 100%)' : fimSemana ? '#080c14' : '#0a0f1a',
                  border: `1px solid ${hoje ? '#f59e0b' : '#1f2937'}`,
                  borderRadius: 12, minHeight: 180, display: 'flex', flexDirection: 'column',
                  boxShadow: hoje ? '0 0 0 2px #f59e0b20, 0 8px 24px #f59e0b15' : 'none',
                }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #1f2937', textAlign: 'center', position: 'relative' }}>
                    {hoje && (
                      <div style={{ fontSize: 8, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>HOJE</div>
                    )}
                    <span style={{ fontSize: 11, fontWeight: 700, color: hoje ? '#f59e0b' : fimSemana ? '#374151' : '#9ca3af' }}>{fmtDia(dia)}</span>
                    {items.length > 0 && <span style={{ marginLeft: 6, background: '#f59e0b30', color: '#f59e0b', padding: '0 5px', borderRadius: 6, fontSize: 9, fontWeight: 700 }}>{items.length}</span>}
                  </div>
                  <div style={{ padding: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
                    {items.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#252535', fontSize: 10, padding: '30px 0' }}>—</div>
                    )}
                    {items.map(t => (
                      <button key={t.id} onClick={() => router.push(`/jornada/${t.clinica_id}`)}
                        style={{
                          background: t.status === 'concluida' ? '#22c55e10' : t.bloqueante ? '#f59e0b08' : '#1f293760',
                          border: `1px solid ${t.status === 'concluida' ? '#22c55e30' : t.bloqueante ? '#f59e0b30' : '#37415140'}`,
                          borderRadius: 8, padding: '6px 8px', cursor: 'pointer', textAlign: 'left', width: '100%',
                          borderLeft: t.bloqueante ? '3px solid #f59e0b' : t.status === 'concluida' ? '3px solid #22c55e' : '3px solid #374151',
                        }}>
                        <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{t.clinica_nome}</span>
                          {t.bloqueante && <span style={{ color: '#f59e0b', fontSize: 10 }}>🔒</span>}
                        </div>
                        <div style={{
                          fontSize: 10, fontWeight: 500, lineHeight: 1.2,
                          color: t.status === 'concluida' ? '#4ade80' : '#e5e7eb',
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
                        }}>{t.titulo}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        )}

        {/* Sem tarefas */}
        {!loading && tarefas.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#4b5563' }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>📅</div>
            <p style={{ fontSize: 13 }}>Nenhuma tarefa nesta semana</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>Navegue para outras semanas ou cadastre tarefas na jornada</p>
          </div>
        )}
      </div>
    </div>
  )
}
