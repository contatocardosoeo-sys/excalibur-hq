'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import SetupOnboarding from '../../components/trafego-clientes/SetupOnboarding'
import DashboardTrafego from '../../components/trafego-clientes/DashboardTrafego'
import { supabase } from '../../lib/supabase'

export default function TrafegoClientesPage() {
  const [loading, setLoading] = useState(true)
  const [setupDone, setSetupDone] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [userNome, setUserNome] = useState<string>('')

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) {
          const { data: interno } = await supabase.from('usuarios_internos').select('role, nome').eq('email', user.email).single()
          if (interno) {
            setUserRole(interno.role)
            setUserNome(interno.nome || '')
          }
        }
        const r = await fetch('/api/trafego-clientes/setup').then(r => r.json())
        setSetupDone(!!r.respondido)
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  const handleSetupComplete = () => setSetupDone(true)

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0 pt-20 md:pt-6">
        {loading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-gray-500 text-sm">Carregando...</div>
          </div>
        ) : !setupDone && userRole === 'head_traffic' ? (
          <SetupOnboarding onComplete={handleSetupComplete} respondidoPor={userNome} />
        ) : (
          <DashboardTrafego userRole={userRole} userNome={userNome} setupDone={setupDone} />
        )}
      </div>
    </div>
  )
}
