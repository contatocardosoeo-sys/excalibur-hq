'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

// ─────────────────────────────────────────────
// CONSTANTES DO MUNDO
// ─────────────────────────────────────────────
const TILE = 32
const MAP_W = 38
const MAP_H = 28

// Salas: [x1, y1, x2, y2, codigo, nome, chao, parede, label]
const SALAS: Array<{ x1: number; y1: number; x2: number; y2: number; cod: number; nome: string; chao: string; parede: string; label: string; rota?: string }> = [
  { x1: 1,  y1: 1,  x2: 9,  y2: 8,  cod: 2, nome: 'SDR',       chao: '#0a1f0a', parede: '#1a5c1a', label: '#22c55e', rota: '/sdr' },
  { x1: 11, y1: 1,  x2: 22, y2: 8,  cod: 3, nome: 'Comercial', chao: '#1f1400', parede: '#5c3a00', label: '#f59e0b', rota: '/comercial' },
  { x1: 24, y1: 1,  x2: 36, y2: 8,  cod: 4, nome: 'CS',        chao: '#0a0a1f', parede: '#1a1a5c', label: '#6366f1', rota: '/cs' },
  { x1: 1,  y1: 10, x2: 9,  y2: 16, cod: 8, nome: 'Copa',      chao: '#0e1518', parede: '#1a3040', label: '#94a3b8' },
  { x1: 11, y1: 10, x2: 26, y2: 18, cod: 9, nome: 'Reunião',   chao: '#111128', parede: '#252546', label: '#cbd5e1' },
  { x1: 28, y1: 10, x2: 36, y2: 18, cod: 5, nome: 'Tráfego',   chao: '#150a1f', parede: '#4a1a6e', label: '#a855f7', rota: '/trafego' },
  { x1: 1,  y1: 18, x2: 9,  y2: 26, cod: 6, nome: 'CEO',       chao: '#1f0505', parede: '#5c0a0a', label: '#ef4444', rota: '/ceo' },
  { x1: 11, y1: 19, x2: 22, y2: 26, cod: 7, nome: 'COO',       chao: '#051a10', parede: '#0a5c35', label: '#10b981', rota: '/coo' },
]

const ROLE_COLOR: Record<string, { main: string; dark: string; ini: string }> = {
  admin:   { main: '#ef4444', dark: '#991b1b', ini: 'C' },
  coo:     { main: '#10b981', dark: '#065f46', ini: 'L' },
  sdr:     { main: '#22c55e', dark: '#15803d', ini: 'T' },
  closer:  { main: '#f59e0b', dark: '#92400e', ini: 'G' },
  cmo:     { main: '#a855f7', dark: '#6b21a8', ini: 'G' },
  cs:      { main: '#6366f1', dark: '#3730a3', ini: 'M' },
  default: { main: '#6b7280', dark: '#374151', ini: '?' },
}

const CHAR_START: Record<string, { x: number; y: number }> = {
  admin:  { x: 4,  y: 22 },
  coo:    { x: 15, y: 22 },
  sdr:    { x: 4,  y: 4  },
  closer: { x: 14, y: 4  },
  cmo:    { x: 32, y: 14 },
  cs:     { x: 28, y: 4  },
}

// NPCs com path de patrulha + status dinâmico
type Pt = { x: number; y: number }
type NPC = {
  id: string; nome: string; role: string; ini: string
  x: number; y: number
  path: Pt[]; pathIdx: number
  status: 'online' | 'away' | 'offline'
  isReal?: boolean // true quando é um usuário logado real (via presence sync)
  email?: string
}
const NPCS_BASE: NPC[] = [
  { id: 'trindade',  nome: 'Trindade',  role: 'sdr',    ini: 'T', x: 4,  y: 4,  pathIdx: 0, status: 'online',
    path: [{ x: 3, y: 4 }, { x: 6, y: 4 }, { x: 6, y: 7 }, { x: 3, y: 7 }] },
  { id: 'guilherme', nome: 'Guilherme', role: 'closer', ini: 'G', x: 14, y: 4,  pathIdx: 0, status: 'online',
    path: [{ x: 13, y: 4 }, { x: 18, y: 4 }, { x: 18, y: 7 }, { x: 13, y: 7 }] },
  { id: 'medina',    nome: 'Medina',    role: 'cs',     ini: 'M', x: 28, y: 4,  pathIdx: 0, status: 'away',
    path: [{ x: 28, y: 4 }] },
  { id: 'luana',     nome: 'Luana',     role: 'coo',    ini: 'L', x: 15, y: 22, pathIdx: 0, status: 'online',
    path: [{ x: 14, y: 22 }, { x: 17, y: 22 }, { x: 17, y: 24 }, { x: 14, y: 24 }] },
  { id: 'cardoso',   nome: 'Cardoso',   role: 'admin',  ini: 'C', x: 4,  y: 22, pathIdx: 0, status: 'online',
    path: [{ x: 3, y: 22 }, { x: 6, y: 22 }, { x: 6, y: 24 }, { x: 3, y: 24 }] },
]

