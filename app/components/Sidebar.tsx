'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface NavItem {
  href: string
  icon: string
  label: string
}

interface NavSection {
  label: string
  items: NavItem[]
}

const allSections: NavSection[] = [
  {
    label: 'Dashboards',
    items: [
      { href: '/ceo', icon: '👑', label: 'CEO' },
      { href: '/coo', icon: '🧠', label: 'COO' },
      { href: '/financeiro', icon: '💰', label: 'Financeiro' },
      { href: '/comercial', icon: '⚙️', label: 'Comercial' },
      { href: '/trafego', icon: '📣', label: 'Trafego' },
      { href: '/sdr', icon: '📞', label: 'SDR' },
      { href: '/crm-whatsapp', icon: '💬', label: 'CRM WhatsApp' },
      { href: '/cs', icon: '🎯', label: 'CS' },
    ],
  },
  {
    label: 'Operacao',
    items: [
      { href: '/onboarding', icon: '🚀', label: 'Novo Cliente' },
      { href: '/pipeline', icon: '🔁', label: 'Pipeline D0-D90' },
      { href: '/clientes', icon: '👥', label: 'Clientes' },
      { href: '/jornada', icon: '📈', label: 'Jornada D0-D90' },
      { href: '/planos', icon: '💳', label: 'Planos & Cobranca' },
      { href: '/alertas', icon: '🚨', label: 'Alertas' },
      { href: '/automacoes', icon: '⚡', label: 'Automacoes' },
    ],
  },
  {
    label: 'IA',
    items: [
      { href: '/ia/supervisor', icon: '🧠', label: 'Supervisor IA' },
      { href: '/ia/reactions', icon: '⚡', label: 'Event Reactions' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard', icon: '📊', label: 'Visao Geral' },
      { href: '/observabilidade', icon: '🔭', label: 'Observabilidade' },
      { href: '/base', icon: '📋', label: 'Base do Projeto' },
      { href: '/admin/usuarios', icon: '🔐', label: 'Colaboradores' },
    ],
  },
]

const CS_ROUTES = ['/dashboard', '/cs', '/clientes', '/jornada', '/adocao', '/alertas', '/onboarding', '/crm-whatsapp']

function filterSections(role: string): NavSection[] {
  if (role === 'admin') return allSections
  if (role === 'cs') {
    return allSections
      .map(s => ({
        ...s,
        items: s.items.filter(i => CS_ROUTES.some(r => i.href === r || i.href.startsWith(r + '/'))),
      }))
      .filter(s => s.items.length > 0)
  }
  return allSections
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState('admin')
  const [nome, setNome] = useState('')

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: interno } = await supabase
          .from('usuarios_internos')
          .select('role, nome')
          .eq('email', user.email)
          .single()
        if (interno) {
          setRole(interno.role)
          setNome(interno.nome)
        }
      }
    })()
  }, [])

  const sections = filterSections(role)

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0" style={{ minHeight: '100vh' }}>
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-white font-bold text-lg">⚔️ Excalibur HQ</h1>
        <p className="text-gray-500 text-[10px] mt-0.5">Sistema Operacional</p>
      </div>
      <nav className="p-3 flex flex-col gap-0.5 flex-1 overflow-auto">
        {sections.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-2 mb-1">{section.label}</p>
            {section.items.map(({ href, icon, label }) => (
              <Link key={href} href={href}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                  pathname === href ? 'bg-amber-500 text-gray-950 font-semibold' : 'text-gray-400 hover:bg-gray-800'
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
              <p className="text-gray-600 text-[9px]">{role.toUpperCase()}</p>
            </div>
          </div>
        )}
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-[10px] transition w-full text-left">
          Sair
        </button>
        <p className="text-gray-700 text-[9px] mt-1">Excalibur HQ v1.1</p>
      </div>
    </div>
  )
}
