'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/clientes', icon: '🏥', label: 'Clientes' },
  { href: '/jornada', icon: '🗺️', label: 'Jornada' },
  { href: '/comercial', icon: '💼', label: 'Comercial' },
  { href: '/cs', icon: '🎯', label: 'CS & Suporte' },
]

export default function Sidebar() {
  const pathname = usePathname()
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-white font-bold text-xl">⚔️ Excalibur HQ</h1>
        <p className="text-gray-500 text-xs mt-1">Backoffice Interno</p>
      </div>
      <nav className="p-4 flex flex-col gap-1 flex-1">
        {navItems.map(({ href, icon, label }) => (
          <Link key={href} href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
              pathname === href ? 'bg-amber-500 text-gray-950 font-semibold' : 'text-gray-400 hover:bg-gray-800'
            }`}>
            {icon} {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <p className="text-gray-500 text-xs">Excalibur HQ v0.6.0</p>
      </div>
    </div>
  )
}
