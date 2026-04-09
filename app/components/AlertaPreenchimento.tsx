'use client'

import { useEffect, useState, useCallback } from 'react'

interface Controle { email: string; nome: string; preenchido: boolean }

export default function AlertaPreenchimento({ userEmail, isAdmin }: { userEmail: string; isAdmin: boolean }) {
  const [meuStatus, setMeuStatus] = useState<{ preenchido: boolean } | null>(null)
  const [controle, setControle] = useState<Controle[]>([])
  const [faltasSemana, setFaltasSemana] = useState<Record<string, number>>({})
  const [showControle, setShowControle] = useState(false)
  const [marcando, setMarcando] = useState(false)

  const load = useCallback(async () => {
    if (!userEmail) return
    try {
      const d = await (await fetch(`/api/preenchimento?email=${encodeURIComponent(userEmail)}`)).json()
      setMeuStatus(d.meuStatus)
      setControle(d.controle || [])
      setFaltasSemana(d.faltasSemana || {})
    } catch { /* */ }
  }, [userEmail])

  useEffect(() => { load() }, [load])

  const marcarPreenchido = async () => {
    setMarcando(true)
    await fetch('/api/preenchimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail }) })
    setMarcando(false)
    load()
  }

  if (!meuStatus) return null

  const faltando = controle.filter(c => !c.preenchido)
  const todosOk = faltando.length === 0

  return (
    <div style={{ padding: '0 24px' }}>
      {/* Alerta pessoal — se EU não preenchi */}
      {!meuStatus.preenchido && (
        <div style={{ background: '#ef444415', border: '1px solid #ef444440', borderRadius: 10, padding: '10px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🔴</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Preencha sua planilha diaria!</div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>Obrigatorio no fim de cada turno. Clique para confirmar.</div>
            </div>
          </div>
          <button onClick={marcarPreenchido} disabled={marcando}
            style={{ background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 700, opacity: marcando ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            {marcando ? 'Salvando...' : '✅ Ja preenchi'}
          </button>
        </div>
      )}

      {/* Se já preencheu — badge verde discreto */}
      {meuStatus.preenchido && (
        <div style={{ background: '#22c55e10', border: '1px solid #22c55e30', borderRadius: 10, padding: '6px 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12 }}>✅</span>
          <span style={{ fontSize: 11, color: '#22c55e' }}>Planilha do dia preenchida</span>
        </div>
      )}

      {/* Controle admin — quem preencheu e quem não */}
      {isAdmin && (
        <div style={{ marginBottom: 10 }}>
          <button onClick={() => setShowControle(!showControle)}
            style={{ background: todosOk ? '#22c55e10' : '#f59e0b10', border: `1px solid ${todosOk ? '#22c55e30' : '#f59e0b30'}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 11, color: todosOk ? '#22c55e' : '#f59e0b', width: '100%', textAlign: 'left' }}>
            {todosOk ? '✅ Todos preencheram hoje' : `⚠️ ${faltando.length} pessoa${faltando.length > 1 ? 's' : ''} nao preencheu hoje — ${faltando.map(f => f.nome).join(', ')}`}
            <span style={{ float: 'right' }}>{showControle ? '▲' : '▼'}</span>
          </button>
          {showControle && (
            <div style={{ background: '#13131f', border: '1px solid #252535', borderRadius: 8, marginTop: 6, overflow: 'hidden' }}>
              {controle.map(c => (
                <div key={c.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #1a1a2e' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.preenchido ? '#22c55e' : '#ef4444' }} />
                    <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{c.nome}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: c.preenchido ? '#22c55e' : '#ef4444' }}>
                      {c.preenchido ? 'Preencheu' : 'Pendente'}
                    </span>
                    {faltasSemana[c.email] > 0 && (
                      <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 999, background: '#ef444420', color: '#ef4444' }}>
                        {faltasSemana[c.email]} falta{faltasSemana[c.email] > 1 ? 's' : ''} na semana
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
