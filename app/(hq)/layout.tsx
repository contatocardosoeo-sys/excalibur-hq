'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import AlertaPreenchimento from '../components/AlertaPreenchimento'

export default function HQLayout({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(false)

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
        }
      } catch { /* */ }
      setReady(true)
    })()
  }, [])

  return (
    <>
      {ready && email && <AlertaPreenchimento userEmail={email} isAdmin={isAdmin} />}
      {children}
    </>
  )
}