// ─────────────────────────────────────────────
// BUILD MAP — Uint8Array com codigo por tile
// (cod*10) = chão, (cod*10+1) = parede
// ─────────────────────────────────────────────
function buildMap() {
  const map = new Uint8Array(MAP_W * MAP_H)
  // Paredes externas
  for (let x = 0; x < MAP_W; x++) { map[x] = 1; map[(MAP_H - 1) * MAP_W + x] = 1 }
  for (let y = 0; y < MAP_H; y++) { map[y * MAP_W] = 1; map[y * MAP_W + MAP_W - 1] = 1 }
  // Salas
  for (const s of SALAS) {
    // Chão
    for (let y = s.y1; y <= s.y2; y++) {
      for (let x = s.x1; x <= s.x2; x++) {
        map[y * MAP_W + x] = s.cod * 10
      }
    }
    // Paredes (apenas borda, deixando 1 porta no meio da borda inferior)
    const doorX = Math.floor((s.x1 + s.x2) / 2)
    for (let x = s.x1; x <= s.x2; x++) {
      map[s.y1 * MAP_W + x] = s.cod * 10 + 1
      if (x !== doorX) map[s.y2 * MAP_W + x] = s.cod * 10 + 1
    }
    for (let y = s.y1; y <= s.y2; y++) {
      map[y * MAP_W + s.x1] = s.cod * 10 + 1
      map[y * MAP_W + s.x2] = s.cod * 10 + 1
    }
  }
  return map
}

function isWalkable(map: Uint8Array, x: number, y: number) {
  if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return false
  const t = map[Math.floor(y) * MAP_W + Math.floor(x)]
  return t !== 1 && (t % 10 !== 1)
}

function salaDe(x: number, y: number): string {
  for (const s of SALAS) {
    if (x >= s.x1 && x <= s.x2 && y >= s.y1 && y <= s.y2) return s.nome
  }
  return 'Corredor'
}

function getSalaPorNome(nome: string) {
  return SALAS.find(s => s.nome === nome)
}

// ─────────────────────────────────────────────
// PÁGINA
// ─────────────────────────────────────────────
type Metrics = {
  mrr: number; caixa: number; fechamentos: number; fechamentosMeta: number
  leads: number; leadsMeta: number; clientes: number; scoreMedio: number
}

type Alerta = { tipo: string; prioridade: string; descricao: string; cliente_nome: string }
type Evento = { id: string; tipo: string; titulo: string; mensagem: string; created_at: string }

