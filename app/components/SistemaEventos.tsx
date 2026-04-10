'use client'
import { useEffect, useRef, useState, useCallback } from 'react'

interface Evento {
  id: string
  tipo: string
  titulo: string
  mensagem: string
  usuario_nome?: string
  valor?: number
  camada: string
  roles_visibilidade: string[]
  metadata?: Record<string, unknown>
  created_at: string
}

type Tamanho = 'micro' | 'mini' | 'medio' | 'grande' | 'gigante'

type CfgItem = {
  emoji: string
  grad: string
  borda: string
  tamanho: Tamanho
  shake: boolean
  confetti: boolean
  dur: number
  som: string
}

// CONFIGURAÇÃO VISUAL DOS EVENTOS (inclui variantes de hierarquia)
const CFG: Record<string, CfgItem> = {
  // ── EMPRESA TODA ──────────────────────────────────────────
  venda_fechada_1:      { emoji:'🔔',  grad:'linear-gradient(135deg,#78350f,#b45309,#f59e0b)',        borda:'#fcd34d', tamanho:'grande',  shake:false, confetti:false, dur:8000,  som:'sino_1' },
  venda_fechada_2:      { emoji:'🔔🔔', grad:'linear-gradient(135deg,#92400e,#d97706,#fbbf24)',       borda:'#fcd34d', tamanho:'grande',  shake:true,  confetti:false, dur:9000,  som:'sino_2' },
  venda_fechada_3:      { emoji:'🔥',  grad:'linear-gradient(135deg,#78350f,#dc2626,#f59e0b)',        borda:'#fbbf24', tamanho:'gigante', shake:true,  confetti:true,  dur:10000, som:'sino_3' },
  venda_fechada_4:      { emoji:'👑',  grad:'linear-gradient(135deg,#1c1917,#d97706,#fef08a)',        borda:'#fef08a', tamanho:'gigante', shake:true,  confetti:true,  dur:11000, som:'sino_4' },
  venda_fechada_5:      { emoji:'⚡',  grad:'linear-gradient(135deg,#0f0f0f,#92400e,#fcd34d)',        borda:'#ffffff', tamanho:'gigante', shake:true,  confetti:true,  dur:12000, som:'sino_5' },
  marco_d7:             { emoji:'🏁',  grad:'linear-gradient(135deg,#1e1b4b,#4338ca,#818cf8)',        borda:'#a5b4fc', tamanho:'medio',   shake:false, confetti:false, dur:7000,  som:'cs_d7' },
  marco_d30:            { emoji:'🎖️', grad:'linear-gradient(135deg,#312e81,#4f46e5,#c7d2fe)',        borda:'#c7d2fe', tamanho:'gigante', shake:false, confetti:true,  dur:10000, som:'cs_d30' },
  nova_clinica_ativa:   { emoji:'🏥',  grad:'linear-gradient(135deg,#2e1065,#6d28d9,#c4b5fd)',        borda:'#c4b5fd', tamanho:'grande',  shake:false, confetti:true,  dur:8000,  som:'cs_nova' },
  meta_mensal_sdr:      { emoji:'🏅',  grad:'linear-gradient(135deg,#312e81,#4f46e5,#818cf8)',        borda:'#a5b4fc', tamanho:'gigante', shake:true,  confetti:true,  dur:10000, som:'sino_4' },
  meta_empresa:         { emoji:'🎯',  grad:'linear-gradient(135deg,#1c1917,#a16207,#fef08a)',        borda:'#fef08a', tamanho:'gigante', shake:true,  confetti:true,  dur:12000, som:'sino_5' },
  agendamento_meta:     { emoji:'🎯',  grad:'linear-gradient(135deg,#312e81,#4338ca,#c7d2fe)',        borda:'#c7d2fe', tamanho:'grande',  shake:true,  confetti:true,  dur:8000,  som:'palm_3' },
  // ── SDR ↔ CLOSER ─────────────────────────────────────────
  agendamento_1:        { emoji:'📅',  grad:'linear-gradient(135deg,#1d4ed8,#3b82f6,#60a5fa)',        borda:'#60a5fa', tamanho:'medio',   shake:false, confetti:false, dur:5500,  som:'palm_1' },
  agendamento_2:        { emoji:'📅🔥', grad:'linear-gradient(135deg,#1e3a8a,#4f46e5,#818cf8)',       borda:'#818cf8', tamanho:'medio',   shake:false, confetti:false, dur:6000,  som:'palm_2' },
  agendamento_3:        { emoji:'🎯',  grad:'linear-gradient(135deg,#312e81,#4338ca,#c7d2fe)',        borda:'#c7d2fe', tamanho:'grande',  shake:true,  confetti:true,  dur:8000,  som:'palm_3' },
  comparecimento:       { emoji:'🤝',  grad:'linear-gradient(135deg,#0369a1,#0ea5e9)',                borda:'#38bdf8', tamanho:'medio',   shake:false, confetti:false, dur:5000,  som:'palm_2' },
  reuniao_concluida:    { emoji:'✅',  grad:'linear-gradient(135deg,#78350f,#b45309)',                borda:'#d97706', tamanho:'mini',    shake:false, confetti:false, dur:4000,  som:'palm_1' },
  // ── CLOSER ↔ CS ──────────────────────────────────────────
  cliente_handoff:      { emoji:'🔄',  grad:'linear-gradient(135deg,#4c1d95,#7c3aed)',                borda:'#a78bfa', tamanho:'medio',   shake:false, confetti:false, dur:6000,  som:'cs_d7' },
  // ── TRÁFEGO → SDR ────────────────────────────────────────
  lead_chegou:          { emoji:'📥',  grad:'linear-gradient(135deg,#1e3a8a,#2563eb)',                borda:'#3b82f6', tamanho:'micro',   shake:false, confetti:false, dur:3500,  som:'ping' },
  lote_leads:           { emoji:'📦',  grad:'linear-gradient(135deg,#4c1d95,#7c3aed)',                borda:'#8b5cf6', tamanho:'mini',    shake:false, confetti:false, dur:4500,  som:'palm_1' },
  // ── CEO + FINANCEIRO ──────────────────────────────────────
  pagamento_recebido_1: { emoji:'💰',  grad:'linear-gradient(135deg,#064e3b,#059669)',                borda:'#34d399', tamanho:'medio',   shake:false, confetti:false, dur:5000,  som:'caixa_1' },
  pagamento_recebido_2: { emoji:'💸',  grad:'linear-gradient(135deg,#065f46,#10b981)',                borda:'#34d399', tamanho:'medio',   shake:false, confetti:false, dur:5500,  som:'caixa_2' },
  pagamento_recebido_3: { emoji:'🤑',  grad:'linear-gradient(135deg,#14532d,#16a34a,#86efac)',        borda:'#86efac', tamanho:'grande',  shake:false, confetti:true,  dur:7000,  som:'caixa_3' },
  folha_paga:           { emoji:'👥',  grad:'linear-gradient(135deg,#064e3b,#059669)',                borda:'#34d399', tamanho:'medio',   shake:false, confetti:false, dur:5000,  som:'caixa_1' },
  recorde_mrr:          { emoji:'🚀',  grad:'linear-gradient(135deg,#0f172a,#166534,#16a34a,#86efac)',borda:'#86efac', tamanho:'gigante', shake:true,  confetti:true,  dur:15000, som:'recorde' },
  meta_mrr:             { emoji:'💎',  grad:'linear-gradient(135deg,#14532d,#16a34a)',                borda:'#86efac', tamanho:'grande',  shake:false, confetti:true,  dur:8000,  som:'sino_3' },
  pagamento_atrasado_1: { emoji:'⚠️',  grad:'linear-gradient(135deg,#451a03,#92400e)',                borda:'#f97316', tamanho:'mini',    shake:false, confetti:false, dur:6000,  som:'atraso_1' },
  pagamento_atrasado_2: { emoji:'⚠️⚠️',grad:'linear-gradient(135deg,#7c2d12,#c2410c)',                borda:'#ef4444', tamanho:'medio',   shake:false, confetti:false, dur:7000,  som:'atraso_2' },
  pagamento_atrasado_3: { emoji:'🚨',  grad:'linear-gradient(135deg,#7f1d1d,#dc2626)',                borda:'#ef4444', tamanho:'medio',   shake:true,  confetti:false, dur:8000,  som:'atraso_3' },
  pagamento_atrasado_4: { emoji:'🆘',  grad:'linear-gradient(135deg,#450a0a,#b91c1c)',                borda:'#fca5a5', tamanho:'grande',  shake:true,  confetti:false, dur:12000, som:'atraso_4' },
  caixa_critico:        { emoji:'💸',  grad:'linear-gradient(135deg,#450a0a,#dc2626,#fca5a5)',        borda:'#fca5a5', tamanho:'grande',  shake:true,  confetti:false, dur:15000, som:'atraso_4' },
  // ── CEO + SETOR ───────────────────────────────────────────
  gargalo_trafego:      { emoji:'⚠️',  grad:'linear-gradient(135deg,#7f1d1d,#dc2626)',                borda:'#ef4444', tamanho:'medio',   shake:true,  confetti:false, dur:8000,  som:'atraso_3' },
  cliente_risco:        { emoji:'🚨',  grad:'linear-gradient(135deg,#7f1d1d,#dc2626,#fca5a5)',        borda:'#fca5a5', tamanho:'medio',   shake:true,  confetti:false, dur:12000, som:'atraso_3' },
  sdr_sem_leads:        { emoji:'📭',  grad:'linear-gradient(135deg,#451a03,#92400e)',                borda:'#f97316', tamanho:'mini',    shake:false, confetti:false, dur:6000,  som:'atraso_2' },
  cac_alto:             { emoji:'📈',  grad:'linear-gradient(135deg,#451a03,#92400e)',                borda:'#f97316', tamanho:'mini',    shake:false, confetti:false, dur:6000,  som:'atraso_1' },
  // ── PRIVADO ──────────────────────────────────────────────
  lead_recebido:        { emoji:'📥',  grad:'linear-gradient(135deg,#1e3a8a,#1d4ed8)',                borda:'#3b82f6', tamanho:'micro',   shake:false, confetti:false, dur:3500,  som:'ping' },
  contato_feito:        { emoji:'📞',  grad:'linear-gradient(135deg,#1e40af,#3b82f6)',                borda:'#60a5fa', tamanho:'micro',   shake:false, confetti:false, dur:3000,  som:'ping' },
  proposta_enviada:     { emoji:'📋',  grad:'linear-gradient(135deg,#92400e,#c2410c)',                borda:'#f97316', tamanho:'mini',    shake:false, confetti:false, dur:4000,  som:'ping' },
  tarefa_concluida:     { emoji:'✅',  grad:'linear-gradient(135deg,#1e1b4b,#4338ca)',                borda:'#818cf8', tamanho:'micro',   shake:false, confetti:false, dur:3000,  som:'check' },
  tarefa_atrasada:      { emoji:'⏰',  grad:'linear-gradient(135deg,#7f1d1d,#b91c1c)',                borda:'#ef4444', tamanho:'mini',    shake:true,  confetti:false, dur:7000,  som:'atraso_1' },
  cpl_otimo:            { emoji:'📉',  grad:'linear-gradient(135deg,#5b21b6,#7c3aed)',                borda:'#a78bfa', tamanho:'mini',    shake:false, confetti:false, dur:4000,  som:'ping' },
  meta_diaria_sdr:      { emoji:'⚡',  grad:'linear-gradient(135deg,#1e40af,#6366f1)',                borda:'#818cf8', tamanho:'medio',   shake:false, confetti:true,  dur:6000,  som:'palm_1' },
}

