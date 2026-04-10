'use client'

import { useEffect, useState, useCallback } from 'react'

interface Controle { email: string; nome: string; preenchido: boolean }

export default function AlertaPreenchimento({ userEmail, isAdmin }: { userEmail: string; isAdmin: boolean }) {
  const [meuStatus, setMeuStatus] = useState<{ preenchido: boolean } | null>(null)
  const [controle, setControle] = useState<Controle[]>([])
  const [faltasSemana, setFaltasSemana] = useState<Record<string, number>>({})
  const [open, setOpen] = useState(false)
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
  const meuPendente = !meuStatus.preenchido
  const adminPendente = isAdmin && !todosOk

  // Se nada precisa de atencao, nao mostra nada
  if (!meuPendente && !adminPendente) return null

  // Botao flutuante minimalista no canto inferior direito
  const cor = meuPendente ? '#ef4444' : '#f59e0b'
  const totalAlertas = (meuPendente ? 1 : 0) + (adminPendente ? faltando.length : 0)

  return (
    <>
      {/* Botao flutuante */}
      <button onClick={() => setOpen(!open)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 60,
          background: cor, color: meuPendente ? '#fff' : '#030712',
          border: 'none', borderRadius: '50%', width: 48, height: 48,
          cursor: 'pointer', fontSize: 18, fontWeight: 700,
          boxShadow: `0 4px 12px ${cor}50`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        {open ? '✕' : '⚠️'}
        {!open && (
          <span style={{
            position: 'absolute', top: -4, right: -4, background: '#fff', color: cor,
            borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${cor}`,
          }}>{totalAlertas}</span>
        )}
      </button>

      {/* Painel expansivel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 60,
          width: 320, background: '#13131f', border: '1px solid #252535', borderRadius: 12,
          padding: 16, boxShadow: '0 8px 24px #00000080',
        }}>
          {meuPendente && (
            <div style={{ marginBottom: adminPendente ? 16 : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>🔴</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Sua planilha do dia</span>
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>Preencha sua planilha diaria. Obrigatorio no fim de cada turno.</p>
              <button onClick={marcarPreenchido} disabled={marcando}
                style={{ width: '100%', background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700, opacity: marcando ? 0.5 : 1 }}>
                {marcando ? 'Salvando...' : '✅ Ja preenchi'}
              </button>
            </div>
          )}

          {adminPendente && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 14 }}>⚠️</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#f59e0b' }}>{faltando.length} pessoa{faltando.length > 1 ? 's' : ''} pendente{faltando.length > 1 ? 's' : ''}</span>
              </div>
              <div style={{ background: '#1a1a2e', borderRadius: 8, overflow: 'hidden' }}>
                {controle.map(c => (
                  <div key={c.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #252535' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.preenchido ? '#22c55e' : '#ef4444' }} />
                      <span style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>{c.nome}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, color: c.preenchido ? '#22c55e' : '#ef4444' }}>
                        {c.preenchido ? 'OK' : 'Pendente'}
                      </span>
                      {faltasSemana[c.email] > 0 && (
                        <span style={{ fontSize: 8, padding: '1px 5px', borderRadius: 999, background: '#ef444420', color: '#ef4444' }}>
                          {faltasSemana[c.email]} falta{faltasSemana[c.email] > 1 ? 's' : ''}/sem
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
