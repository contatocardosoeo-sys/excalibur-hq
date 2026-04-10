'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

type Controle = { email: string; nome: string; preenchido: boolean }

type AlertaCliente = {
  id: string
  cliente_id: string
  cliente_nome: string
  tipo: string
  prioridade: 'critica' | 'alta' | 'media' | 'baixa'
  descricao: string
  acao_sugerida: string
}

const PRIO_COR: Record<string, string> = {
  critica: '#ef4444',
  alta: '#f97316',
  media: '#eab308',
  baixa: '#22c55e',
}

export default function AlertaCentral({ userEmail, isAdmin }: { userEmail: string; isAdmin: boolean }) {
  const router = useRouter()

  const [meuStatus, setMeuStatus] = useState<{ preenchido: boolean } | null>(null)
  const [controle, setControle] = useState<Controle[]>([])
  const [faltasSemana, setFaltasSemana] = useState<Record<string, number>>({})
  const [alertasClientes, setAlertasClientes] = useState<AlertaCliente[]>([])
  const [open, setOpen] = useState(false)
  const [marcando, setMarcando] = useState(false)
  const [minimizado, setMinimizado] = useState(false)

  // Verifica sessionStorage ao montar — minimizado persiste por 30 minutos
  useEffect(() => {
    if (typeof window === 'undefined') return
    const min = sessionStorage.getItem('alertas_minimizado')
    const ts = sessionStorage.getItem('alertas_ts')
    if (min && ts && Date.now() - Number(ts) < 30 * 60 * 1000) {
      setMinimizado(true)
    }
  }, [])

  const minimizar = (e: React.MouseEvent) => {
    e.stopPropagation()
    setMinimizado(true)
    setOpen(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('alertas_minimizado', '1')
      sessionStorage.setItem('alertas_ts', String(Date.now()))
    }
  }

  const restaurar = () => {
    setMinimizado(false)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('alertas_minimizado')
      sessionStorage.removeItem('alertas_ts')
    }
  }

  const load = useCallback(async () => {
    if (!userEmail) return
    try {
      const [pre, alrt] = await Promise.all([
        fetch(`/api/preenchimento?email=${encodeURIComponent(userEmail)}`).then(r => r.json()),
        fetch('/api/hq/alertas?status=aberto').then(r => r.json()),
      ])
      setMeuStatus(pre.meuStatus)
      setControle(pre.controle || [])
      setFaltasSemana(pre.faltasSemana || {})
      setAlertasClientes((alrt.alertas || []) as AlertaCliente[])
    } catch { /* */ }
  }, [userEmail])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000) // refresh a cada 60s
    return () => clearInterval(t)
  }, [load])

  const marcarPreenchido = async () => {
    setMarcando(true)
    await fetch('/api/preenchimento', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: userEmail }) })
    setMarcando(false)
    load()
  }

  const irParaCliente = (clienteId: string, alertaId?: string) => {
    setOpen(false)
    router.push(alertaId ? `/clientes/${clienteId}?alerta=${alertaId}` : `/clientes/${clienteId}`)
  }

  if (!meuStatus) return null

  const faltando = controle.filter(c => !c.preenchido)
  const planilhasTodosOk = faltando.length === 0
  const meuPendente = !meuStatus.preenchido
  const adminPendente = isAdmin && !planilhasTodosOk
  const qtdClientes = alertasClientes.length

  if (!meuPendente && !adminPendente && qtdClientes === 0) return null

  const totalBadge = (meuPendente ? 1 : 0) + (adminPendente ? faltando.length : 0) + qtdClientes

  // Modo minimizado — badge compacta no canto superior direito, sem animacao
  if (minimizado) {
    return (
      <button
        onClick={restaurar}
        title="Restaurar alertas"
        aria-label={`${totalBadge} alertas - clique para restaurar`}
        className="fixed z-50 bg-red-900/80 hover:bg-red-800 text-red-200 text-xs font-bold px-3 py-1.5 rounded-full border border-red-700 shadow-lg transition"
        style={{ top: `calc(64px + env(safe-area-inset-top, 0))`, right: 16 }}
      >
        🚨 {totalBadge}
      </button>
    )
  }

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

      <button onClick={() => setOpen(!open)}
        className={open ? '' : 'alerta-pulsante'}
        style={{
          position: 'fixed',
          bottom: `calc(16px + env(safe-area-inset-bottom, 0))`,
          right: 16,
          zIndex: 60,
          background: open ? '#1f2937' : 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          color: '#fff',
          border: '3px solid #fff',
          borderRadius: open ? 12 : 999,
          padding: open ? '10px 14px' : '12px 18px',
          cursor: 'pointer',
          fontSize: 13, fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: 8,
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          maxWidth: 'calc(100vw - 32px)',
        }}>
        {open ? (
          <>✕ FECHAR</>
        ) : (
          <>
            <span className="alerta-icon" style={{ fontSize: 20 }}>🚨</span>
            <span>{totalBadge}</span>
            <span className="hidden sm:inline">ALERTA{totalBadge > 1 ? 'S' : ''}</span>
          </>
        )}
      </button>

      {open && (
        <div style={{
          position: 'fixed',
          bottom: `calc(72px + env(safe-area-inset-bottom, 0))`,
          right: 16,
          left: 16,
          zIndex: 60,
          width: 'auto',
          maxWidth: 380,
          marginLeft: 'auto',
          maxHeight: '70vh',
          overflowY: 'auto',
          background: '#13131f', border: '1px solid #252535', borderRadius: 12,
          padding: 16, boxShadow: '0 8px 24px #00000080',
        }}>
          {/* Botao Minimizar (suspende pulsante por 30min nesta sessao) */}
          <div className="flex justify-end mb-3">
            <button
              onClick={minimizar}
              className="text-[10px] text-gray-500 hover:text-gray-300 bg-gray-800 border border-gray-700 rounded-md px-2 py-1 transition"
              title="Minimizar por 30 minutos"
            >
              — Minimizar 30min
            </button>
          </div>
          {/* Alertas de clientes */}
          {qtdClientes > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                🏥 Clientes em risco · {qtdClientes}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {alertasClientes.slice(0, 8).map(a => (
                  <button
                    key={a.id}
                    onClick={() => irParaCliente(a.cliente_id, a.id)}
                    style={{
                      textAlign: 'left',
                      background: '#1a1a2e',
                      border: `1px solid ${PRIO_COR[a.prioridade]}40`,
                      borderLeft: `3px solid ${PRIO_COR[a.prioridade]}`,
                      borderRadius: 8,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      width: '100%',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#252540' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#1a1a2e' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{a.cliente_nome}</span>
                      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 999, background: `${PRIO_COR[a.prioridade]}20`, color: PRIO_COR[a.prioridade], textTransform: 'uppercase', fontWeight: 700 }}>
                        {a.prioridade}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 3 }}>{a.descricao}</div>
                    <div style={{ fontSize: 10, color: '#f59e0b' }}>→ {a.acao_sugerida}</div>
                  </button>
                ))}
                {qtdClientes > 8 && (
                  <button
                    onClick={() => { setOpen(false); router.push('/alertas') }}
                    style={{ background: 'transparent', border: '1px dashed #374151', borderRadius: 8, padding: '6px 10px', color: '#9ca3af', cursor: 'pointer', fontSize: 11 }}
                  >
                    Ver todos ({qtdClientes}) na aba Alertas →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Planilha do usuário */}
          {meuPendente && (
            <div style={{ marginBottom: adminPendente ? 16 : 0, paddingTop: qtdClientes > 0 ? 12 : 0, borderTop: qtdClientes > 0 ? '1px solid #252535' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                ⏰ Planilha diária
              </div>
              <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 10 }}>Preencha sua planilha do turno.</p>
              <button onClick={marcarPreenchido} disabled={marcando}
                style={{ width: '100%', background: '#22c55e', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700, opacity: marcando ? 0.5 : 1 }}>
                {marcando ? 'Salvando...' : '✅ Ja preenchi'}
              </button>
            </div>
          )}

          {/* Admin: quem está pendente */}
          {adminPendente && (
            <div style={{ paddingTop: (qtdClientes > 0 || meuPendente) ? 12 : 0, borderTop: (qtdClientes > 0 || meuPendente) ? '1px solid #252535' : 'none' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                👥 Planilhas pendentes · {faltando.length}
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
