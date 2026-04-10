'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

interface MenuItem { href: string; icon: string; label: string; roles: string[] }
interface MenuSection { label: string; items: MenuItem[] }
interface SearchResult { tipo: string; id: string; nome: string; sub: string; href: string }

const allSections: MenuSection[] = [
  {
    label: 'Dashboards',
    items: [
      { href: '/ceo', icon: '👑', label: 'CEO', roles: ['admin'] },
      { href: '/coo', icon: '🧠', label: 'COO', roles: ['admin'] },
      { href: '/financeiro', icon: '💰', label: 'Financeiro', roles: ['admin', 'financeiro'] },
      { href: '/comercial', icon: '💼', label: 'Comercial', roles: ['admin', 'closer'] },
      { href: '/trafego', icon: '📣', label: 'Trafego', roles: ['admin', 'cmo'] },
      { href: '/sdr', icon: '📞', label: 'SDR', roles: ['admin', 'sdr', 'closer'] },
      { href: '/cs', icon: '🎯', label: 'CS', roles: ['admin', 'cs'] },
    ],
  },
  {
    label: 'Operacao',
    items: [
      { href: '/onboarding', icon: '🚀', label: 'Novo Cliente', roles: ['admin', 'cs'] },
      { href: '/clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'cs'] },
      { href: '/jornada', icon: '📈', label: 'Jornada D0-D90', roles: ['admin', 'cs'] },
      { href: '/cs/calendario', icon: '📅', label: 'Calendario', roles: ['admin', 'cs'] },
      { href: '/operacao/financeiro', icon: '💰', label: 'Financeiro', roles: ['admin'] },
      { href: '/operacao/colaboradores', icon: '👥', label: 'Colaboradores', roles: ['admin'] },
      { href: '/alertas', icon: '🚨', label: 'Alertas', roles: ['admin', 'cs'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/usuarios', icon: '🔐', label: 'Usuarios', roles: ['admin'] },
    ],
  },
]

function hasAnyRole(userRoles: string[], itemRoles: string[]): boolean {
  return itemRoles.some(r => userRoles.includes(r))
}

const tipoIcon: Record<string, string> = { clinica: '🏥', lead: '📞', pipeline: '💼', financeiro: '💰' }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [nome, setNome] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [notifs, setNotifs] = useState(0)
  const [notifsData, setNotifsData] = useState<Array<{ id: string; titulo: string; mensagem: string; link: string }>>([])
  const [showNotifs, setShowNotifs] = useState(false)

  // Mobile drawer
  const [mobileOpen, setMobileOpen] = useState(false)

  // Global search
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadUser = useCallback(async () => {
    try {
      let email: string | undefined
      const { data: { session } } = await supabase.auth.getSession()
      email = session?.user?.email ?? undefined
      if (!email) {
        const { data: { user } } = await supabase.auth.getUser()
        email = user?.email ?? undefined
      }
      if (email) {
        setUserEmail(email)
        const { data: interno } = await supabase.from('usuarios_internos').select('role, roles, nome').eq('email', email).single()
        if (interno) {
          const roles = (interno.roles && interno.roles.length > 0) ? interno.roles : [interno.role]
          setUserRoles(roles)
          setNome(interno.nome)
        }
        try {
          const nr = await fetch(`/api/notificacoes?email=${encodeURIComponent(email)}`)
          const nd = await nr.json()
          const items = nd.notificacoes || []
          setNotifs(items.length)
          setNotifsData(items.slice(0, 5))
        } catch { /* */ }
      }
    } catch { /* */ }
    setLoaded(true)
  }, [])

  useEffect(() => {
    loadUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) loadUser()
      else { setUserRoles([]); setNome('') }
    })
    return () => subscription.unsubscribe()
  }, [loadUser])

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Search debounce
  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    if (q.length < 2) { setSearchResults([]); setShowSearch(false); return }
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        setSearchResults(data.results || [])
        setShowSearch(true)
      } catch { /* */ }
    }, 300)
  }

  const filteredSections = loaded
    ? allSections.map(s => ({ ...s, items: s.items.filter(i => hasAnyRole(userRoles, i.roles)) })).filter(s => s.items.length > 0)
    : []

  const logout = async () => { await supabase.auth.signOut(); router.push('/') }
  const roleDisplay = userRoles.map(r => r.toUpperCase()).join(' + ')

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-lg">⚔️ Excalibur HQ</h1>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNotifs(!showNotifs)} style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#9ca3af' }}>
              🔔
              {notifs > 0 && <span style={{ position: 'absolute', top: -4, right: -6, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{notifs}</span>}
            </button>
            {showNotifs && notifsData.length > 0 && (
              <div style={{ position: 'absolute', top: 28, right: 0, width: 260, background: '#1a1a2e', border: '1px solid #252535', borderRadius: 10, zIndex: 50, overflow: 'hidden', boxShadow: '0 8px 24px #00000060' }}>
                {notifsData.map(n => (
                  <button key={n.id} onClick={async () => {
                    await fetch('/api/notificacoes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) })
                    setNotifs(prev => Math.max(0, prev - 1))
                    setNotifsData(prev => prev.filter(x => x.id !== n.id))
                    setShowNotifs(false)
                    if (n.link) router.push(n.link)
                  }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #252535', cursor: 'pointer' }}>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 600, marginBottom: 2 }}>{n.titulo}</div>
                    {n.mensagem && <div style={{ fontSize: 10, color: '#6b7280' }}>{n.mensagem.slice(0, 60)}</div>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="text-gray-500 text-[10px] mt-0.5">Sistema Operacional</p>

        {/* Busca global */}
        <div style={{ position: 'relative', marginTop: 10 }}>
          <input
            value={searchQuery}
            onChange={e => handleSearch(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowSearch(true)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            placeholder="Buscar..."
            style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '6px 10px 6px 28px', color: '#fff', fontSize: 11, outline: 'none' }}
          />
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#4b5563' }}>🔍</span>
          {showSearch && searchResults.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1a1a2e', border: '1px solid #252535', borderRadius: 8, zIndex: 60, maxHeight: 240, overflowY: 'auto', boxShadow: '0 8px 24px #00000060', marginTop: 4 }}>
              {searchResults.map((r, i) => (
                <button key={i} onClick={() => { router.push(r.href); setShowSearch(false); setSearchQuery(''); setMobileOpen(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 12px', background: 'transparent', border: 'none', borderBottom: '1px solid #252535', cursor: 'pointer' }}>
                  <span style={{ fontSize: 14 }}>{tipoIcon[r.tipo] || '📋'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome}</div>
                    <div style={{ fontSize: 9, color: '#6b7280' }}>{r.tipo} · {r.sub}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="p-3 flex flex-col gap-0.5 flex-1 overflow-auto">
        {filteredSections.map((section) => (
          <div key={section.label} className="mb-3">
            <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-2 mb-1">{section.label}</p>
            {section.items.map(({ href, icon, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
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
        <button onClick={logout} className="text-gray-500 hover:text-red-400 text-[10px] transition w-full text-left">Sair</button>
        <p className="text-gray-700 text-[9px] mt-1">Excalibur HQ v1.3</p>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 bg-gray-900 border border-gray-700 rounded-lg p-2 text-white"
        style={{ display: mobileOpen ? 'none' : undefined }}
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — desktop: always visible, mobile: drawer */}
      <div className={`
        bg-gray-900 border-r border-gray-800 flex flex-col shrink-0
        fixed md:static z-50 md:z-auto
        h-screen md:h-auto
        w-56
        transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} style={{ minHeight: '100vh' }}>
        <SidebarContent />
      </div>
    </>
  )
}