// ENGINE DE SOM — Web Audio API (procedural, sem arquivos externos)
type WebAudioWindow = Window & { webkitAudioContext?: typeof AudioContext }

function criarSom(tipo: string) {
  try {
    const w = window as WebAudioWindow
    const Ctor = window.AudioContext || w.webkitAudioContext
    if (!Ctor) return
    const ctx = new Ctor()

    const nota = (f: number, t: number, d: number, wave: OscillatorType = 'sine', v = 0.45, bend?: number) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), cp = ctx.createDynamicsCompressor()
      o.connect(g); g.connect(cp); cp.connect(ctx.destination)
      o.type = wave; o.frequency.setValueAtTime(f, ctx.currentTime + t)
      if (bend) o.frequency.exponentialRampToValueAtTime(bend, ctx.currentTime + t + d * 0.7)
      g.gain.setValueAtTime(0, ctx.currentTime + t)
      g.gain.linearRampToValueAtTime(v, ctx.currentTime + t + 0.01)
      g.gain.linearRampToValueAtTime(v * 0.7, ctx.currentTime + t + 0.1)
      g.gain.setValueAtTime(v * 0.7, ctx.currentTime + t + d - 0.15)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d + 0.05)
    }

    const rv = (f: number, t: number, d: number, v = 0.25) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      const dl = ctx.createDelay(1); const fb = ctx.createGain()
      dl.delayTime.value = 0.25; fb.gain.value = 0.35
      o.connect(g); g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(ctx.destination)
      o.frequency.setValueAtTime(f, ctx.currentTime + t)
      g.gain.setValueAtTime(v, ctx.currentTime + t)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + d + 0.5)
    }

    const ru = (t: number, d: number, v = 0.15, fc = 2000) => {
      const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * d)), ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain()
      src.buffer = buf; flt.type = 'bandpass'; flt.frequency.value = fc; flt.Q.value = 0.5
      src.connect(flt); flt.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0, ctx.currentTime + t)
      g.gain.linearRampToValueAtTime(v, ctx.currentTime + t + 0.05)
      g.gain.setValueAtTime(v, ctx.currentTime + t + d - 0.1)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + d)
      src.start(ctx.currentTime + t); src.stop(ctx.currentTime + t + d)
    }

    const sons: Record<string, () => void> = {
      ping:    () => { nota(880,0,0.2,'sine',0.3); nota(1100,0.15,0.3,'triangle',0.2) },
      check:   () => { nota(880,0,0.08,'square',0.22); nota(1320,0.07,0.28,'sine',0.35) },
      palm_1:  () => { ru(0,0.18,0.12,1800); nota(1047,0.22,0.45,'triangle',0.5); nota(1319,0.55,0.4,'triangle',0.35) },
      palm_2:  () => { ru(0,0.15,0.12,1800); ru(0.22,0.15,0.12,1800); nota(1047,0.38,0.4,'triangle',0.52); nota(1319,0.65,0.5,'triangle',0.38); ru(0.9,1.0,0.09,2000) },
      palm_3:  () => { for(let i=0;i<6;i++) ru(i*0.1,0.18,0.16,1400+i*200); ru(0.75,3.0,0.22,2000); [784,988,1175,1568].forEach((f,i)=>nota(f,0.7+i*0.15,0.55,'triangle',0.42)) },
      sino_1:  () => { nota(880,0,0.9,'sine',0.75); rv(880,0.05,2.0,0.2); nota(1760,0,0.5,'triangle',0.2); nota(880,1.1,0.6,'sine',0.4) },
      sino_2:  () => { nota(880,0,0.8,'sine',0.75); rv(880,0,1.5,0.2); nota(880,1.0,0.8,'sine',0.75); rv(880,1.0,1.5,0.2); ru(0.4,1.8,0.08,1500) },
      sino_3:  () => { for(let i=0;i<3;i++){nota(880,i*0.65,0.7,'sine',0.75); rv(880,i*0.65,1.2,0.15)} ru(1.4,2.5,0.14,2000); nota(1047,2.8,0.7,'triangle',0.45) },
      sino_4:  () => { for(let i=0;i<4;i++){nota(880,i*0.38,0.55,'sine',0.82); rv(880,i*0.38,1.0,0.2)} ru(0.9,3.5,0.22,2500); [523,659,784,1047].forEach((f,i)=>nota(f,2.2+i*0.12,1.5,'triangle',0.35)) },
      sino_5:  () => { for(let i=0;i<6;i++){nota(880,i*0.22,0.45,'sine',0.9); rv(880,i*0.22,0.9,0.2)} ru(0.6,4.5,0.32,3000); ru(0.6,4.5,0.18,700); [523,659,784,659,784,1047,784,1047,1319].forEach((f,i)=>nota(f,1.8+i*0.14,0.28,'triangle',0.5)); nota(1319,3.2,1.8,'triangle',0.65) },
      caixa_1: () => { nota(1200,0,0.07,'square',0.65); nota(1800,0.06,0.07,'square',0.65); nota(900,0.15,0.45,'sine',0.55); nota(1100,0.38,0.7,'triangle',0.45) },
      caixa_2: () => { nota(1200,0,0.07,'square',0.65); nota(1800,0.06,0.07,'square',0.65); nota(900,0.15,0.35,'sine',0.55); for(let i=0;i<7;i++) nota(700+Math.sin(i)*350,0.55+i*0.13,0.18,'triangle',0.32) },
      caixa_3: () => { nota(1200,0,0.07,'square',0.72); nota(1800,0.06,0.07,'square',0.72); for(let i=0;i<18;i++) nota(500+Math.random()*900,0.35+i*0.09,0.22,'triangle',0.28); ru(0.35,2.5,0.12,1200); [523,659,784,1047].forEach((f,i)=>nota(f,2.2+i*0.13,0.9,'triangle',0.38)) },
      atraso_1: () => { nota(440,0,0.35,'sine',0.45); nota(370,0.38,0.45,'sine',0.4,300) },
      atraso_2: () => { for(let i=0;i<3;i++) nota(440,i*0.28,0.18,'square',0.45) },
      atraso_3: () => { for(let i=0;i<4;i++) nota(440,i*0.26,0.15,'square',0.5); nota(300,1.15,0.9,'sawtooth',0.42,200) },
      atraso_4: () => { for(let i=0;i<7;i++){nota(880,i*0.27,0.13,'square',0.6); nota(660,i*0.27+0.16,0.1,'square',0.55)} },
      cs_d7:   () => { [523,659,784,1047].forEach((f,i)=>nota(f,i*0.13,0.2,'sine',0.45)); nota(1047,0.52,0.8,'triangle',0.55); rv(784,0.4,1.2,0.18) },
      cs_d30:  () => { [523,659,784,1047,1319].forEach((f,i)=>nota(f,i*0.1,0.18,'sine',0.48)); nota(1047,0.55,0.12); nota(1319,0.68,0.12); nota(1568,0.82,1.4,'triangle',0.65); ru(0.6,3.0,0.18,2200); rv(1047,0.8,2.5,0.22) },
      cs_nova: () => { [392,523,659,784,1047].forEach((f,i)=>nota(f,i*0.12,0.18,'sine',0.48)); nota(1047,0.62,1.1,'triangle',0.62); rv(784,0.55,1.5,0.18) },
      recorde: () => { for(let i=0;i<6;i++){nota(880,i*0.18,0.4,'sine',0.92); rv(880,i*0.18,0.9,0.22)} const mel=[523,659,784,659,784,1047,784,1047,1319,1047,1319,1568]; mel.forEach((f,i)=>nota(f,1.4+i*0.12,0.22,'triangle',0.52)); nota(1568,3.1,2.5,'triangle',0.7); ru(0.9,5.0,0.28,2800); ru(0.9,5.0,0.18,650) },
    }
    sons[tipo]?.()
  } catch { /* silencioso se bloqueado */ }
}

