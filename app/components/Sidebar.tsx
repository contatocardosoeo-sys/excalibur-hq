'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const sections = [
  {
    label: 'Dashboards',
    items: [
      { href: '/ceo', icon: '👑', label: 'CEO' },
      { href: '/coo', icon: '🧠', label: 'COO' },
      { href: '/financeiro', icon: '💰', label: 'Financeiro' },
      { href: '/comercial', icon: '⚙️', label: 'Comercial' },
      { href: '/trafego', icon: '📣', label: 'Trafego' },
      { href: '/sdr', icon: '📞', label: 'SDR' },
      { href: '/cs', icon: '🎯', label: 'CS' },
    ],
  },
  {
    label: 'Operacao',
    items: [
      { href: '/onboarding', icon: '🚀', label: 'Novo Cliente' },
      { href: '/pipeline', icon: '🔁', label: 'Pipeline D0-D90' },
      { href: '/clientes', icon: '👥', label: 'Clientes' },
      { href: '/planos', icon: '💳', label: 'Planos & Cobrança' },
      { href: '/alertas', icon: '🚨', label: 'Alertas' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/dashboard', icon: '📊', label: 'Visao Geral' },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <div className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
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
        <p className="text-gray-600 text-[10px]">Excalibur HQ v1.0</p>
      </div>
    </div>
  )
}
