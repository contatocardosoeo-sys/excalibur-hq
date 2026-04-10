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

  const totalAlertas = (meuPendente ? 1 : 0) + (adminPendente ? faltando.length : 0)
  const nomesFaltando = faltando.map(f => f.nome).join(', ')

  return (
    <>
      <style>{`
        @keyframes alertaPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7), 0 8px 30px rgba(239, 68, 68, 0.6); }
          50% { box-shadow: 0 0 0 16px rgba(239, 68, 68, 0), 0 8px 40px rgba(239, 68, 68, 0.9); }
        }
        @keyframes alertaShake {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-8deg); }
          75% { transform: rotate(8deg); }
        }
        .alerta-pulsante { animation: alertaPulse 1.2s infinite; }
        .alerta-icon { display: inline-block; animation: alertaShake 0.6s infinite; }
      `}</style>

      {/* Botao flutuante MUITO chamativo */}
      <button onClick={() => setOpen(!open)}
        className={open ? '' : 'alerta-pulsante'}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 60,
          background: open ? '#1f2937' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          color: '#fff',
          border: '3px solid #fff',
          borderRadius: open ? 12 : 999,
          padding: open ? '12px 16px' : '14px 22px',
          cursor: 'pointer',
          fontSize: 14, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 10,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
        {open ? (
          <>✕ FECHAR</>
        ) : (
          <>
            <span className="alerta-icon" style={{ fontSize: 22 }}>🚨</span>
            <span>{totalAlertas} ALERTA{totalAlertas > 1 ? 'S' : ''}</span>
            {nomesFaltando && <span style={{ fontSize: 11, opacity: 0.95, fontWeight: 600, textTransform: 'none' }}>· {nomesFaltando}</span>}
          </>
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