// CONFETTI
function lancarConfetti(cor: string) {
  const cores = ['#f59e0b','#22c55e','#3b82f6','#ef4444','#8b5cf6','#fff','#fcd34d',cor]
  for (let i = 0; i < 90; i++) {
    setTimeout(() => {
      const el = document.createElement('div')
      const rot = (Math.random() * 720 - 360) + 'deg'
      el.style.cssText = `position:fixed;left:${Math.random()*100}vw;top:-10px;
        width:${5+Math.random()*9}px;height:${5+Math.random()*9}px;
        background:${cores[Math.floor(Math.random()*cores.length)]};
        border-radius:${Math.random()>.5?'50%':'2px'};z-index:99998;pointer-events:none;
        animation:xConfetti${Math.random()>.5?'A':'B'} ${1.8+Math.random()*2}s ease-in forwards;
        --r:${rot}`
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 4200)
    }, i * 28)
  }
}

// CONTADORES DIÁRIOS (resetam à meia-noite — local)
function getContadores(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const hoje = new Date().toDateString()
    const raw = JSON.parse(localStorage.getItem('xhq_contadores') || '{}')
    return (raw.data === hoje) ? (raw.valores || {}) : {}
  } catch { return {} }
}
function salvarContadores(v: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('xhq_contadores', JSON.stringify({ data: new Date().toDateString(), valores: v }))
  } catch { /* quota */ }
}
function incrementar(chave: string): number {
  const c = getContadores()
  c[chave] = (c[chave] || 0) + 1
  salvarContadores(c)
  return c[chave]
}

