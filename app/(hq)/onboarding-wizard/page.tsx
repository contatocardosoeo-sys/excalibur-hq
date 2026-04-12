'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const FERRAMENTAS = [
  { id: 'clicksign', label: 'Clicksign', emoji: '📝' },
  { id: 'whatsapp', label: 'WhatsApp', emoji: '💬' },
  { id: 'drive', label: 'Google Drive', emoji: '📁' },
  { id: 'bloco_notas', label: 'Bloco de Notas', emoji: '📋' },
  { id: 'planilha', label: 'Planilha (Excel/Sheets)', emoji: '📊' },
  { id: 'crm', label: 'CRM externo', emoji: '🔄' },
  { id: 'nenhuma', label: 'Nenhuma — tudo de cabeça', emoji: '🧠' },
]

const DIFICULDADES = [
  'Organizar minha rotina diária',
  'Acompanhar métricas e números',
  'Fazer follow-up com leads/clientes',
  'Saber em que focar cada dia',
  'Comunicação com a equipe',
  'Usar ferramentas digitais',
]

const ROLE_TUTORIAL: Record<string, { titulo: string; tela: string; passos: string[] }> = {
  cs: {
    titulo: 'CS — Customer Success',
    tela: '/cs',
    passos: [
      '1. Abra o /cs todo dia — é sua tela principal',
      '2. Verifique o score médio e alertas primeiro',
      '3. Contate pelo menos 3 clientes por dia (check-in)',
      '4. Acompanhe a jornada D0→D90 de cada cliente',
      '5. Peça indicações quando o cliente estiver no momento ideal',
      '6. Registre TUDO — o que não está no sistema, não aconteceu',
    ],
  },
  sdr: {
    titulo: 'SDR — Prospecção',
    tela: '/sdr',
    passos: [
      '1. Sua meta principal: 12 agendamentos/dia',
      '2. Lance as métricas do dia SEMPRE ao final do turno',
      '3. Use as 10 etapas do funil pra organizar seus leads',
      '4. Cada agendamento = R$8 de comissão automática',
      '5. Se o lead comparecer = +R$12 · Se fechar = +R$40',
      '6. Suas missões diárias escalam conforme você evolui',
    ],
  },
  closer: {
    titulo: 'Closer — Fechamento',
    tela: '/comercial',
    passos: [
      '1. O SDR agenda → comparece → chega pra você fechar',
      '2. Atualize o kanban SEMPRE que mover um card',
      '3. Comissão automática de 5% sobre cada venda',
      '4. Proponha ajustes de meta quando necessário',
      '5. Bônus de equipe: 45 vendas = +R$500 · 63 = +R$1.000',
      '6. Ticket médio R$2.400 = R$120/venda na sua comissão',
    ],
  },
  coo: {
    titulo: 'COO — Operação',
    tela: '/coo',
    passos: [
      '1. Monitore quem executou a rotina no painel de adoção',
      '2. Verifique alertas e resolva pendências',
      '3. Faça checkin com a equipe diariamente',
      '4. Revise KPIs e health score da equipe',
      '5. Cobre quem não está usando o sistema',
      '6. Tudo que importa passa pelo /coo',
    ],
  },
  head_traffic: {
    titulo: 'Head de Tráfego',
    tela: '/trafego-clientes',
    passos: [
      '1. Monitore CPL de cada clínica diariamente',
      '2. CPL alvo: R$10,70 — acima de R$15 é alarme',
      '3. Atualize métricas de tráfego',
      '4. Reporte anomalias de campanha',
    ],
  },
  designer: {
    titulo: 'Designer',
    tela: '/design',
    passos: [
      '1. Demandas chegam por aqui — verifique todo dia',
      '2. SLA: Urgente=1d · Alta=2d · Média=4d · Baixa=8d',
      '3. Mova os cards conforme avança (nunca pule)',
      '4. Configure sua rotina de deep work',
    ],
  },
  editor_video: {
    titulo: 'Editor de Vídeo',
    tela: '/design',
    passos: [
      '1. Suas demandas aparecem na mesma tela do design',
      '2. Urgente = abandona o que está fazendo e começa',
      '3. Configure blocos de produção na rotina',
      '4. Entregue no prazo — o sistema monitora tudo',
    ],
  },
  cmo: {
    titulo: 'CMO',
    tela: '/trafego',
    passos: [
      '1. Revise o dashboard de tráfego diariamente',
      '2. Atualize o pipeline comercial',
      '3. Proponha ajustes de meta quando necessário',
      '4. Acompanhe CPL e ROI das campanhas',
    ],
  },
  admin: {
    titulo: 'CEO',
    tela: '/ceo',
    passos: [
      '1. Dashboard CEO é sua visão geral',
      '2. Aprove propostas de ajuste da equipe',
      '3. Monitore health score e adoção',
      '4. Verifique funil unificado e comissões',
    ],
  },
}

