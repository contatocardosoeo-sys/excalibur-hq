'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Fallback que nao quebra se o provider nao estiver montado
    return { toast: () => {} }
  }
  return ctx
}

const tipoCor: Record<ToastType, { bg: string; border: string; cor: string; icon: string }> = {
  success: { bg: '#14532d', border: '#22c55e', cor: '#4ade80', icon: '✅' },
  error: { bg: '#7f1d1d', border: '#ef4444', cor: '#f87171', icon: '❌' },
  info: { bg: '#1e3a8a', border: '#3b82f6', cor: '#60a5fa', icon: 'ℹ️' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
        {toasts.map(t => {
          const c = tipoCor[t.type]
          return (
            <div key={t.id} className="toast-enter" style={{
              background: c.bg + 'ee', border: `1px solid ${c.border}`, borderRadius: 10,
              padding: '12px 16px', color: c.cor, fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 10, minWidth: 240, maxWidth: 360,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)', pointerEvents: 'auto',
            }}>
              <span style={{ fontSize: 16 }}>{c.icon}</span>
              <span>{t.message}</span>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
