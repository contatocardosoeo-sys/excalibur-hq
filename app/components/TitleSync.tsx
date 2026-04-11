'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const TITULOS: Record<string, string> = {
  '/ceo': 'CEO',
  '/coo': 'COO',
  '/sdr': 'SDR',
  '/sdr/feedbacks': 'Feedbacks SDR',
  '/comercial': 'Comercial',
  '/trafego': 'Tráfego',
  '/cs': 'CS',
  '/cs/calendario': 'Calendário',
  '/clientes': 'Clientes',
  '/jornada': 'Jornada do Cliente',
  '/financeiro': 'Financeiro',
  '/operacao/financeiro': 'Financeiro Operacional',
  '/operacao/colaboradores': 'Colaboradores',
  '/onboarding': 'Onboarding',
  '/onboarding/novo': 'Novo Cliente',
  '/alertas': 'Alertas',
  '/visao-geral': 'Visão Geral',
  '/eventos': 'Eventos',
  '/pipeline': 'Pipeline',
  '/planos': 'Planos',
  '/automacoes': 'Automações',
  '/observabilidade': 'Observabilidade',
  '/base': 'Base do Projeto',
  '/ia/supervisor': 'Supervisor IA',
  '/ia/reactions': 'Event Reactions',
  '/admin/usuarios': 'Usuários',
  '/trafego-clientes': 'Tráfego Clientes',
  '/escritorio': 'Escritório 2D',
}

function resolverTitulo(pathname: string): string {
  const match = Object.entries(TITULOS)
    .filter(([k]) => pathname === k || pathname.startsWith(k + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]
  return match ? match[1] : 'HQ'
}

export default function TitleSync() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof document === 'undefined') return

    const titulo = resolverTitulo(pathname || '')
    const desired = `${titulo} | Excalibur HQ`

    const apply = () => {
      if (document.title !== desired) {
        document.title = desired
      }
    }

    // Aplica imediatamente
    apply()

    // Fallbacks: Next.js 16 metadata system pode sobrescrever apos o mount,
    // entao re-aplicamos algumas vezes via requestAnimationFrame + setTimeout.
    const raf1 = requestAnimationFrame(apply)
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(apply))
    const t1 = setTimeout(apply, 50)
    const t2 = setTimeout(apply, 200)
    const t3 = setTimeout(apply, 500)

    // MutationObserver no <title> para detectar qualquer sobrescrita tardia
    const titleEl = document.querySelector('title')
    let observer: MutationObserver | null = null
    if (titleEl) {
      observer = new MutationObserver(() => {
        if (document.title !== desired) {
          document.title = desired
        }
      })
      observer.observe(titleEl, { childList: true, subtree: true, characterData: true })
    }

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
      if (observer) observer.disconnect()
    }
  }, [pathname])

  return null
}