export default function EscritorioPage() {
  const router = useRouter()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [userInfo, setUserInfo] = useState<{ email: string; nome: string; role: string } | null>(null)
  const [location, setLocation] = useState('Carregando...')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [, setAlertas] = useState<Alerta[]>([])
  const [, setEventos] = useState<Evento[]>([])
  const [selectedChar, setSelectedChar] = useState<NPC | null>(null)
  const [presentes, setPresentes] = useState<Array<{ email: string; nome: string; role: string; sala: string; status: string }>>([])
  const [toasts, setToasts] = useState<Array<{ id: number; text: string; type: string }>>([])
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<Array<{ autor: string; texto: string; sistema?: boolean }>>([
    { autor: 'Sistema HQ 🤖', texto: '🔔 Bem-vindo ao Escritório Online! Use WASD pra andar, E pra interagir, arraste com Alt pra mover a câmera.', sistema: true },
  ])
  const [chatInput, setChatInput] = useState('')

  // Game state em ref (evita re-render)
  const stateRef = useRef({
    myX: 18,
    myY: 14,
    camX: 0,
    camY: 0,
    scale: 1.6,
    keys: {} as Record<string, boolean>,
    walkT: 0,
    npcs: NPCS_BASE.map(n => ({ ...n })),
    rafId: 0,
    mapArr: null as Uint8Array | null,
    // Mouse drag pan
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragCamX: 0,
    dragCamY: 0,
    // Follow camera toggle — quando true, câmera segue myX/myY; quando false, manual (após drag)
    followCam: true,
    // Inatividade
    lastActivity: Date.now(),
    // Status atual (reflete pra presence)
    myStatus: 'online' as 'online' | 'away' | 'offline',
    // Controle de toasts e eventos já vistos
    eventosIds: new Set<string>(),
    toastCounter: 0,
  })

  const addToast = useCallback((text: string, type: string = 'info') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, text, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const ringGong = useCallback(() => {
    addToast('🔔 GONGO! Vitória da Excalibur! 🎉', 'venda')
    setChatMsgs(prev => [...prev, {
      autor: 'Sistema HQ 🔔',
      texto: `🎉 ${userInfo?.nome.split(' ')[0] || 'Alguém'} bateu o gongo! A equipe toda celebra!`,
      sistema: true,
    }])
    // Dispara evento pro sistema de eventos
    fetch('/api/hq/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'venda_fechada',
        titulo: '🔔 GONGO!',
        mensagem: `${userInfo?.nome || 'Alguém'} bateu o gongo da vitória`,
        camada: 'todos',
        roles_visibilidade: ['admin', 'cs', 'sdr', 'closer', 'cmo', 'coo'],
      }),
    }).catch(() => { /* */ })
  }, [addToast, userInfo])

  // ─── 1. Carregar sessão do usuário ───
  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) {
        router.push('/')
        return
      }
      const { data: interno } = await supabase
        .from('usuarios_internos')
        .select('nome, role, roles')
        .eq('email', session.user.email)
        .single()
      const roles: string[] = (interno?.roles && Array.isArray(interno.roles) && interno.roles.length > 0)
        ? interno.roles : [interno?.role || 'cs']
      const role = roles[0] || 'cs'
      const nome = interno?.nome || session.user.email

      setUserInfo({ email: session.user.email, nome, role })

      // Posição inicial baseada no role
      const start = CHAR_START[role] || { x: 18, y: 14 }
      stateRef.current.myX = start.x
      stateRef.current.myY = start.y

      // Remover o próprio usuário dos NPCs (ele é o jogador) — match por email
      const emailToId: Record<string, string> = {
        'contato.cardosoeo@gmail.com': 'cardoso',
        'luanacaira.excalibur@gmail.com': 'luana',
        'brunomedina.contato@gmail.com': 'medina',
        'guilherme.excalibur@gmail.com': 'guilherme',
        'trindade.excalibur@gmail.com': 'trindade',
      }
      const meuId = emailToId[session.user.email] || ''
      stateRef.current.npcs = NPCS_BASE
        .filter(n => n.id !== meuId)
        .map(n => ({ ...n })) // cópia pra evitar mutação compartilhada
    })()
  }, [router])

  // ─── 2. Buscar dados reais ───
  useEffect(() => {
    ;(async () => {
      try {
        const [comR, ceoR, trfgR, cockpitR, alertR, evsR] = await Promise.all([
          fetch('/api/comercial/stats').then(r => r.json()),
          fetch('/api/ceo/dashboard').then(r => r.json()),
          fetch('/api/trafego/funil').then(r => r.json()).catch(() => ({ funil: null })),
          fetch('/api/cs/cockpit').then(r => r.json()).catch(() => ({ kpis: null })),
          fetch('/api/hq/alertas').then(r => r.json()),
          fetch('/api/hq/eventos?limit=10').then(r => r.json()),
        ])
        setMetrics({
          mrr: ceoR?.crescimento?.mrr || 81800,
          caixa: ceoR?.financeiro_ceo?.caixa || 0,
          fechamentos: comR?.fechamentos || 5,
          fechamentosMeta: comR?.meta_fechamentos || 5,
          leads: ceoR?.funil?.leads || 141,
          leadsMeta: 300,
          clientes: cockpitR?.kpis?.total_ativos || 48,
          scoreMedio: cockpitR?.kpis?.score_medio || 11,
        })
        setAlertas(alertR?.alertas || [])
        setEventos(evsR?.eventos || [])
      } catch (e) {
        console.error('Erro ao buscar metricas:', e)
      }
    })()
  }, [])

  // ─── 3. Ping de presença (a cada 10s) + status away automático ───
  useEffect(() => {
    if (!userInfo) return
    const ping = async () => {
      const st = stateRef.current
      // Away automático se 3min sem input
      const inactiveMs = Date.now() - st.lastActivity
      const statusAtual: 'online' | 'away' = inactiveMs > 3 * 60 * 1000 ? 'away' : 'online'
      st.myStatus = statusAtual
      try {
        await fetch('/api/escritorio/presenca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userInfo.email,
            role: userInfo.role,
            nome: userInfo.nome,
            status: statusAtual,
            sala: location,
            posX: st.myX,
            posY: st.myY,
          }),
        })
      } catch { /* */ }
    }
    ping()
    const iv = setInterval(ping, 10_000)

    // Tab invisível → away; visibility visível → online
    const onVisibility = () => {
      if (document.hidden) {
        stateRef.current.myStatus = 'away'
      } else {
        stateRef.current.lastActivity = Date.now()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(iv)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [userInfo, location])

  // ─── 4. Presence sync — Supabase Realtime + fallback inicial via fetch ───
  useEffect(() => {
    if (!userInfo) return

    const emailToId: Record<string, string> = {
      'contato.cardosoeo@gmail.com': 'cardoso',
      'luanacaira.excalibur@gmail.com': 'luana',
      'brunomedina.contato@gmail.com': 'medina',
      'guilherme.excalibur@gmail.com': 'guilherme',
      'trindade.excalibur@gmail.com': 'trindade',
    }

    type PresencaRow = {
      user_email: string; user_nome: string; user_role: string;
      sala_atual: string; status: string; pos_x?: number; pos_y?: number
    }

    const aplicarPresenca = (lista: PresencaRow[]) => {
      const outros = lista.filter(p => p.user_email !== userInfo.email)
      setPresentes(outros.map(p => ({
        email: p.user_email,
        nome: p.user_nome,
        role: p.user_role,
        sala: p.sala_atual,
        status: p.status,
      })))
      for (const p of outros) {
        const npcId = emailToId[p.user_email]
        if (!npcId) continue
        const npc = stateRef.current.npcs.find(n => n.id === npcId)
        if (npc) {
          const tx = Number(p.pos_x) || npc.x
          const ty = Number(p.pos_y) || npc.y
          npc.x += (tx - npc.x) * 0.5
          npc.y += (ty - npc.y) * 0.5
          npc.isReal = true
          npc.email = p.user_email
          npc.status = p.status as 'online' | 'away' | 'offline'
          npc.path = [{ x: tx, y: ty }]
          npc.pathIdx = 0
        }
      }
    }

    // Carga inicial via fetch
    let cache: PresencaRow[] = []
    fetch('/api/escritorio/presenca')
      .then(r => r.json())
      .then(r => {
        cache = (r.presencas || []) as PresencaRow[]
        aplicarPresenca(cache)
      })
      .catch(() => { /* */ })

    // Subscription Realtime
    const channel = supabase
      .channel('escritorio-presenca')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'escritorio_presenca' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const novo = payload.new as PresencaRow
            cache = cache.filter(p => p.user_email !== novo.user_email).concat(novo)
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { user_email: string }
            cache = cache.filter(p => p.user_email !== old.user_email)
          }
          aplicarPresenca(cache)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userInfo])

  // ─── 4. Game loop ───
  useEffect(() => {
    if (!userInfo) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const map = buildMap()
    stateRef.current.mapArr = map
    const st = stateRef.current

    const handleKeyDown = (e: KeyboardEvent) => {
      st.keys[e.key.toLowerCase()] = true
      st.lastActivity = Date.now()
      // E = interagir
      if (e.key.toLowerCase() === 'e') {
        // Verifica se está perto do gongo (Copa, ~6.5, 11.5)
        const distGongo = Math.hypot(st.myX - 6.5, st.myY - 11.5)
        if (distGongo < 2) {
          ringGong()
          return
        }
        // Verifica NPC perto
        const npc = st.npcs.find(n => Math.abs(n.x - st.myX) < 1.5 && Math.abs(n.y - st.myY) < 1.5)
        if (npc) setSelectedChar(npc)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => { st.keys[e.key.toLowerCase()] = false }

    // Mouse drag pan (qualquer drag arrasta a camera)
    const handleMouseDown = (e: MouseEvent) => {
      st.dragging = true
      st.dragStartX = e.clientX
      st.dragStartY = e.clientY
      st.dragCamX = st.camX
      st.dragCamY = st.camY
      st.followCam = false
      canvas.style.cursor = 'grabbing'
      st.lastActivity = Date.now()
    }
    const handleMouseMove = (e: MouseEvent) => {
      if (!st.dragging) return
      const dx = (e.clientX - st.dragStartX) / st.scale
      const dy = (e.clientY - st.dragStartY) / st.scale
      st.camX = st.dragCamX - dx
      st.camY = st.dragCamY - dy
    }
    const handleMouseUp = () => {
      if (!st.dragging) return
      st.dragging = false
      canvas.style.cursor = 'grab'
    }
    const handleDblClick = () => {
      // Duplo clique → volta a seguir o jogador
      st.followCam = true
    }
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      st.scale = Math.max(0.8, Math.min(2.5, st.scale + delta))
      st.lastActivity = Date.now()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('dblclick', handleDblClick)
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    canvas.style.cursor = 'grab'

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      canvas.width = parent.offsetWidth
      canvas.height = parent.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const update = () => {
      // Input: WASD / setas
      let dx = 0, dy = 0
      const speed = 0.09
      if (st.keys['w'] || st.keys['arrowup'])    dy -= speed
      if (st.keys['s'] || st.keys['arrowdown'])  dy += speed
      if (st.keys['a'] || st.keys['arrowleft'])  dx -= speed
      if (st.keys['d'] || st.keys['arrowright']) dx += speed

      if (dx !== 0 || dy !== 0) {
        st.followCam = true // ao mover, volta a seguir
        st.lastActivity = Date.now()
      }

      // Move X e Y separados (desliza nas paredes)
      if (dx !== 0) {
        const nx = st.myX + dx
        if (isWalkable(map, nx + (dx > 0 ? 0.3 : -0.3), st.myY) &&
            isWalkable(map, nx + (dx > 0 ? 0.3 : -0.3), st.myY + 0.3)) {
          st.myX = nx
        }
      }
      if (dy !== 0) {
        const ny = st.myY + dy
        if (isWalkable(map, st.myX, ny + (dy > 0 ? 0.3 : -0.3)) &&
            isWalkable(map, st.myX + 0.3, ny + (dy > 0 ? 0.3 : -0.3))) {
          st.myY = ny
        }
      }

      if (dx !== 0 || dy !== 0) st.walkT += 0.2

      // NPC path animation: cada NPC persegue próximo waypoint
      for (const n of st.npcs) {
        if (n.status !== 'online' || !n.path || n.path.length < 2) continue
        const target = n.path[n.pathIdx]
        const nx = target.x - n.x
        const ny = target.y - n.y
        const dist = Math.hypot(nx, ny)
        if (dist < 0.1) {
          n.pathIdx = (n.pathIdx + 1) % n.path.length
        } else {
          const npcSpeed = 0.04
          n.x += (nx / dist) * npcSpeed
          n.y += (ny / dist) * npcSpeed
        }
      }

      // Câmera: segue jogador OU fica onde o drag deixou
      if (st.followCam && !st.dragging) {
        const targetCamX = st.myX * TILE - (canvas.width / st.scale) / 2
        const targetCamY = st.myY * TILE - (canvas.height / st.scale) / 2
        st.camX += (targetCamX - st.camX) * 0.12
        st.camY += (targetCamY - st.camY) * 0.12
      }

      // Detectar sala atual
      const salaNome = salaDe(Math.floor(st.myX), Math.floor(st.myY))
      setLocation(prev => prev === salaNome ? prev : salaNome)
    }

    const draw = () => {
      const w = canvas.width, h = canvas.height
      ctx.fillStyle = '#0d0b1a'
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.scale(st.scale, st.scale)
      ctx.translate(-st.camX, -st.camY)

      // Visible bounds
      const startX = Math.max(0, Math.floor(st.camX / TILE) - 1)
      const endX = Math.min(MAP_W, Math.ceil((st.camX + w / st.scale) / TILE) + 1)
      const startY = Math.max(0, Math.floor(st.camY / TILE) - 1)
      const endY = Math.min(MAP_H, Math.ceil((st.camY + h / st.scale) / TILE) + 1)

      // Tiles
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const t = map[y * MAP_W + x]
          let color = '#0d0b1a'
          if (t === 1) color = '#1a1a2e'
          else if (t === 21) color = '#1a5c1a' // sdr parede
          else if (t === 20) color = '#0a1f0a' // sdr chao
          else if (t === 31) color = '#5c3a00'
          else if (t === 30) color = '#1f1400'
          else if (t === 41) color = '#1a1a5c'
          else if (t === 40) color = '#0a0a1f'
          else if (t === 51) color = '#4a1a6e'
          else if (t === 50) color = '#150a1f'
          else if (t === 61) color = '#5c0a0a'
          else if (t === 60) color = '#1f0505'
          else if (t === 71) color = '#0a5c35'
          else if (t === 70) color = '#051a10'
          else if (t === 81) color = '#1a3040'
          else if (t === 80) color = '#0e1518'
          else if (t === 91) color = '#252546'
          else if (t === 90) color = '#111128'

          ctx.fillStyle = color
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE)
        }
      }

      // Grid overlay sutil
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let x = startX; x < endX; x++) {
        ctx.beginPath()
        ctx.moveTo(x * TILE, startY * TILE)
        ctx.lineTo(x * TILE, endY * TILE)
        ctx.stroke()
      }
      for (let y = startY; y < endY; y++) {
        ctx.beginPath()
        ctx.moveTo(startX * TILE, y * TILE)
        ctx.lineTo(endX * TILE, y * TILE)
        ctx.stroke()
      }

      // Labels das salas
      ctx.font = 'bold 11px system-ui'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      for (const s of SALAS) {
        ctx.fillStyle = s.label
        ctx.globalAlpha = 0.75
        ctx.fillText(s.nome.toUpperCase(), s.x1 * TILE + 4, s.y1 * TILE + 4)
        ctx.globalAlpha = 1
      }

      // OBJETOS POR SALA — detalhados
      drawObjects(ctx, metrics)

      // NPCs (outros colaboradores)
      for (const n of st.npcs) {
        drawChar(ctx, n.x, n.y, n.ini, ROLE_COLOR[n.role] || ROLE_COLOR.default, n.nome, false, 0)
      }

      // Eu (jogador)
      const meuRole = userInfo.role
      const meuIni = userInfo.nome.charAt(0).toUpperCase()
      drawChar(ctx, st.myX, st.myY, meuIni, ROLE_COLOR[meuRole] || ROLE_COLOR.default, userInfo.nome.split(' ')[0], true, st.walkT)

      ctx.restore()
    }

    const loop = () => {
      update()
      draw()
      st.rafId = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(st.rafId)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('dblclick', handleDblClick)
      canvas.removeEventListener('wheel', handleWheel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo])

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando escritório...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col bg-[#0d0b1a] overflow-hidden h-[calc(100vh-3.5rem)] md:h-screen">
      {/* TOPBAR MINIMALISTA */}
      <div className="bg-[#080814]/80 backdrop-blur border-b border-white/10 px-4 py-2 flex items-center gap-3 text-xs flex-shrink-0 z-20">
        <span className="text-amber-500 font-bold">⚔️ Escritório Excalibur</span>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-300">{location}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setChatOpen(c => !c)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-gray-300 transition flex items-center gap-1.5 min-h-[32px]"
          >
            💬 Chat
          </button>
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            {userInfo.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* CANVAS TELA CHEIA */}
      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: 'pixelated' }} />

        {/* Overlay: presentes agora (canto superior direito) */}
        <div className="absolute top-4 right-4 bg-black/70 backdrop-blur border border-white/10 rounded-xl p-3 min-w-[180px] z-10 pointer-events-none">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 font-bold mb-2">👥 NO ESCRITÓRIO</p>
          <div className="space-y-1">
            {/* Eu */}
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: (ROLE_COLOR[userInfo.role] || ROLE_COLOR.default).main }}>
                {userInfo.nome.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-[11px] font-semibold truncate flex-1">{userInfo.nome.split(' ')[0]}</span>
              <span className="text-amber-400 text-[9px]">(você)</span>
            </div>
            {/* Outros NPCs base + presentes reais */}
            {NPCS_BASE.filter(n => {
              const emailMap: Record<string, string> = {
                'contato.cardosoeo@gmail.com': 'cardoso',
                'luanacaira.excalibur@gmail.com': 'luana',
                'brunomedina.contato@gmail.com': 'medina',
                'guilherme.excalibur@gmail.com': 'guilherme',
                'trindade.excalibur@gmail.com': 'trindade',
              }
              return n.id !== emailMap[userInfo.email]
            }).map(n => {
              const realUser = presentes.find(p => {
                const map: Record<string, string> = {
                  'contato.cardosoeo@gmail.com': 'cardoso',
                  'luanacaira.excalibur@gmail.com': 'luana',
                  'brunomedina.contato@gmail.com': 'medina',
                  'guilherme.excalibur@gmail.com': 'guilherme',
                  'trindade.excalibur@gmail.com': 'trindade',
                }
                return map[p.email] === n.id
              })
              const online = !!realUser && realUser.status === 'online'
              const cor = ROLE_COLOR[n.role] || ROLE_COLOR.default
              return (
                <div key={n.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white" style={{ background: cor.main, opacity: online ? 1 : 0.5 }}>
                    {n.ini}
                  </div>
                  <span className="text-white text-[11px] truncate flex-1" style={{ opacity: online ? 1 : 0.6 }}>{n.nome}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-green-500' : 'bg-gray-600'}`} />
                </div>
              )
            })}
          </div>
          {presentes.length > 0 && (
            <p className="text-[9px] text-green-400 mt-2 pt-2 border-t border-white/10">
              {presentes.filter(p => p.status === 'online').length + 1} online ao vivo
            </p>
          )}
        </div>

        {/* Hint de teclas */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-gray-400 pointer-events-none whitespace-nowrap z-10">
          WASD/setas: mover · arraste: mover câmera · scroll: zoom · E: interagir/gongo
        </div>

        {/* TOASTS canto superior direito */}
        <div className="absolute top-20 right-4 flex flex-col gap-2 z-30 pointer-events-none max-w-[280px]">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`bg-[#0c0a18]/95 backdrop-blur rounded-xl px-3.5 py-2.5 text-[11px] text-white font-medium border shadow-2xl ${
                t.type === 'venda' ? 'border-amber-500/50' :
                t.type === 'pagamento' ? 'border-green-500/50' :
                t.type === 'cs' ? 'border-indigo-500/50' :
                t.type === 'alerta' ? 'border-red-500/50' :
                'border-white/20'
              }`}
              style={{ animation: 'slideIn 0.3s ease-out' }}
            >
              {t.text}
            </div>
          ))}
        </div>
      </div>

      {/* CHAT INLINE */}
      {chatOpen && (
        <div className="bg-[#080614]/95 backdrop-blur border-t border-white/10 flex flex-col flex-shrink-0" style={{ height: 220 }}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <span className="text-xs font-bold text-amber-400">💬 #geral</span>
            <button onClick={() => setChatOpen(false)} className="text-gray-500 hover:text-white text-sm">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
            {chatMsgs.map((m, i) => (
              <div key={i} className="text-[11px] leading-tight">
                <span className={m.sistema ? 'text-amber-400 font-bold' : 'text-blue-300 font-semibold'}>{m.autor}</span>
                <span className="text-gray-400 ml-2">{m.texto}</span>
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 px-4 py-2 border-t border-white/5"
            onSubmit={(e) => {
              e.preventDefault()
              if (!chatInput.trim()) return
              setChatMsgs(prev => [...prev, { autor: userInfo.nome.split(' ')[0], texto: chatInput.trim() }])
              setChatInput('')
            }}
          >
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Mensagem..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/50"
            />
            <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg px-4 py-1.5 text-xs transition">
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* PROFILE MODAL */}
      {selectedChar && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/60 p-4" onClick={() => setSelectedChar(null)}>
          <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg" style={{ background: (ROLE_COLOR[selectedChar.role] || ROLE_COLOR.default).main }}>
                {selectedChar.ini}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedChar.nome}</h2>
                <p className="text-gray-500 text-sm uppercase">{selectedChar.role}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Online · {salaDe(selectedChar.x, selectedChar.y)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelectedChar(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg px-3 py-2 text-sm transition">
                Fechar
              </button>
              {SALAS.find(s => s.nome === salaDe(selectedChar.x, selectedChar.y))?.rota && (
                <button
                  onClick={() => router.push(SALAS.find(s => s.nome === salaDe(selectedChar.x, selectedChar.y))!.rota!)}
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-lg px-3 py-2 text-sm transition"
                >
                  🖥 Ver tela
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────
// HELPER: Desenhar personagem
// ─────────────────────────────────────────────
function drawChar(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  inicial: string,
  cor: { main: string; dark: string; ini: string },
  nome: string,
  isMe: boolean,
  walkT: number
) {
  const cx = x * TILE + TILE / 2
  const cy = y * TILE + TILE / 2
  const bob = Math.sin(walkT) * 1.5

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 12, 10, 3, 0, 0, Math.PI * 2)
  ctx.fill()

  // Selection ring (só eu)
  if (isMe) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy - 2 + bob, 13, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.beginPath()
    ctx.arc(cx, cy - 2 + bob, 16, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Corpo (rect arredondado)
  ctx.fillStyle = cor.dark
  ctx.fillRect(cx - 6, cy + bob, 12, 10)

  // Cabeça
  ctx.fillStyle = cor.main
  ctx.beginPath()
  ctx.arc(cx, cy - 3 + bob, 9, 0, Math.PI * 2)
  ctx.fill()

  // Olhos
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(cx - 3, cy - 4 + bob, 1.2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 3, cy - 4 + bob, 1.2, 0, Math.PI * 2); ctx.fill()

  // Boca (arc)
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy - 1 + bob, 2, 0, Math.PI)
  ctx.stroke()

  // Inicial
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 9px system-ui'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(inicial, cx, cy - 9 + bob)

  // Nome pill
  ctx.font = 'bold 9px system-ui'
  const tw = ctx.measureText(nome).width
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  ctx.fillRect(cx - tw / 2 - 4, cy + 14, tw + 8, 12)
  ctx.fillStyle = '#fff'
  ctx.fillText(nome, cx, cy + 20)

  // Status dot (online)
  ctx.fillStyle = '#22c55e'
  ctx.beginPath()
  ctx.arc(cx + 7, cy - 8 + bob, 2, 0, Math.PI * 2)
  ctx.fill()
}

// ─────────────────────────────────────────────
// HELPER: Desenhar objetos por sala
// ─────────────────────────────────────────────
function drawObjects(ctx: CanvasRenderingContext2D, metrics: Metrics | null) {
  const T = TILE

  const mesa = (x: number, y: number, w = 3, h = 1.4) => {
    ctx.fillStyle = '#2a2040'
    ctx.fillRect(x * T, y * T, w * T, h * T)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    ctx.strokeRect(x * T, y * T, w * T, h * T)
  }
  const monitor = (x: number, y: number, label: string, cor: string) => {
    ctx.fillStyle = '#0a0a14'
    ctx.fillRect(x * T + 4, y * T - 2, T * 1.3, T * 0.9)
    ctx.fillStyle = cor
    ctx.globalAlpha = 0.5
    ctx.fillRect(x * T + 5, y * T - 1, T * 1.3 - 2, T * 0.9 - 2)
    ctx.globalAlpha = 1
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 8px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x * T + 4 + (T * 1.3) / 2, y * T - 2 + (T * 0.9) / 2)
  }
  const cadeira = (x: number, y: number) => {
    ctx.fillStyle = '#1a1530'
    ctx.beginPath()
    ctx.arc(x * T, y * T, 10, 0, Math.PI * 2)
    ctx.fill()
  }
  const planta = (x: number, y: number) => {
    ctx.fillStyle = '#1f3820'
    ctx.beginPath()
    ctx.arc(x * T, y * T, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#22c55e'
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    ctx.arc(x * T, y * T - 1, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
  const whiteboard = (x1: number, y1: number, x2: number, y2: number, texto: string, cor = '#fff') => {
    ctx.fillStyle = 'rgba(232,232,240,0.06)'
    ctx.fillRect(x1 * T, y1 * T, (x2 - x1) * T, (y2 - y1) * T)
    ctx.strokeStyle = 'rgba(232,232,240,0.2)'
    ctx.lineWidth = 1
    ctx.strokeRect(x1 * T, y1 * T, (x2 - x1) * T, (y2 - y1) * T)
    ctx.fillStyle = cor
    ctx.font = 'bold 9px system-ui'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(texto, ((x1 + x2) / 2) * T, ((y1 + y2) / 2) * T)
  }

  // ─── SDR ───
  mesa(2, 2.6)
  monitor(2, 2.4, '/sdr', '#22c55e')
  cadeira(3.5, 4.5)
  mesa(6, 2.6)
  monitor(6, 2.4, 'ACL', '#22c55e')
  cadeira(7.5, 4.5)
  whiteboard(2, 6.2, 8.5, 7.2, '300 leads · 90 agend · 54 comp · 3 vendas')
  planta(8.5, 2)
  planta(1.8, 6)

  // ─── Comercial ───
  mesa(12, 2.6)
  monitor(12, 2.4, 'Kanban', '#f59e0b')
  cadeira(13.5, 4.5)
  // Mini-kanban
  const kanX = 17 * T, kanY = 1.8 * T
  ctx.fillStyle = 'rgba(245,158,11,0.08)'
  ctx.fillRect(kanX, kanY, 3.5 * T, 5 * T)
  ctx.strokeStyle = 'rgba(245,158,11,0.3)'
  ctx.strokeRect(kanX, kanY, 3.5 * T, 5 * T)
  ctx.fillStyle = '#fbbf24'
  ctx.font = 'bold 8px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText('PIPELINE', kanX + 4, kanY + 10)
  // 3 colunas
  ctx.font = '7px system-ui'
  const cols = [
    { x: kanX + 4, label: 'Reun', count: 0 },
    { x: kanX + 4 + (3.5 * T - 8) / 3, label: 'Prop', count: 0 },
    { x: kanX + 4 + 2 * (3.5 * T - 8) / 3, label: '✓ Fech', count: metrics?.fechamentos || 5 },
  ]
  for (const c of cols) {
    ctx.fillStyle = c.label.includes('Fech') ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.08)'
    ctx.fillRect(c.x, kanY + 18, (3.5 * T - 8) / 3 - 2, 5 * T - 22)
    ctx.fillStyle = c.label.includes('Fech') ? '#22c55e' : '#fbbf24'
    ctx.fillText(c.label, c.x + 2, kanY + 28)
    ctx.font = 'bold 14px system-ui'
    ctx.fillText(String(c.count), c.x + 2, kanY + 50)
    ctx.font = '7px system-ui'
  }
  // TV com métricas reais
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(12 * T, 7.2 * T, 9.5 * T, T * 0.7)
  ctx.fillStyle = '#f59e0b'
  ctx.font = 'bold 9px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(`🎯 ${metrics?.fechamentos || 5} fech · 💰 R$ ${Math.round((metrics?.mrr || 81800) / 1000)}k MRR · 🤝 22 reuniões`, 16.75 * T, 7.55 * T)

  // ─── CS ───
  mesa(25, 2.6)
  monitor(25, 2.4, '/cs', '#6366f1')
  cadeira(26.5, 4.5)
  // Mini-jornada
  const jX = 30 * T, jY = 1.8 * T
  ctx.fillStyle = 'rgba(99,102,241,0.06)'
  ctx.fillRect(jX, jY, 5.5 * T, 5 * T)
  ctx.strokeStyle = 'rgba(99,102,241,0.3)'
  ctx.strokeRect(jX, jY, 5.5 * T, 5 * T)
  ctx.fillStyle = '#818cf8'
  ctx.font = 'bold 9px system-ui'
  ctx.textAlign = 'left'
  ctx.fillText(`${metrics?.clientes || 48} CLÍNICAS`, jX + 6, jY + 14)
  ctx.font = 'bold 18px system-ui'
  ctx.fillStyle = '#a5b4fc'
  ctx.fillText('D0→D90', jX + 6, jY + 36)
  ctx.font = '8px system-ui'
  ctx.fillStyle = '#6b7280'
  ctx.fillText(`score médio: ${metrics?.scoreMedio || 11}/100`, jX + 6, jY + 52)
  // Barra de score
  const scorePct = (metrics?.scoreMedio || 11) / 100
  ctx.fillStyle = 'rgba(99,102,241,0.15)'
  ctx.fillRect(jX + 6, jY + 58, 5.5 * T - 12, 4)
  ctx.fillStyle = scorePct > 0.6 ? '#22c55e' : scorePct > 0.3 ? '#f59e0b' : '#ef4444'
  ctx.fillRect(jX + 6, jY + 58, (5.5 * T - 12) * scorePct, 4)

  // ─── Copa ───
  // Geladeira
  ctx.fillStyle = 'rgba(147,197,253,0.15)'
  ctx.fillRect(2 * T, 11 * T, T, T * 2)
  ctx.fillStyle = '#fff'
  ctx.font = '14px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('🧊', 2.5 * T, 12.3 * T)
  // Café
  ctx.fillStyle = 'rgba(139,92,46,0.3)'
  ctx.fillRect(4 * T, 11 * T, T * 1.2, T * 1.2)
  ctx.fillText('☕', 4.6 * T, 11.8 * T)
  // Sofá
  ctx.fillStyle = 'rgba(88,28,135,0.2)'
  ctx.fillRect(2 * T, 14 * T, 6 * T, T)
  // GONGO (interativo)
  const gX = 6 * T, gY = 11 * T
  ctx.fillStyle = 'rgba(245,158,11,0.25)'
  ctx.fillRect(gX, gY, T * 1.3, T * 1.3)
  ctx.strokeStyle = 'rgba(245,158,11,0.6)'
  ctx.lineWidth = 2
  ctx.strokeRect(gX, gY, T * 1.3, T * 1.3)
  ctx.font = '16px system-ui'
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.fillText('🔔', gX + (T * 1.3) / 2, gY + (T * 1.3) / 2 + 5)
  ctx.fillStyle = 'rgba(245,158,11,0.7)'
  ctx.font = 'bold 7px system-ui'
  ctx.fillText('GONGO (E)', gX + (T * 1.3) / 2, gY + T * 1.3 + 10)

  // ─── Sala de Reunião ───
  const meetCX = 18 * T, meetCY = 14 * T
  ctx.fillStyle = 'rgba(107,114,128,0.15)'
  ctx.beginPath()
  ctx.ellipse(meetCX, meetCY, 4 * T, 2.5 * T, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = 'rgba(107,114,128,0.3)'
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.2)'
  ctx.font = 'bold 9px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText('DAILY · ESTRATÉGIA', meetCX, meetCY)
  // 6 cadeiras ao redor
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2
    cadeira(meetCX / T + (Math.cos(a) * 4.5), meetCY / T + (Math.sin(a) * 3))
  }
  // TV no canto
  ctx.fillStyle = 'rgba(0,0,0,0.5)'
  ctx.fillRect(24 * T, 11 * T, T * 1.5, T)
  ctx.fillStyle = '#fff'
  ctx.font = '12px system-ui'
  ctx.fillText('📺', 24 * T + T * 0.75, 11.5 * T + 4)

  // ─── Tráfego ───
  mesa(29, 11.5)
  monitor(29, 11.3, '/trafego', '#a855f7')
  cadeira(30.5, 13.5)
  // Mini-funil
  const fX = 29 * T, fY = 14.2 * T
  ctx.fillStyle = 'rgba(168,85,247,0.08)'
  ctx.fillRect(fX, fY, 6.5 * T, 3.5 * T)
  ctx.strokeStyle = 'rgba(168,85,247,0.3)'
  ctx.strokeRect(fX, fY, 6.5 * T, 3.5 * T)
  const funnelItems = [
    { label: `${metrics?.leads || 141} leads`, w: 1.0, color: 'rgba(168,85,247,0.35)' },
    { label: `33 agend (23%)`, w: 0.75, color: 'rgba(168,85,247,0.3)' },
    { label: `22 reun`, w: 0.55, color: 'rgba(168,85,247,0.25)' },
    { label: `${metrics?.fechamentos || 5} fech`, w: 0.28, color: 'rgba(245,158,11,0.45)' },
  ]
  ctx.font = '7px system-ui'
  ctx.textAlign = 'left'
  funnelItems.forEach((item, i) => {
    const y = fY + 6 + i * 18
    const w = (6.5 * T - 10) * item.w
    ctx.fillStyle = item.color
    ctx.fillRect(fX + 5, y, w, 14)
    ctx.fillStyle = '#fff'
    ctx.fillText(item.label, fX + 8, y + 10)
  })

  // ─── CEO ───
  mesa(3, 19.5, 5, 1.5)
  monitor(3, 19.3, '/ceo', '#ef4444')
  monitor(5.5, 19.3, 'alertas', '#ef4444')
  cadeira(5.5, 21.5)
  whiteboard(1.5, 24.5, 8.5, 25.5,
    `MRR R$${Math.round((metrics?.mrr || 81800) / 1000)}k · Caixa R$${Math.round((metrics?.caixa || 0) / 1000)}k ⚠️`,
    '#f87171')

  // ─── COO ───
  mesa(13, 20.5)
  monitor(13, 20.3, '/coo', '#10b981')
  cadeira(14.5, 22.5)
  whiteboard(11.5, 24.5, 21.5, 25.5, 'OKRs · Eficiência · Equipe', '#34d399')
}

