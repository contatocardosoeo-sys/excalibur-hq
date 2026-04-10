'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import { Check, Shield, ChevronDown } from 'lucide-react'

// --------------- Types ---------------

interface Plan {
  name: string
  monthly: number
  annual: number
  subtitle: string
  features: string[]
  highlighted: boolean
  badge?: string
  buttonLabel: string
  buttonStyle: 'filled' | 'outline'
}

interface FaqItem {
  question: string
  answer: string
}

// --------------- Data ---------------

const plans: Plan[] = [
  {
    name: 'Apenas Financeira',
    monthly: 1000,
    annual: 800,
    subtitle: 'Antecipacao e credito para pacientes',
    features: [
      'Excalibur Pay (financeira)',
      'Simulador de propostas',
      'Antecipacao de recebiveis',
      'Dashboard financeiro',
      'Suporte via chat',
    ],
    highlighted: false,
    buttonLabel: 'Contratar Financeira',
    buttonStyle: 'outline',
  },
  {
    name: 'Apenas Marketing',
    monthly: 1500,
    annual: 1200,
    subtitle: 'Trafego pago + captacao de leads',
    features: [
      'Gestao de campanhas Meta/Google',
      'CRM de leads completo',
      'Extensao WhatsApp CRC',
      'Dashboard de metricas',
      'Suporte prioritario',
    ],
    highlighted: false,
    buttonLabel: 'Contratar Marketing',
    buttonStyle: 'outline',
  },
  {
    name: 'Completo',
    monthly: 3000,
    annual: 2400,
    subtitle: 'Tudo incluso — garantia 90 dias',
    features: [
      'Marketing + captacao de leads',
      'Excalibur Pay (financeira)',
      'CRM + WhatsApp CRC',
      'Treinamento comercial',
      'CS dedicado',
      'Dashboard completo + BI',
      'Garantia de resultado 90 dias',
    ],
    highlighted: true,
    badge: 'Mais popular',
    buttonLabel: 'Contratar Completo',
    buttonStyle: 'filled',
  },
  {
    name: 'Completo Premium',
    monthly: 3500,
    annual: 3500,
    subtitle: 'Sem fidelidade, sem garantia',
    features: [
      'Tudo do Completo',
      'Sem fidelidade',
      'Cancele quando quiser',
      'CS dedicado',
    ],
    highlighted: false,
    buttonLabel: 'Contratar Premium',
    buttonStyle: 'outline',
  },
]

const faqItems: FaqItem[] = [
  {
    question: 'Posso trocar de plano depois?',
    answer: 'Sim, você pode fazer upgrade ou downgrade a qualquer momento.',
  },
  {
    question: 'Qual forma de pagamento?',
    answer: 'Boleto, PIX ou Cartão via Asaas.',
  },
  {
    question: 'Tem fidelidade?',
    answer: 'Não, cancele quando quiser. Sem multas ou taxas.',
  },
  {
    question: 'O que acontece após os 7 dias?',
    answer: 'A cobrança automática é realizada no método de pagamento escolhido. Sem surpresas.',
  },
  {
    question: 'Preciso de cartão para o trial?',
    answer: 'Não, teste grátis por 7 dias sem compromisso e sem cadastrar cartão.',
  },
]

// --------------- Helpers ---------------

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// --------------- Sub-components ---------------

