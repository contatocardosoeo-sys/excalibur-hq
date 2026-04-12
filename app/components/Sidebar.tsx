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
      { href: '/coo', icon: '🧠', label: 'COO', roles: ['admin', 'coo'] },
      { href: '/financeiro', icon: '💰', label: 'Financeiro', roles: ['admin', 'coo', 'financeiro'] },
      { href: '/comercial', icon: '💼', label: 'Comercial', roles: ['admin', 'coo', 'closer'] },
      { href: '/trafego', icon: '📣', label: 'Trafego', roles: ['admin', 'coo', 'cmo', 'closer'] },
      { href: '/sdr', icon: '📲', label: 'SDR', roles: ['admin', 'coo', 'sdr', 'closer'] },
      { href: '/cs', icon: '🎯', label: 'CS', roles: ['admin', 'coo', 'cs'] },
    ],
  },
  {
    label: 'Operacao',
    items: [
      { href: '/escritorio', icon: '🏢', label: 'Escritório Online', roles: ['admin', 'coo', 'cs', 'sdr', 'closer', 'cmo', 'financeiro', 'head_traffic', 'editor_video', 'designer'] },
      { href: '/onboarding', icon: '🚀', label: 'Novo Cliente', roles: ['admin', 'coo', 'cs'] },
      { href: '/clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'coo', 'cs', 'closer', 'sdr'] },
      { href: '/jornada', icon: '📈', label: 'Jornada do Cliente', roles: ['admin', 'coo', 'cs', 'sdr'] },
      { href: '/trafego-clientes', icon: '📣', label: 'Trafego Clientes', roles: ['admin', 'coo', 'cs', 'head_traffic'] },
      { href: '/design', icon: '🎨', label: 'Design & Vídeo', roles: ['admin', 'coo', 'cs', 'sdr', 'closer', 'cmo', 'head_traffic', 'editor_video', 'designer'] },
      { href: '/cs/calendario', icon: '📅', label: 'Calendario', roles: ['admin', 'coo', 'cs'] },
      { href: '/operacao/financeiro', icon: '💰', label: 'Financeiro', roles: ['admin', 'coo', 'financeiro'] },
      { href: '/alertas', icon: '🚨', label: 'Alertas', roles: ['admin', 'coo', 'cs', 'sdr', 'closer'] },
    ],
  },
  {
    label: 'Migração HQ-only',
    items: [
      { href: '/migracao', icon: '⚔️', label: 'Minha trilha', roles: ['admin', 'coo', 'cs', 'sdr', 'closer', 'cmo', 'financeiro', 'head_traffic', 'editor_video', 'designer'] },
      { href: '__MIGRACAO_ROLE__', icon: '📍', label: 'Minha trilha detalhada', roles: ['admin', 'coo', 'cs', 'sdr', 'closer', 'cmo', 'financeiro', 'head_traffic', 'editor_video', 'designer'] },
      { href: '/migracao/checkin', icon: '✅', label: 'Checkin do dia', roles: ['admin', 'coo', 'cs', 'sdr', 'closer', 'cmo', 'financeiro', 'head_traffic', 'editor_video', 'designer'] },
      { href: '/importar', icon: '📥', label: 'Importar dados', roles: ['admin', 'coo', 'cs', 'sdr', 'closer', 'cmo', 'financeiro', 'head_traffic', 'editor_video', 'designer'] },
      { href: '/coo/migracao', icon: '📊', label: 'Adoção equipe', roles: ['admin', 'coo'] },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/metas', icon: '🎯', label: 'Metas & Funil', roles: ['admin', 'coo'] },
      { href: '/admin/comissoes', icon: '💰', label: 'Comissões', roles: ['admin', 'coo'] },
      { href: '/admin/inteligencia', icon: '🧠', label: 'Inteligência', roles: ['admin', 'coo'] },
      { href: '/eventos', icon: '⚡', label: 'Eventos', roles: ['admin', 'coo'] },
      { href: '/operacao/colaboradores', icon: '🧑‍💼', label: 'Colaboradores', roles: ['admin', 'coo'] },
      { href: '/sistema/apis', icon: '🔌', label: 'APIs', roles: ['admin'] },
      { href: '/sistema/webhooks', icon: '📡', label: 'Webhooks', roles: ['admin'] },
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
  // Desktop collapsed (persistido em localStorage)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      if (saved === '1') setCollapsed(true)
    }
  }, [])

  const toggleCollapsed = () => {
    const novo = !collapsed
    setCollapsed(novo)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', novo ? '1' : '0')
    }
  }

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

  // Atalho "/" para focar na busca global · Esc para sair
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const tag = target?.tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        if (e.key === 'Escape' && (target as HTMLInputElement).placeholder?.toLowerCase().includes('buscar')) {
          (target as HTMLInputElement).blur()
        }
        return
      }
      if (e.key === '/') {
        e.preventDefault()
        const busca = document.querySelector<HTMLInputElement>('input[placeholder*="Buscar"], input[placeholder*="buscar"]')
        if (busca) { busca.focus(); busca.select() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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

  // Resolver href dinâmico __MIGRACAO_ROLE__ com base no role do usuário
  const resolveHref = (href: string): string => {
    if (href === '__MIGRACAO_ROLE__') {
      const r = userRoles[0] || 'admin'
      return `/migracao/${r}`
    }
    return href
  }

  const filteredSections = loaded
    ? allSections.map(s => ({
        ...s,
        items: s.items
          .filter(i => hasAnyRole(userRoles, i.roles))
          .map(i => ({ ...i, href: resolveHref(i.href) })),
      })).filter(s => s.items.length > 0)
    : []

  const logout = async () => { await supabase.auth.signOut(); router.push('/') }
  const roleDisplay = userRoles.map(r => r.toUpperCase()).join(' + ')

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-white font-bold text-lg">⚔️ Excalibur HQ</h1>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowNotifs(!showNotifs)} aria-label="Notificacoes" title="Notificacoes" style={{ fontSize: 16, background: 'none', border: 'none', cursor: 'pointer', position: 'relative', color: '#9ca3af' }}>
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
            placeholder="Buscar... (/)"
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

      <nav id="sidebar-nav" className="p-3 flex flex-col gap-0.5 flex-1 overflow-auto">
        {filteredSections.map((section, sectionIdx) => (
          <div key={section.label} className="mb-3">
            {sectionIdx > 0 && <div className="border-t border-gray-800/60 mb-3 -mx-1" />}
            <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-2 mb-1.5">{section.label}</p>
            {section.items.map(({ href, icon, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition ${
                    active
                      ? 'bg-amber-500 text-gray-950 font-semibold border-l-2 border-amber-300'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white border-l-2 border-transparent'
                  }`}>
                  <span className="text-sm">{icon}</span> {label}
                </Link>
              )
            })}
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

  // Versao colapsada (so icones)
  const CollapsedSidebar = () => (
    <div style={{ width: 56, background: '#111827', borderRight: '1px solid #1f2937', display: 'flex', flexDirection: 'column', minHeight: '100vh', alignItems: 'center', padding: '12px 0' }}>
      <button onClick={toggleCollapsed} style={{ background: '#1f2937', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#9ca3af', marginBottom: 12 }} title="Expandir sidebar">☰</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, width: '100%', padding: '0 6px', overflowY: 'auto' }}>
        {filteredSections.map(section => section.items.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} title={label} aria-label={label} data-tooltip={label}
              className="sidebar-collapsed-link"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 44, height: 44, borderRadius: 8,
                background: active ? '#f59e0b' : 'transparent',
                color: active ? '#030712' : '#9ca3af',
                fontSize: 18, textDecoration: 'none',
              }}>
              {icon}
            </Link>
          )
        }))}
      </div>
      <button onClick={logout} title="Sair" style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 16, padding: 8 }}>↪</button>
    </div>
  )

  // Titulo da rota atual (para o mobile top bar)
  const currentItem = filteredSections.flatMap(s => s.items).find(i => pathname === i.href || pathname.startsWith(i.href + '/'))
  const currentLabel = currentItem?.label || 'Excalibur HQ'
  const currentIcon = currentItem?.icon || '⚔️'

  return (
    <>
      {/* ── MOBILE TOP BAR (fixa, h-14, cobre a largura toda) ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-3" style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="w-11 h-11 flex items-center justify-center rounded-lg text-white hover:bg-gray-800 active:bg-gray-700 transition"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">{currentIcon}</span>
          <span className="text-white text-sm font-semibold truncate max-w-[55vw]">{currentLabel}</span>
        </div>
        <button
          onClick={() => setShowNotifs(!showNotifs)}
          aria-label="Notificações"
          className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 relative"
        >
          <span className="text-lg">🔔</span>
          {notifs > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{notifs}</span>
          )}
        </button>
      </div>

      {/* Overlay quando drawer aberto */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      {/* Drawer mobile (largo, quase full-width) */}
      <div className={`md:hidden fixed top-0 left-0 bottom-0 z-50 w-[78vw] max-w-[320px] bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-250 ease-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Fechar menu"
            className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white z-10"
          >
            ✕
          </button>
        )}
        <SidebarContent />
      </div>

      {/* ── DESKTOP sidebar ── */}
      {collapsed ? (
        <div className="hidden md:flex shrink-0">
          <CollapsedSidebar />
        </div>
      ) : (
        <div className="hidden md:flex bg-gray-900 border-r border-gray-800 flex-col shrink-0 md:static z-auto w-56 relative" style={{ minHeight: '100vh' }}>
          <button onClick={toggleCollapsed} className="absolute -right-3 top-6 z-10 bg-gray-800 border border-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 transition" title="Recolher sidebar">
            ←
          </button>
          <SidebarContent />
        </div>
      )}
    </>
  )
}
