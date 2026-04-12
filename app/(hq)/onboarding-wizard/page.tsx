'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

const FERRAMENTAS = [
  'Planilha (Excel/Google Sheets)',
  'WhatsApp (manual)',
  'CRM externo (RD, Pipedrive, etc.)',
  'ERP (Clinicorp, OdontoSystem)',
  'Caderninho/anotações',
  'Nenhuma — tudo de cabeça',
]

const DIFICULDADES = [
  'Organizar minha rotina diária',
  'Acompanhar métricas e números',
  'Fazer follow-up com leads/clientes',
  'Saber em que focar cada dia',
  'Comunicação com a equipe',
  'Usar ferramentas novas',
]

const ROLE_INFO: Record<string, { titulo: string; descricao: string; tela: string; missao: string }> = {
  admin: {
    titulo: 'CEO',
    descricao: 'Você tem visão completa do sistema: métricas, equipe, financeiro e alertas.',
    tela: '/ceo',
    missao: 'Revisar o dashboard CEO e verificar as métricas do dia',
  },
  coo: {
    titulo: 'COO',
    descricao: 'Sua missão é monitorar a execução da equipe e garantir que todos estão operando.',
    tela: '/coo',
    missao: 'Verificar quem executou a rotina hoje no painel de adoção',
  },
  closer: {
    titulo: 'Closer',
    descricao: 'Você recebe reuniões do SDR e sua meta é fechar. Kanban de pipeline e comissões estão aqui.',
    tela: '/comercial',
    missao: 'Atualizar o status de uma proposta no kanban',
  },
  sdr: {
    titulo: 'SDR',
    descricao: 'Você é a linha de frente. Sua meta principal é agendamentos. Tudo gira em torno disso.',
    tela: '/sdr',
    missao: 'Lançar as métricas do dia no painel SDR',
  },
  cs: {
    titulo: 'CS',
    descricao: 'Você cuida dos clientes ativos. Jornada, health score e contato regular.',
    tela: '/cs',
    missao: 'Registrar um contato com um cliente no log de atividades',
  },
  head_traffic: {
    titulo: 'Head de Tráfego',
    descricao: 'Você gerencia campanhas e CPL. Dashboard de tráfego por cliente.',
    tela: '/trafego-clientes',
    missao: 'Revisar o CPL das campanhas ativas',
  },
  designer: {
    titulo: 'Designer',
    descricao: 'Demandas de criação chegam aqui. Prazos, prioridades e entregas.',
    tela: '/design',
    missao: 'Verificar as demandas pendentes e iniciar uma',
  },
  editor_video: {
    titulo: 'Editor de Vídeo',
    descricao: 'Demandas de edição de vídeo. Mesma tela do design, suas demandas aparecem pra você.',
    tela: '/design',
    missao: 'Verificar as demandas pendentes e iniciar uma',
  },
  cmo: {
    titulo: 'CMO',
    descricao: 'Visão de tráfego e comercial. Métricas de campanha e pipeline.',
    tela: '/trafego',
    missao: 'Revisar o dashboard de tráfego',
  },
  financeiro: {
    titulo: 'Financeiro',
    descricao: 'Contas a pagar, receber, Asaas e caixa da empresa.',
    tela: '/financeiro',
    missao: 'Revisar o painel financeiro e conferir o saldo Asaas',
  },
}

