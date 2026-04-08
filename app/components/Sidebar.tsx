'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface MenuItem {
  href: string
  icon: string
  label: string
  roles: string[]
}

interface MenuSection {
  label: string
  items: MenuItem[]
}

const allSections: MenuSection[] = [
  {
    label: 'Dashboards',
    items: [
      { href: '/ceo', icon: '👑', label: 'CEO', roles: ['admin'] },
      { href: '/coo', icon: '🧠', label: 'COO', roles: ['admin'] },
      { href: '/financeiro', icon: '💰', label: 'Financeiro', roles: ['admin', 'financeiro'] },
      { href: '/comercial', icon: '💼', label: 'Comercial', roles: ['admin', 'closer'] },
      { href: '/trafego', icon: '📣', label: 'Trafego', roles: ['admin', 'cmo'] },
      { href: '/sdr', icon: '📞', label: 'SDR', roles: ['admin', 'sdr'] },
      { href: '/crm-whatsapp', icon: '💬', label: 'CRM WhatsApp', roles: ['admin', 'cs'] },
      { href: '/cs', icon: '🎯', label: 'CS', roles: ['admin', 'cs'] },
    ],
  },
  {
    label: 'Operacao',
    items: [
      { href: '/onboarding', icon: '🚀', label: 'Novo Cliente', roles: ['admin', 'cs'] },
      { href: '/clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'cs'] },
      { href: '/jornada', icon: '📈', label: 'Jornada D0-D90', roles: ['admin', 'cs'] },
      { href: '/planos', icon: '💳', label: 'Planos & Cobranca', roles: ['admin'] },
      { href: '/alertas', icon: '🚨', label: 'Alertas', roles: ['admin', 'cs'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard', icon: '📊', label: 'Visao Geral', roles: ['admin', 'cs', 'closer', 'cmo', 'sdr'] },
      { href: '/admin/usuarios', icon: '🔐', label: 'Colaboradores', roles: ['admin'] },
    ],
  },
]

function hasAnyRole(userRoles: string[], itemRoles: string[]): boolean {
  return itemRoles.some(r => userRoles.includes(r))
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRoles, setUserRoles] = useState<string[]>(['admin'])
  const [nome, setNome] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: interno } = await supabase
          .from('usuarios_internos')
          .select('role, roles, nome')
          .eq('email', user.email)
          .single()
        if (interno) {
          const roles = (interno.roles && interno.roles.length > 0) ? interno.roles : [interno.role]
          setUserRoles(roles)
          setNome(interno.nome)
        }
      }
    })()
  }, [])

  const filteredSections = allSections
    .map(s => ({ ...s, items: s.items.filter(i => hasAnyRole(userRoles, i.roles)) }))
    .filter(s => s.items.length > 0)

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const roleDisplay = userRoles.map(r => r.toUpperCase()).join(' + ')

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0" style={{ minHeight: '100vh' }}>
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">⚔️ Excalibur HQ</h1>
        <p className="text-gray-500 text-[10px] mt-0.5">Sistema Operacional</p>
      </div>
      <nav className="p-3 flex flex-col gap-0.5 flex-1 overflow-auto">
        {filteredSections.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-2 mb-1">{section.label}</p>
            {section.items.map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                  pathname === href || pathname.startsWith(href + '/') ? 'bg-amber-500 text-gray-950 font-semibold' : 'text-gray-400 hover:bg-gray-800'
                }`}>
                <span className="text-sm">{icon}</span> {label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-800">
        {nome && (
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[9px] font-bold text-amber-400">
              {nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div>
              <p className="text-gray-300 text-[11px] font-medium leading-none">{nome.split(' ')[0]}</p>
              <p className="text-gray-600 text-[9px]">{roleDisplay}</p>
            </div>
          </div>
        )}
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-[10px] transition w-full text-left">
          Sair
        </button>
        <p className="text-gray-700 text-[9px] mt-1">Excalibur HQ v1.2</p>
      </div>
    </div>
  )
}
