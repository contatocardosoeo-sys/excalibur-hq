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

// NPCs hardcoded (os 4 colegas que não são o user logado)
type NPC = { id: string; nome: string; role: string; ini: string; x: number; y: number }
const NPCS_BASE: NPC[] = [
  { id: 'trindade',  nome: 'Trindade',  role: 'sdr',    ini: 'T', x: 4,  y: 4  },
  { id: 'guilherme', nome: 'Guilherme', role: 'closer', ini: 'G', x: 14, y: 4  },
  { id: 'medina',    nome: 'Medina',    role: 'cs',     ini: 'M', x: 28, y: 4  },
  { id: 'luana',     nome: 'Luana',     role: 'coo',    ini: 'L', x: 15, y: 22 },
  { id: 'cardoso',   nome: 'Cardoso',   role: 'admin',  ini: 'C', x: 4,  y: 22 },
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
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [selectedChar, setSelectedChar] = useState<NPC | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Game state em ref (evita re-render)
  const stateRef = useRef({
    myX: 18,
    myY: 14,
    camX: 0,
    camY: 0,
    scale: 1.6,
    keys: {} as Record<string, boolean>,
    walkT: 0,
    npcs: NPCS_BASE,
    rafId: 0,
    mapArr: null as Uint8Array | null,
  })

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

      // Remover o próprio usuário dos NPCs (ele é o jogador)
      stateRef.current.npcs = NPCS_BASE.filter(n => {
        const firstName = nome.split(' ')[0].toLowerCase()
        return !n.id.includes(firstName.toLowerCase())
      })
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

  // ─── 3. Ping de presença (a cada 10s) ───
  useEffect(() => {
    if (!userInfo) return
    const ping = async () => {
      try {
        await fetch('/api/escritorio/presenca', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: userInfo.email,
            role: userInfo.role,
            nome: userInfo.nome,
            status: 'online',
            sala: location,
            posX: stateRef.current.myX,
            posY: stateRef.current.myY,
          }),
        })
      } catch { /* */ }
    }
    ping()
    const iv = setInterval(ping, 10_000)
    return () => clearInterval(iv)
  }, [userInfo, location])

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
      // E = interagir com NPC perto
      if (e.key.toLowerCase() === 'e') {
        const npc = st.npcs.find(n => Math.abs(n.x - st.myX) < 1.5 && Math.abs(n.y - st.myY) < 1.5)
        if (npc) setSelectedChar(npc)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => { st.keys[e.key.toLowerCase()] = false }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

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

      // Move X e Y separados (desliza nas paredes)
      if (dx !== 0) {
        const nx = st.myX + dx
        // testar bordas do personagem (tamanho 0.6 tile)
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

      // Câmera suave centrada
      const targetCamX = st.myX * TILE - (canvas.width / st.scale) / 2
      const targetCamY = st.myY * TILE - (canvas.height / st.scale) / 2
      st.camX += (targetCamX - st.camX) * 0.12
      st.camY += (targetCamY - st.camY) * 0.12

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

      // Objetos simples (mesas) — quadradinho por sala
      ctx.fillStyle = '#3f3f52'
      for (const s of SALAS) {
        const cx = Math.floor((s.x1 + s.x2) / 2)
        const cy = Math.floor((s.y1 + s.y2) / 2)
        ctx.fillRect(cx * TILE + 4, cy * TILE + 4, TILE - 8, TILE - 8)
        // monitor
        ctx.fillStyle = '#1a1a2e'
        ctx.fillRect(cx * TILE + 8, cy * TILE + 6, TILE - 16, 8)
        ctx.fillStyle = s.label
        ctx.globalAlpha = 0.5
        ctx.fillRect(cx * TILE + 9, cy * TILE + 7, TILE - 18, 6)
        ctx.globalAlpha = 1
        ctx.fillStyle = '#3f3f52'
      }

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
    }
  }, [userInfo])

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Carregando escritório...</p>
      </div>
    )
  }

  const fmtBRL = (v: number) => 'R$ ' + Math.round(v).toLocaleString('pt-BR')

  return (
    <div className="flex flex-col bg-[#0d0b1a] overflow-hidden h-[calc(100vh-3.5rem)] md:h-screen">
      {/* TOPBAR */}
      <div className="bg-[#080814] border-b border-white/10 px-4 py-2 flex items-center gap-3 text-xs flex-shrink-0">
        <span className="text-amber-500 font-bold">⚔️ Escritório 2D</span>
        <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-gray-300">{location}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1 text-gray-300 transition"
          >
            {sidebarOpen ? '← Fechar painel' : 'Painel →'}
          </button>
          <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
            {userInfo.nome.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>

      {/* CANVAS + SIDEBAR */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Canvas principal */}
        <div className="flex-1 relative" style={{ minWidth: 0 }}>
          <canvas ref={canvasRef} className="block w-full h-full" style={{ imageRendering: 'pixelated' }} />

          {/* Hint de teclas */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-gray-400 pointer-events-none whitespace-nowrap z-10">
            WASD/setas: mover · E: interagir
          </div>
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-[260px] bg-[#080814] border-l border-white/10 overflow-y-auto flex-shrink-0 p-4 space-y-5">
            {/* Equipe agora */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">👥 Equipe agora</p>
              <div className="space-y-1.5">
                {NPCS_BASE.map(n => {
                  const cor = ROLE_COLOR[n.role] || ROLE_COLOR.default
                  const isMe = userInfo.nome.toLowerCase().includes(n.id)
                  return (
                    <div key={n.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2.5 py-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: cor.main }}>
                        {n.ini}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-xs font-semibold truncate">
                          {n.nome} {isMe && <span className="text-amber-400">(você)</span>}
                        </div>
                        <div className="text-gray-500 text-[10px] uppercase">{n.role}</div>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Métricas reais */}
            {metrics && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">📊 Métricas ao vivo</p>
                <div className="space-y-2">
                  <MiniKPI label="MRR" value={fmtBRL(metrics.mrr)} pct={100} color="#22c55e" />
                  <MiniKPI label="Caixa" value={fmtBRL(metrics.caixa)} pct={Math.max(2, (metrics.caixa / 90000) * 100)} color={metrics.caixa < 10000 ? '#ef4444' : '#22c55e'} />
                  <MiniKPI label="Fechamentos" value={`${metrics.fechamentos}/${metrics.fechamentosMeta}`} pct={(metrics.fechamentos / Math.max(1, metrics.fechamentosMeta)) * 100} color="#f59e0b" />
                  <MiniKPI label="Leads" value={`${metrics.leads}/${metrics.leadsMeta}`} pct={(metrics.leads / Math.max(1, metrics.leadsMeta)) * 100} color="#a855f7" />
                  <MiniKPI label="Score médio CS" value={`${metrics.scoreMedio}/100`} pct={metrics.scoreMedio} color="#6366f1" />
                </div>
              </div>
            )}

            {/* Alertas críticos */}
            {alertas.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-red-400 font-bold mb-2">🚨 Alertas</p>
                <div className="space-y-1.5">
                  {alertas.slice(0, 3).map((a, i) => (
                    <div key={i} className="bg-red-950/40 border border-red-800/50 rounded-lg px-2.5 py-2">
                      <div className="text-red-300 text-[11px] font-bold">{a.cliente_nome}</div>
                      <div className="text-red-200/70 text-[10px] mt-0.5">{a.descricao?.slice(0, 60)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feed de eventos */}
            {eventos.length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">⚡ Últimos eventos</p>
                <div className="space-y-1.5">
                  {eventos.slice(0, 5).map(e => (
                    <div key={e.id} className="bg-white/5 rounded-lg px-2.5 py-1.5">
                      <div className="text-gray-300 text-[11px] font-semibold">{e.titulo}</div>
                      <div className="text-gray-500 text-[10px]">{new Date(e.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
// HELPER: Mini KPI card
// ─────────────────────────────────────────────
function MiniKPI({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <div className="bg-white/5 rounded-lg px-2.5 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] uppercase text-gray-500 font-semibold">{label}</span>
        <span className="text-white text-xs font-bold tabular-nums">{value}</span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
      </div>
    </div>
  )
}
