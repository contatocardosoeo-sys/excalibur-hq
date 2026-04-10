'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'
import AlertaCentral from '../components/AlertaCentral'
import SistemaEventos from '../components/SistemaEventos'
import { ToastProvider } from '../components/Toast'

const TITULOS: Record<string, string> = {
  '/ceo': 'CEO',
  '/coo': 'COO',
  '/sdr': 'SDR',
  '/sdr/feedbacks': 'Feedbacks SDR',
  '/comercial': 'Comercial',
  '/trafego': 'Tráfego',
  '/cs': 'CS',
  '/cs/calendario': 'Calendário CS',
  '/clientes': 'Clientes',
  '/jornada': 'Jornada',
  '/financeiro': 'Financeiro',
  '/operacao/financeiro': 'Financeiro Operacional',
  '/operacao/colaboradores': 'Colaboradores',
  '/onboarding': 'Onboarding',
  '/onboarding/novo': 'Novo Cliente',
  '/alertas': 'Alertas',
  '/visao-geral': 'Visão Geral',
}

export default function HQLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [primaryRole, setPrimaryRole] = useState<string>('')
  const [ready, setReady] = useState(false)

  // Atualiza titulo da aba do browser baseado na rota
  useEffect(() => {
    const match = Object.entries(TITULOS)
      .filter(([k]) => pathname === k || pathname.startsWith(k + '/'))
      .sort((a, b) => b[0].length - a[0].length)[0]
    const titulo = match ? match[1] : 'HQ'
    document.title = `${titulo} — Excalibur HQ`
  }, [pathname])

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const e = session?.user?.email
        if (e) {
          setEmail(e)
          const { data: u } = await supabase.from('usuarios_internos').select('roles, role').eq('email', e).single()
          const roles: string[] = (u?.roles && Array.isArray(u.roles) && u.roles.length > 0) ? u.roles : [u?.role || '']
          setIsAdmin(roles.includes('admin'))
          setPrimaryRole(roles[0] || '')
        }
      } catch { /* */ }
      setReady(true)
    })()
  }, [])

  return (
    <ToastProvider>
      {ready && email && <AlertaCentral userEmail={email} isAdmin={isAdmin} />}
      {ready && primaryRole && <SistemaEventos userRole={primaryRole} />}
      <div key={pathname} className="page-transition pt-14 md:pt-0 min-h-screen overflow-x-hidden min-w-0 max-w-full">
        {children}
      </div>
    </ToastProvider>
  )
}