export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [ferramentas, setFerramentas] = useState<string[]>([])
  const [ferramentasOutro, setFerramentasOutro] = useState('')
  const [dificuldades, setDificuldades] = useState<string[]>([])
  const [expectativa, setExpectativa] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.email) return
      setEmail(session.user.email)
      const { data: u } = await supabase
        .from('usuarios_internos')
        .select('nome, role, roles, onboarding_completo')
        .eq('email', session.user.email)
        .single()
      if (u) {
        setNome(u.nome || '')
        setRole(u.roles?.[0] || u.role || 'admin')
        if (u.onboarding_completo) {
          const tela = ROLE_TUTORIAL[u.roles?.[0] || u.role]?.tela || '/ceo'
          router.replace(tela)
        }
      }
    })()
  }, [router])

  const info = ROLE_TUTORIAL[role] || ROLE_TUTORIAL.admin
  const primeiroNome = nome.split(' ')[0]

  const toggleFerramenta = (id: string) => {
    setFerramentas(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }
  const toggleDificuldade = (d: string) => {
    setDificuldades(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const finalizar = async () => {
    setSalvando(true)
    const r = await fetch('/api/onboarding/completar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: email,
        role,
        ferramentas,
        ferramentas_outro: ferramentasOutro,
        dificuldades,
        expectativa,
      }),
    })
    const j = await r.json().catch(() => ({ redirect: `${info.tela}?tour=1` }))
    router.replace(j.redirect || `${info.tela}?tour=1`)
  }

  const steps = [
    // TELA 1 — Cultura Excalibur
    <div key={0} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 72, marginBottom: 20 }}>⚔️</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8, lineHeight: 1.2 }}>
        Fala, {primeiroNome}!
      </h1>
      <p style={{ color: '#f59e0b', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
        Bem-vindo ao Excalibur HQ.
      </p>
      <p style={{ color: '#9ca3af', fontSize: 15, marginBottom: 24, maxWidth: 420, margin: '0 auto 24px', lineHeight: 1.6 }}>
        Aqui dentro a gente opera diferente. Sem achismo, sem &quot;acho que fiz&quot;, sem perder tempo.
        Tudo que você faz no dia está registrado, metrificado e conectado. O sistema é a sua arma — use com tudo.
      </p>
      <div style={{ background: '#f59e0b10', border: '2px solid #f59e0b', borderRadius: 14, padding: '20px 24px', maxWidth: 380, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 14, color: '#f59e0b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 8 }}>
          Seu papel
        </div>
        <div style={{ fontSize: 26, color: '#fff', fontWeight: 900 }}>
          {info.titulo}
        </div>
      </div>
    </div>,

    // TELA 2 — Ferramentas que usa
    <div key={1}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
        O que você usa hoje pra trabalhar?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
        Selecione tudo que se aplica — isso ajuda a gente a entender de onde você vem.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
        {FERRAMENTAS.map(f => (
          <button
            key={f.id}
            onClick={() => toggleFerramenta(f.id)}
            style={{
              minHeight: 52,
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: ferramentas.includes(f.id) ? '#f59e0b15' : '#0a0f1a',
              border: `2px solid ${ferramentas.includes(f.id) ? '#f59e0b' : '#1f2937'}`,
              borderRadius: 12,
              padding: '10px 14px',
              color: ferramentas.includes(f.id) ? '#fff' : '#9ca3af',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: ferramentas.includes(f.id) ? 700 : 400,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 20 }}>{f.emoji}</span>
            <span>{f.label}</span>
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Outros — escreva aqui..."
        value={ferramentasOutro}
        onChange={e => setFerramentasOutro(e.target.value)}
        style={{
          width: '100%', marginTop: 10, background: '#0a0f1a',
          border: '2px solid #1f2937', borderRadius: 12,
          padding: '12px 16px', color: '#fff', fontSize: 13,
          minHeight: 48,
        }}
      />
    </div>,

    // TELA 3 — Dificuldades
    <div key={2}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
        Qual sua maior dificuldade hoje?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
        Selecione até 3 — o sistema vai se adaptar pra te ajudar nisso.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DIFICULDADES.map(d => (
          <button
            key={d}
            onClick={() => toggleDificuldade(d)}
            disabled={dificuldades.length >= 3 && !dificuldades.includes(d)}
            style={{
              minHeight: 48,
              textAlign: 'left',
              background: dificuldades.includes(d) ? '#f59e0b15' : '#0a0f1a',
              border: `2px solid ${dificuldades.includes(d) ? '#f59e0b' : '#1f2937'}`,
              borderRadius: 12,
              padding: '12px 16px',
              color: dificuldades.includes(d) ? '#fff' : '#9ca3af',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: dificuldades.includes(d) ? 700 : 400,
              opacity: dificuldades.length >= 3 && !dificuldades.includes(d) ? 0.3 : 1,
            }}
          >
            {dificuldades.includes(d) ? '✅ ' : ''}{d}
          </button>
        ))}
      </div>
    </div>,

    // TELA 4 — Expectativa
    <div key={3}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
        O que te faria dizer &quot;valeu a pena usar isso&quot;?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
        Seja honesto. Quanto mais específico, melhor a gente te ajuda. Mínimo 30 caracteres.
      </p>
      <textarea
        value={expectativa}
        onChange={e => setExpectativa(e.target.value)}
        placeholder="Ex: Quero saber exatamente o que fazer cada dia sem ficar perdido, ter controle dos meus números e ver meu resultado crescer..."
        rows={5}
        style={{
          width: '100%',
          background: '#0a0f1a',
          border: `2px solid ${expectativa.length >= 30 ? '#22c55e' : '#1f2937'}`,
          borderRadius: 12,
          padding: '14px 16px',
          color: '#fff',
          fontSize: 15,
          resize: 'none',
          minHeight: 140,
          fontFamily: 'inherit',
          lineHeight: 1.6,
        }}
      />
      <div style={{ fontSize: 11, color: expectativa.length >= 30 ? '#22c55e' : '#6b7280', marginTop: 6, textAlign: 'right' }}>
        {expectativa.length}/30 caracteres {expectativa.length >= 30 ? '✅' : ''}
      </div>
    </div>,

    // TELA 5 — Tutorial do role + primeira missão
    <div key={4}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🚀</div>
        <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          Pronto, {primeiroNome}!
        </h2>
        <p style={{ color: '#9ca3af', fontSize: 14 }}>
          Aqui está o que você precisa saber pra começar:
        </p>
      </div>

      {/* Tutorial do role */}
      <div style={{ background: '#0a0f1a', border: '1px solid #1f2937', borderRadius: 14, padding: 18, marginBottom: 20 }}>
        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          {info.titulo} — Sua rotina no Excalibur
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {info.passos.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700, flexShrink: 0, width: 18, textAlign: 'right' }}>
                {i + 1}.
              </span>
              <span style={{ fontSize: 13, color: '#d1d5db', lineHeight: 1.5 }}>
                {p.replace(/^\d+\.\s*/, '')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Primeira missão */}
      <div style={{ background: '#22c55e10', border: '2px solid #22c55e40', borderRadius: 14, padding: '16px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
          Sua primeira missão
        </div>
        <div style={{ fontSize: 16, color: '#fff', fontWeight: 700 }}>
          Completar o tour guiado na tela {info.tela}
        </div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
          O sistema vai te mostrar cada elemento importante, um por um.
        </div>
      </div>
    </div>,
  ]

  const isLast = step === steps.length - 1
  const canAdvance =
    step === 0 ||
    step === 1 ||
    (step === 2 && dificuldades.length > 0) ||
    (step === 3 && expectativa.length >= 30) ||
    step === 4

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 540, width: '100%' }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#f59e0b' : '#1f2937', transition: 'all 0.3s' }} />
          ))}
        </div>

        <div style={{ minHeight: 360 }}>{steps[step]}</div>

        {/* Nav */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {step > 0 ? (
            <button onClick={() => setStep(s => s - 1)} style={{ minHeight: 48, background: '#1f2937', color: '#9ca3af', border: '1px solid #374151', borderRadius: 12, padding: '12px 24px', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              ← Voltar
            </button>
          ) : <div />}

          {isLast ? (
            <button onClick={finalizar} disabled={salvando} style={{ minHeight: 52, background: '#f59e0b', color: '#030712', border: 'none', borderRadius: 12, padding: '14px 36px', cursor: salvando ? 'not-allowed' : 'pointer', fontSize: 17, fontWeight: 900, opacity: salvando ? 0.5 : 1 }}>
              {salvando ? '⏳ Preparando...' : '⚔️ Começar minha jornada'}
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance} style={{ minHeight: 48, background: canAdvance ? '#f59e0b' : '#374151', color: canAdvance ? '#030712' : '#6b7280', border: 'none', borderRadius: 12, padding: '12px 28px', cursor: canAdvance ? 'pointer' : 'not-allowed', fontSize: 15, fontWeight: 700 }}>
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