function BillingToggle({
  annual,
  onChange,
}: {
  annual: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={`text-sm font-medium ${!annual ? 'text-white' : 'text-gray-500'}`}>
        Mensal
      </span>
      <button
        type="button"
        onClick={() => onChange(!annual)}
        className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
          annual ? 'bg-amber-500' : 'bg-gray-700'
        }`}
        role="switch"
        aria-checked={annual}
      >
        <span
          className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ${
            annual ? 'translate-x-5' : 'translate-x-0.5'
          } mt-[1px]`}
        />
      </button>
      <span className={`text-sm font-medium ${annual ? 'text-white' : 'text-gray-500'}`}>
        Anual
      </span>
      {annual && (
        <span className="ml-1 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-semibold text-amber-400">
          Economize 20%
        </span>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  annual,
}: {
  plan: Plan
  annual: boolean
}) {
  const price = annual ? plan.annual : plan.monthly

  function handleClick() {
    // eslint-disable-next-line no-alert
    alert(`Plano selecionado: ${plan.name} (${annual ? 'anual' : 'mensal'}) — ${formatCurrency(price)}/mês`)
  }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 ${
        plan.highlighted
          ? 'border-amber-500 border-2 ring-1 ring-amber-500/30'
          : 'border-gray-800'
      } bg-gray-900`}
    >
      {plan.badge && (
        <span className="absolute -top-3 right-4 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-gray-950">
          {plan.badge}
        </span>
      )}

      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
      <p className="mt-1 text-sm text-gray-400">{plan.subtitle}</p>

      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-white">{formatCurrency(price)}</span>
        <span className="text-sm text-gray-500">/mês</span>
      </div>

      {annual && (
        <p className="mt-1 text-xs text-gray-500 line-through">
          {formatCurrency(plan.monthly)}/mês
        </p>
      )}

      <ul className="mt-6 flex-1 space-y-3">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-sm text-gray-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
            {feat}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={handleClick}
        className={`mt-8 w-full rounded-xl py-3 font-semibold transition-colors ${
          plan.buttonStyle === 'filled'
            ? 'bg-amber-500 text-gray-950 hover:bg-amber-400 text-base'
            : 'border border-amber-500 text-amber-500 hover:bg-amber-500/10'
        }`}
      >
        {plan.buttonLabel}
      </button>
    </div>
  )
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-3">
      {items.map((item, i) => (
        <div
          key={item.question}
          className="rounded-xl border border-gray-800 bg-gray-900"
        >
          <button
            type="button"
            onClick={() => toggle(i)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <span className="text-sm font-medium text-white">{item.question}</span>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                openIndex === i ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-300 ${
              openIndex === i ? 'max-h-40 pb-4' : 'max-h-0'
            }`}
          >
            <p className="px-5 text-sm text-gray-400">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// --------------- Inner Page (needs Suspense for useSearchParams) ---------------

function PlanosContent() {
  const searchParams = useSearchParams()
  const clinicaId = searchParams.get('clinica_id')

  const [annual, setAnnual] = useState(false)
  const [clinicaNome, setClinicaNome] = useState<string | null>(null)

  useEffect(() => {
    if (!clinicaId) return
    supabase
      .from('clinicas')
      .select('nome')
      .eq('id', clinicaId)
      .single()
      .then(({ data }) => {
        if (data) setClinicaNome(data.nome as string)
      })
  }, [clinicaId])

  return (
    <div className="min-h-screen bg-gray-950 p-8 overflow-auto">
      {/* Clinica banner */}
      {clinicaId && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-yellow-600/40 bg-yellow-500/10 px-5 py-3">
          <span className="text-sm font-medium text-yellow-400">
            Ativando plano para: {clinicaNome ?? clinicaId}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-10 flex flex-col items-center text-center">
        <h1 className="text-3xl font-bold text-white">Planos Excalibur</h1>
        <p className="mt-2 text-gray-400">Escolha o plano ideal para sua clínica</p>
        <div className="mt-6">
          <BillingToggle annual={annual} onChange={setAnnual} />
        </div>
      </div>

      {/* Plan cards */}
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} annual={annual} />
        ))}
      </div>

      {/* Guarantee */}
      <div className="mx-auto mt-14 flex max-w-md flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
          <Shield className="h-7 w-7 text-amber-500" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-white">7 dias grátis para testar</h3>
        <p className="mt-1 text-sm text-gray-400">
          Experimente todos os recursos sem compromisso. Cancele a qualquer momento.
        </p>
      </div>

      {/* FAQ */}
      <div className="mx-auto mt-16 max-w-2xl">
        <h2 className="mb-6 text-center text-xl font-bold text-white">Perguntas frequentes</h2>
        <FaqAccordion items={faqItems} />
      </div>
    </div>
  )
}

// --------------- Page ---------------

export default function PlanosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 flex items-center justify-center"><p className="text-gray-500">Carregando...</p></div>}>
      <PlanosContent />
    </Suspense>
  )
}
