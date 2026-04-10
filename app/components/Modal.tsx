'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: number
  footer?: ReactNode
}

/**
 * Modal — componente unificado de modal/dialog
 * Click fora fecha, ESC fecha, click dentro NÃO fecha
 *
 * @example
 * <Modal open={open} onClose={() => setOpen(false)} title="Editar cliente">
 *   <input ... />
 *   <button>Salvar</button>
 * </Modal>
 */
export default function Modal({
  open, onClose, title, subtitle, children, width = 480, footer,
}: ModalProps) {
  // ESC fecha o modal
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000cc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: width,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ marginBottom: 20 }}>
          <h3 id="modal-title" style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0 }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0' }}>{subtitle}</p>
          )}
        </div>

        <div>{children}</div>

        {footer && (
          <div style={{ marginTop: 20, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * ModalButton — botão padronizado para usar dentro do Modal
 * Variantes: primary (amber), secondary (outline), danger (red)
 */
export function ModalButton({
  variant = 'primary',
  onClick,
  disabled,
  children,
}: {
  variant?: 'primary' | 'secondary' | 'danger'
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  const variants = {
    primary: { bg: '#f59e0b', color: '#030712', border: 'none' },
    secondary: { bg: 'transparent', color: '#6b7280', border: '1px solid #374151' },
    danger: { bg: '#ef4444', color: '#fff', border: 'none' },
  }
  const v = variants[variant]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: v.bg,
        color: v.color,
        border: v.border,
        borderRadius: 8,
        padding: '10px 24px',
        fontSize: 13,
        fontWeight: variant === 'primary' || variant === 'danger' ? 700 : 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 0.2s',
      }}
    >
      {children}
    </button>
  )
}