// Resolver tipo-base em tipo-final (com hierarquia progressiva diária)
function resolverTipo(tipo: string): string {
  if (tipo === 'venda_fechada') {
    const n = incrementar('venda')
    return `venda_fechada_${Math.min(n, 5)}`
  }
  if (tipo === 'agendamento') {
    const n = incrementar('agend')
    return n >= 5 ? 'agendamento_3' : n >= 3 ? 'agendamento_2' : 'agendamento_1'
  }
  if (tipo === 'pagamento_recebido') {
    const n = incrementar('pgto')
    return n >= 5 ? 'pagamento_recebido_3' : n >= 3 ? 'pagamento_recebido_2' : 'pagamento_recebido_1'
  }
  if (tipo === 'pagamento_atrasado') {
    const n = incrementar('atraso')
    return `pagamento_atrasado_${Math.min(n, 4)}`
  }
  return tipo
}

type EventoResolvido = Evento & { tipoResolvido: string }

// Guard global para impedir multiplas instancias (React Strict Mode + transicoes)
let POLL_GLOBAL_ATIVO = false

export default function SistemaEventos({ userRole }: { userRole?: string }) {
  const [eventoAtivo, setEventoAtivo] = useState<EventoResolvido | null>(null)
  const filaRef = useRef<EventoResolvido[]>([])
  const ultimosIdsRef = useRef<Set<string>>(new Set())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const podeVer = useCallback((evento: Evento) => {
    if (!userRole) return false
    if (!evento.roles_visibilidade || evento.roles_visibilidade.length === 0) return true
    if (userRole === 'admin') return evento.camada !== 'privado'
    return evento.roles_visibilidade.includes(userRole)
  }, [userRole])

  const processarProximo = useCallback(() => {
    const proximo = filaRef.current.shift()
    if (!proximo) {
      setEventoAtivo(null)
      return
    }
    const cfg = CFG[proximo.tipoResolvido]
    if (!cfg) {
      processarProximo()
      return
    }
    setEventoAtivo(proximo)
    criarSom(cfg.som)
    if (cfg.confetti) lancarConfetti(cfg.borda)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        new Notification(`${cfg.emoji} ${proximo.titulo}`, {
          body: proximo.mensagem,
          icon: '/favicon.svg',
          tag: proximo.id,
        })
      } catch { /* */ }
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      processarProximo()
    }, cfg.dur)
  }, [])

  const adicionarEvento = useCallback((evento: Evento) => {
    if (!evento?.id) return
    if (ultimosIdsRef.current.has(evento.id)) return
    ultimosIdsRef.current.add(evento.id)
    // Limita o set pra nao vazar memoria
    if (ultimosIdsRef.current.size > 500) {
      const arr = Array.from(ultimosIdsRef.current)
      ultimosIdsRef.current = new Set(arr.slice(-250))
    }
    if (!podeVer(evento)) return
    const tipoResolvido = resolverTipo(evento.tipo)
    filaRef.current.push({ ...evento, tipoResolvido })
    if (!eventoAtivo) {
      processarProximo()
    }
  }, [podeVer, processarProximo, eventoAtivo])

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Guard: impede multiplas instancias (React Strict Mode, remounts transitorios)
    if (POLL_GLOBAL_ATIVO) return
    POLL_GLOBAL_ATIVO = true

    try {
      channelRef.current = new BroadcastChannel('excalibur-eventos')
      channelRef.current.onmessage = (e) => {
        if (e.data?.id) adicionarEvento(e.data as Evento)
      }
    } catch { /* ambiente sem BroadcastChannel */ }

    const poll = async () => {
      try {
        const r = await fetch('/api/hq/eventos?limit=20', { cache: 'no-store' })
        const { eventos } = await r.json()
        if (!Array.isArray(eventos)) return
        const recentes = eventos.filter((ev: Evento) => {
          const diff = Date.now() - new Date(ev.created_at).getTime()
          return diff < 20000
        })
        // mais antigo primeiro, pra manter ordem cronologica
        recentes.reverse().forEach((ev: Evento) => adicionarEvento(ev))
      } catch { /* */ }
    }

    poll()
    intervalRef.current = setInterval(poll, 10000)

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      try { Notification.requestPermission() } catch { /* */ }
    }

    return () => {
      POLL_GLOBAL_ATIVO = false
      channelRef.current?.close()
      channelRef.current = null
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!eventoAtivo) return null
  const cfg = CFG[eventoAtivo.tipoResolvido]
  if (!cfg) return null

  const camadaLabel: Record<string, string> = {
    todos: '👥 Time todo',
    sdr_closer: '🔗 SDR + Closer',
    closer_cs: '🔗 Closer + CS',
    trafego_sdr: '🔗 Tráfego + SDR',
    ceo_financeiro: '💰 CEO + Fin',
    ceo_setor: '⚠️ CEO + Setor',
    privado: '👤 Só você',
  }

  const tam = {
    micro:   { p:'10px 18px', e:'30px', t:'13px', min:'260px', max:'360px' },
    mini:    { p:'14px 22px', e:'38px', t:'15px', min:'310px', max:'430px' },
    medio:   { p:'20px 32px', e:'50px', t:'18px', min:'410px', max:'550px' },
    grande:  { p:'25px 40px', e:'62px', t:'22px', min:'490px', max:'630px' },
    gigante: { p:'30px 48px', e:'78px', t:'26px', min:'550px', max:'710px' },
  }[cfg.tamanho]

  const fechar = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    processarProximo()
  }

  return (
    <>
      <style>{`
        @keyframes xDown{from{transform:translateX(-50%) translateY(-150px) scale(0.8);opacity:0}to{transform:translateX(-50%) translateY(0) scale(1);opacity:1}}
        @keyframes xFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes xShakeB{0%,100%{transform:translateX(-50%)}20%{transform:translateX(calc(-50% - 8px))}40%{transform:translateX(calc(-50% + 8px))}60%{transform:translateX(calc(-50% - 4px))}80%{transform:translateX(calc(-50% + 4px))}}
        @keyframes xConfettiA{0%{transform:translateY(-10px) rotate(0) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(var(--r)) scale(0.3);opacity:0}}
        @keyframes xConfettiB{0%{transform:translateY(-10px) rotate(0) scale(1);opacity:1}100%{transform:translateY(110vh) rotate(calc(var(--r) * -1)) scale(0.2);opacity:0}}
        .xb-in{animation:xDown 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards}
        .xb-shake{animation:xShakeB 0.5s ease-in-out}
        .xb-float{animation:xFloat 2s ease-in-out infinite}
      `}</style>
      <div
        className={`xb-in ${cfg.shake ? 'xb-shake' : ''}`}
        style={{
          position:'fixed', top:16, left:'50%', transform:'translateX(-50%)',
          zIndex:99999, background:cfg.grad, border:`2px solid ${cfg.borda}`,
          borderRadius:22, padding:tam.p, minWidth:tam.min, maxWidth:tam.max,
          display:'flex', alignItems:'center', gap:16,
          boxShadow:`0 28px 70px rgba(0,0,0,0.75), 0 0 60px ${cfg.borda}44`,
        }}
      >
        <div className="xb-float" style={{ fontSize:tam.e, lineHeight:1, filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}>
          {cfg.emoji}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <span style={{ background:'rgba(0,0,0,0.4)', color:'rgba(255,255,255,0.75)', fontSize:10, padding:'2px 9px', borderRadius:20, fontWeight:700, letterSpacing:'0.6px' }}>
              {camadaLabel[eventoAtivo.camada] || eventoAtivo.camada}
            </span>
            {eventoAtivo.usuario_nome && (
              <span style={{ color:'rgba(255,255,255,0.5)', fontSize:10 }}>{eventoAtivo.usuario_nome}</span>
            )}
          </div>
          <div style={{ color:'#fff', fontWeight:900, fontSize:tam.t, lineHeight:1.2, textShadow:'0 2px 8px rgba(0,0,0,0.5)' }}>
            ⚔️ {eventoAtivo.titulo}
          </div>
          {eventoAtivo.mensagem && (
            <div style={{ color:'rgba(255,255,255,0.88)', fontSize:13, marginTop:5, fontWeight:500 }}>
              {eventoAtivo.mensagem}
            </div>
          )}
          {eventoAtivo.valor != null && (
            <div style={{ color:'#fff', fontSize:cfg.tamanho==='gigante'?30:22, fontWeight:900, marginTop:7, textShadow:'0 3px 12px rgba(0,0,0,0.5)' }}>
              + R$ {Number(eventoAtivo.valor).toLocaleString('pt-BR')}
            </div>
          )}
        </div>
        <button
          onClick={fechar}
          style={{ background:'rgba(0,0,0,0.3)', border:'none', color:'rgba(255,255,255,0.7)', fontSize:18, cursor:'pointer', padding:'6px 11px', borderRadius:10, fontWeight:'bold', flexShrink:0 }}
        >✕</button>
      </div>
    </>
  )
}
