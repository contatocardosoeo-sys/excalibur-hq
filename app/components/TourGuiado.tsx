'use client'

import { useState, useEffect, useCallback } from 'react'
import { type TourStep } from '../lib/tour-engine'

interface Props {
  steps: TourStep[]
  pagina: string
  userEmail: string
  onComplete: () => void
}

export default function TourGuiado({ steps, pagina, userEmail, onComplete }: Props) {
  const [atual, setAtual] = useState(0)
  const [aguardando, setAguardando] = useState(false)
  const [pos, setPos] = useState({ top: 100, left: 100 })

  const step = steps[atual]

  const salvar = useCallback(async (passo: number) => {
    await fetch('/api/tour/progresso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, pagina, passo_atual: passo, total_passos: steps.length }),
    }).catch(() => {})
  }, [userEmail, pagina, steps.length])

  const avancar = useCallback(async () => {
    if (atual >= steps.length - 1) {
      await fetch('/api/tour/concluir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, pagina }),
      }).catch(() => {})
      onComplete()
    } else {
      const prox = atual + 1
      await salvar(prox)
      setAtual(prox)
      setAguardando(false)
    }
  }, [atual, steps.length, userEmail, pagina, onComplete, salvar])

  // Posicionar balão no elemento
  useEffect(() => {
    if (!step) return
    const el = document.getElementById(step.elementId)
    if (!el) {
      // Elemento não encontrado — pular
      const t = setTimeout(() => avancar(), 100)
      return () => clearTimeout(t)
    }

    el.style.outline = '3px solid #f59e0b'
    el.style.outlineOffset = '4px'
    el.style.position = 'relative'
    el.style.zIndex = '1001'
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    const rect = el.getBoundingClientRect()
    const scrollY = window.scrollY
    let top = 0
    let left = Math.min(Math.max(rect.left + rect.width / 2 - 150, 8), window.innerWidth - 316)

    if (step.position === 'bottom') top = rect.bottom + scrollY + 16
    else if (step.position === 'top') top = rect.top + scrollY - 240
    else top = rect.top + scrollY

    setPos({ top, left })

    return () => {
      el.style.outline = ''
      el.style.outlineOffset = ''
      el.style.zIndex = ''
    }
  }, [atual, step, avancar])

  // Escutar actionRequired
  useEffect(() => {
    if (!step?.actionRequired) return
    const [tipo, seletor] = step.actionRequired.split(':')

    if (tipo === 'click' && seletor) {
      setAguardando(true)
      const handler = () => { setAguardando(false); avancar() }
      const els = document.querySelectorAll(seletor)
      els.forEach(el => el.addEventListener('click', handler, { once: true }))
      return () => els.forEach(el => el.removeEventListener('click', handler))
    }

    if (tipo === 'navigate' && seletor) {
      setAguardando(true)
      const check = setInterval(() => {
        if (window.location.pathname === seletor) {
          clearInterval(check)
          setAguardando(false)
          avancar()
        }
      }, 500)
      return () => clearInterval(check)
    }
  }, [atual, step, avancar])

  if (!step || steps.length === 0) return null

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999, pointerEvents: 'none' }} />

      {/* Balão dark theme */}
      <div
        style={{
          position: 'absolute',
          top: pos.top,
          left: pos.left,
          width: 300,
          background: '#111827',
          border: '2px solid #f59e0b',
          borderRadius: 14,
          padding: '16px 18px',
          zIndex: 1002,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5), 0 0 20px rgba(245,158,11,0.2)',
        }}
      >
        {/* Step counter */}
        <div style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
          Passo {atual + 1} de {steps.length}
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>
          {step.title}
        </div>

        <div style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.6, marginBottom: 10 }}>
          {step.body}
        </div>

        {/* Ação */}
        <div style={{
          fontSize: 11, color: '#22c55e', fontWeight: 600,
          background: '#22c55e10', border: '1px solid #22c55e30',
          borderRadius: 8, padding: '6px 10px', marginBottom: 12,
        }}>
          → {step.action}
        </div>

        {/* Progresso + botões */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            data-touch-exempt
            onClick={onComplete}
            style={{ fontSize: 10, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Pular tour
          </button>
          <div style={{ flex: 1, display: 'flex', gap: 3, justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <div
                key={i}
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: i <= atual ? '#f59e0b' : '#374151',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>
          <button
            data-touch-exempt
            onClick={() => !aguardando && avancar()}
            disabled={aguardando}
            style={{
              background: aguardando ? '#374151' : '#f59e0b',
              color: aguardando ? '#6b7280' : '#030712',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 12,
              fontWeight: 700,
              cursor: aguardando ? 'not-allowed' : 'pointer',
              minHeight: 36,
            }}
          >
            {aguardando ? 'Execute a ação →' : atual >= steps.length - 1 ? 'Concluir ✓' : 'Próximo →'}
          </button>
        </div>
      </div>
    </>
  )
}
