'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'

type Tarefa = { id: string; clinica_id: string; fase: string; titulo: string; descricao: string; responsavel: string; data_prazo: string; status: string; bloqueante: boolean }
type Clinica = { id: string; nome: string }

function getWeekDates(offset: number): { start: Date; end: Date; days: Date[] } {
  const now = new Date()
  now.setDate(now.getDate() + offset * 7)
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(now.setDate(diff))
  start.setHours(0, 0, 0, 0)
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  const end = new Date(days[6])
  return { start, end, days }
}

function fmtDia(d: Date) {
  const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
  return `${dias[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`
}

function isToday(d: Date) {
  const hoje = new Date()
  return d.getDate() === hoje.getDate() && d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear()
}

export default function CalendarioCS() {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [clinicas, setClinicas] = useState<Clinica[]>([])
  const [loading, setLoading] = useState(true)

  const { days } = getWeekDates(weekOffset)
  const startStr = days[0].toISOString().split('T')[0]
  const endStr = days[6].toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const [tRes, cRes] = await Promise.all([
      fetch(`/api/jornada?start=${startStr}&end=${endStr}`).then(r => r.json()).catch(() => ({ tarefas: [] })),
      fetch('/api/cs/cockpit').then(r => r.json()),
    ])
    setTarefas(tRes.tarefas || tRes || [])
    setClinicas(cRes.clinicas || [])
    setLoading(false)
  }, [startStr, endStr])

  useEffect(() => { load() }, [load])

  const clinicaNome = (id: string) => clinicas.find(c => c.id === id)?.nome || 'Clinica'

  const tarefasDia = (dia: Date) => {
    const dStr = dia.toISOString().split('T')[0]
    return tarefas.filter(t => t.data_prazo === dStr)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Calendario CS</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Tarefas da jornada por semana</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setWeekOffset(w => w - 1)} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>← Anterior</button>
            <button onClick={() => setWeekOffset(0)} style={{ background: weekOffset === 0 ? '#f59e0b' : '#1f2937', color: weekOffset === 0 ? '#030712' : '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>Hoje</button>
            <button onClick={() => setWeekOffset(w => w + 1)} style={{ background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>Seguinte →</button>
          </div>
        </div>

        {loading ? <div style={{ textAlign: 'center', color: '#6b7280', padding: 60 }}>Carregando...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
            {days.map(dia => {
              const items = tarefasDia(dia)
              const hoje = isToday(dia)
              return (
                <div key={dia.toISOString()} style={{ background: hoje ? '#111827' : '#0a0f1a', border: `1px solid ${hoje ? '#f59e0b40' : '#1f2937'}`, borderRadius: 12, minHeight: 160, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #1f2937', textAlign: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: hoje ? '#f59e0b' : '#9ca3af' }}>{fmtDia(dia)}</span>
                  </div>
                  <div style={{ padding: 6, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#374151', fontSize: 10, padding: '20px 0' }}>—</div>
                    )}
                    {items.map(t => (
                      <button key={t.id} onClick={() => router.push(`/jornada/${t.clinica_id}`)}
                        style={{ background: t.status === 'concluida' ? '#22c55e10' : t.bloqueante ? '#f59e0b10' : '#1f293780', border: `1px solid ${t.status === 'concluida' ? '#22c55e30' : t.bloqueante ? '#f59e0b30' : '#37415150'}`, borderRadius: 8, padding: '6px 8px', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        <div style={{ fontSize: 9, color: '#6b7280', marginBottom: 2, display: 'flex', justifyContent: 'space-between' }}>
                          <span>{clinicaNome(t.clinica_id)}</span>
                          {t.bloqueante && <span style={{ color: '#f59e0b', fontSize: 8 }}>🔒</span>}
                        </div>
                        <div style={{ fontSize: 10, color: t.status === 'concluida' ? '#4ade80' : '#fff', fontWeight: 500, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{t.titulo}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