export default function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [ferramentas, setFerramentas] = useState<string[]>([])
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
          const defaultRoute = ROLE_INFO[u.roles?.[0] || u.role]?.tela || '/ceo'
          router.replace(defaultRoute)
        }
      }
    })()
  }, [router])

  const info = ROLE_INFO[role] || ROLE_INFO.admin

  const toggleFerramenta = (f: string) => {
    setFerramentas(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])
  }
  const toggleDificuldade = (d: string) => {
    setDificuldades(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  const finalizar = async () => {
    setSalvando(true)
    await fetch('/api/onboarding-wizard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        dados: {
          ferramentas_anteriores: ferramentas,
          dificuldades: dificuldades,
          expectativa,
          completado_em: new Date().toISOString(),
        },
      }),
    })
    router.replace(info.tela)
  }

  const steps = [
    // Step 0: Boas-vindas
    <div key={0} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>⚔️</div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
        Bem-vindo ao Excalibur, {nome.split(' ')[0]}!
      </h1>
      <p style={{ color: '#9ca3af', fontSize: 15, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
        Este é o sistema operacional da Excalibur. Vou te guiar em 1 minuto pra você saber exatamente onde tudo fica.
      </p>
      <div
        style={{
          background: '#f59e0b15',
          border: '1px solid #f59e0b40',
          borderRadius: 12,
          padding: '16px 20px',
          display: 'inline-block',
        }}
      >
        <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          Seu papel
        </div>
        <div style={{ fontSize: 22, color: '#fff', fontWeight: 700, marginTop: 4 }}>
          {info.titulo}
        </div>
        <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
          {info.descricao}
        </div>
      </div>
    </div>,

    // Step 1: Ferramentas que usa hoje
    <div key={1}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        Quais ferramentas você usa hoje?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Selecione tudo que se aplica — isso nos ajuda a entender sua rotina atual.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FERRAMENTAS.map(f => (
          <button
            key={f}
            onClick={() => toggleFerramenta(f)}
            style={{
              minHeight: 44,
              textAlign: 'left',
              background: ferramentas.includes(f) ? '#f59e0b20' : '#0a0f1a',
              border: `1px solid ${ferramentas.includes(f) ? '#f59e0b' : '#1f2937'}`,
              borderRadius: 10,
              padding: '10px 14px',
              color: ferramentas.includes(f) ? '#fff' : '#9ca3af',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: ferramentas.includes(f) ? 600 : 400,
            }}
          >
            {ferramentas.includes(f) ? '✅ ' : '⬜ '}{f}
          </button>
        ))}
      </div>
    </div>,

    // Step 2: Maior dificuldade
    <div key={2}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        Qual sua maior dificuldade hoje?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Selecione até 3 — vamos personalizar o sistema pra te ajudar nisso.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DIFICULDADES.map(d => (
          <button
            key={d}
            onClick={() => toggleDificuldade(d)}
            disabled={dificuldades.length >= 3 && !dificuldades.includes(d)}
            style={{
              minHeight: 44,
              textAlign: 'left',
              background: dificuldades.includes(d) ? '#f59e0b20' : '#0a0f1a',
              border: `1px solid ${dificuldades.includes(d) ? '#f59e0b' : '#1f2937'}`,
              borderRadius: 10,
              padding: '10px 14px',
              color: dificuldades.includes(d) ? '#fff' : '#9ca3af',
              fontSize: 13,
              cursor: 'pointer',
              fontWeight: dificuldades.includes(d) ? 600 : 400,
              opacity: dificuldades.length >= 3 && !dificuldades.includes(d) ? 0.4 : 1,
            }}
          >
            {dificuldades.includes(d) ? '✅ ' : '⬜ '}{d}
          </button>
        ))}
      </div>
    </div>,

    // Step 3: Expectativa
    <div key={3}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 4 }}>
        O que você espera do Excalibur?
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Uma frase curta — o que te faria dizer &quot;valeu a pena usar isso&quot;?
      </p>
      <textarea
        value={expectativa}
        onChange={e => setExpectativa(e.target.value)}
        placeholder="Ex: Saber exatamente o que fazer cada dia sem ficar perdido"
        rows={3}
        style={{
          width: '100%',
          background: '#0a0f1a',
          border: '1px solid #1f2937',
          borderRadius: 10,
          padding: '12px 14px',
          color: '#fff',
          fontSize: 14,
          resize: 'none',
          minHeight: 80,
          fontFamily: 'inherit',
        }}
      />
    </div>,

    // Step 4: Pronto!
    <div key={4} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
        Pronto, {nome.split(' ')[0]}!
      </h2>
      <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
        Seu sistema está configurado. Sua tela principal é <strong style={{ color: '#f59e0b' }}>{info.tela}</strong>.
      </p>
      <div
        style={{
          background: '#22c55e15',
          border: '1px solid #22c55e40',
          borderRadius: 12,
          padding: '16px 20px',
          maxWidth: 380,
          margin: '0 auto 24px',
        }}
      >
        <div style={{ fontSize: 11, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase' }}>
          Sua primeira missão
        </div>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 600, marginTop: 6 }}>
          {info.missao}
        </div>
      </div>
    </div>,
  ]

  const isLast = step === steps.length - 1
  const canAdvance = step === 0 || step === 1 || (step === 2 && dificuldades.length > 0) || step === 3 || step === 4

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#030712',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div style={{ maxWidth: 520, width: '100%' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 32 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: i <= step ? '#f59e0b' : '#1f2937',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step content */}
        <div style={{ minHeight: 300 }}>{steps[step]}</div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              style={{
                minHeight: 44,
                background: '#1f2937',
                color: '#9ca3af',
                border: '1px solid #374151',
                borderRadius: 10,
                padding: '10px 20px',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              ← Voltar
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              onClick={finalizar}
              disabled={salvando}
              style={{
                minHeight: 48,
                background: '#f59e0b',
                color: '#030712',
                border: 'none',
                borderRadius: 10,
                padding: '12px 32px',
                cursor: salvando ? 'not-allowed' : 'pointer',
                fontSize: 16,
                fontWeight: 800,
                opacity: salvando ? 0.5 : 1,
              }}
            >
              {salvando ? '⏳ Salvando...' : '⚔️ Começar a usar'}
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance}
              style={{
                minHeight: 44,
                background: '#f59e0b',
                color: '#030712',
                border: 'none',
                borderRadius: 10,
                padding: '10px 24px',
                cursor: canAdvance ? 'pointer' : 'not-allowed',
                fontSize: 14,
                fontWeight: 700,
                opacity: canAdvance ? 1 : 0.4,
              }}
            >
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
