'use client'

import { useState, useCallback, useEffect } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface HorarioDia {
  ativo: boolean
  inicio: string
  fim: string
}

interface UsuarioExtra {
  nome: string
  email: string
  cargo: string
}

interface ChecklistItem {
  label: string
  done: boolean
  link: string
  linkLabel: string
}

interface FormData {
  // Step 1
  nomeClinica: string
  cnpj: string
  responsavel: string
  email: string
  whatsapp: string
  cidade: string
  estado: string
  especialidade: string
  plano: string
  dataInicio: string
  csResponsavel: string
  // Step 2
  procedimentos: string[]
  horarios: Record<string, HorarioDia>
  numProfissionais: number
  numSalas: number
  metaMensal: number
  investimentoTrafego: number
  // Step 3
  senhaTemporaria: string
  usuarios: UsuarioExtra[]
  enviarEmailBoasVindas: boolean
  // Step 4
  checklist: ChecklistItem[]
}

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
]

const ESPECIALIDADES = [
  'Ortodontia','Implantodontia','Estética','Clínica Geral','Harmonização','Multidisciplinar'
]

const PROCEDIMENTOS_OPCOES = [
  'Implante','Ortodontia','Clareamento','Prótese',
  'Lente de Contato','Botox','Harmonização','Outros'
]

const DIAS_SEMANA = [
  { key: 'seg', label: 'Seg' },
  { key: 'ter', label: 'Ter' },
  { key: 'qua', label: 'Qua' },
  { key: 'qui', label: 'Qui' },
  { key: 'sex', label: 'Sex' },
  { key: 'sab', label: 'Sáb' },
  { key: 'dom', label: 'Dom' },
]

const CARGOS = ['Administrador','Atendente','Financeiro','Tráfego']

const CS_OPTIONS = ['Ana Silva','Carlos Mendes','Julia Santos']

const STEP_NAMES = [
  'Dados da Clínica',
  'Configurações',
  'Usuários',
  'Checklist',
  'Pronto!',
]

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { label: 'Extensão Chrome instalada', done: false, link: 'https://excalibur-app.vercel.app/configuracoes', linkLabel: 'Instalar' },
  { label: 'WhatsApp Web conectado', done: false, link: 'https://web.whatsapp.com', linkLabel: 'Conectar' },
  { label: 'Primeiro lead adicionado', done: false, link: 'https://excalibur-app.vercel.app/crm', linkLabel: 'Abrir CRM' },
  { label: 'Primeiro agendamento criado', done: false, link: 'https://excalibur-app.vercel.app/agenda', linkLabel: 'Abrir Agenda' },
  { label: 'Proposta de exemplo criada', done: false, link: 'https://excalibur-app.vercel.app/vendas', linkLabel: 'Criar Proposta' },
  { label: 'Campanha de tráfego configurada', done: false, link: 'https://excalibur-app.vercel.app/marketing', linkLabel: 'Ver Marketing' },
  { label: 'Meta mensal definida', done: false, link: 'https://excalibur-app.vercel.app/metas', linkLabel: 'Definir Meta' },
  { label: 'Equipe treinada (Academia)', done: false, link: 'https://excalibur-app.vercel.app/academia', linkLabel: 'Ver Academia' },
]

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function buildDefaultHorarios(): Record<string, HorarioDia> {
  const h: Record<string, HorarioDia> = {}
  DIAS_SEMANA.forEach(d => {
    const ativo = !['sab', 'dom'].includes(d.key)
    h[d.key] = { ativo, inicio: ativo ? '08:00' : '08:00', fim: ativo ? '18:00' : '18:00' }
  })
  return h
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OnboardingNovoPage() {
  const [step, setStep] = useState(1)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [clinicaId, setClinicaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState<FormData>({
    nomeClinica: '',
    cnpj: '',
    responsavel: '',
    email: '',
    whatsapp: '',
    cidade: '',
    estado: '',
    especialidade: '',
    plano: 'pro',
    dataInicio: new Date().toISOString().split('T')[0],
    csResponsavel: 'Ana Silva',
    procedimentos: [],
    horarios: buildDefaultHorarios(),
    numProfissionais: 2,
    numSalas: 3,
    metaMensal: 50000,
    investimentoTrafego: 5000,
    senhaTemporaria: generatePassword(),
    usuarios: [],
    enviarEmailBoasVindas: true,
    checklist: INITIAL_CHECKLIST,
  })

  // Mark step 5 complete on mount
  useEffect(() => {
    if (step === 5 && sessionId) {
      fetch(`/api/hq/onboarding/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 5, status: 'concluido', data: formData }),
      }).catch(() => {})
    }
  }, [step, sessionId, formData])

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }, [])

  // ─── API Calls ──────────────────────────────────────────────────────────

  async function handleStep1Next() {
    if (!formData.nomeClinica || !formData.responsavel || !formData.email || !formData.whatsapp) {
      alert('Preencha todos os campos obrigatórios (*)')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/hq/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_clinica: formData.nomeClinica,
          cnpj: formData.cnpj,
          responsavel: formData.responsavel,
          email: formData.email,
          whatsapp: formData.whatsapp,
          cidade: formData.cidade,
          estado: formData.estado,
          especialidade: formData.especialidade,
          plano: formData.plano,
          data_inicio: formData.dataInicio,
          cs_responsavel: formData.csResponsavel,
        }),
      })
      const json = await res.json() as { clinica_id: string; session_id: string }
      setClinicaId(json.clinica_id)
      setSessionId(json.session_id)
      setStep(2)
    } catch {
      setStep(2) // proceed anyway for demo
    } finally {
      setLoading(false)
    }
  }

  async function handleStepNext(currentStep: number) {
    setLoading(true)
    try {
      if (sessionId) {
        await fetch(`/api/hq/onboarding/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ step: currentStep, data: formData }),
        })
      }
    } catch {
      // proceed anyway
    } finally {
      setLoading(false)
      setStep(currentStep + 1)
    }
  }

  function handleBack() {
    setStep(prev => Math.max(1, prev - 1))
  }

  function handleSaveAndExit() {
    if (sessionId) {
      fetch(`/api/hq/onboarding/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data: formData, status: 'pausado' }),
      }).catch(() => {})
    }
    window.location.href = '/onboarding'
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  // ─── Input Helpers ──────────────────────────────────────────────────────

  const inputClass =
    'w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30'
  const selectClass =
    'w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 appearance-none'
  const labelClass = 'block text-sm font-medium text-gray-400 mb-1.5'

  // ─── Step Sidebar ───────────────────────────────────────────────────────

  function renderSidebar() {
    return (
      <div className="w-64 shrink-0">
        <div className="space-y-1">
          {STEP_NAMES.map((name, idx) => {
            const s = idx + 1
            const isCompleted = s < step
            const isCurrent = s === step
            return (
              <div
                key={s}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                  isCurrent
                    ? 'border-l-2 border-amber-500 bg-gray-900/60'
                    : ''
                }`}
              >
                {/* Indicator */}
                {isCompleted ? (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500/20">
                    <svg className="h-3.5 w-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isCurrent ? (
                  <div className="flex h-6 w-6 items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                  </div>
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center">
                    <div className="h-2.5 w-2.5 rounded-full bg-gray-600" />
                  </div>
                )}
                {/* Label */}
                <span
                  className={`text-sm font-medium ${
                    isCompleted
                      ? 'text-green-400'
                      : isCurrent
                      ? 'text-white'
                      : 'text-gray-500'
                  }`}
                >
                  {name}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ─── Step 1: Dados da Clínica ───────────────────────────────────────────

  function renderStep1() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Dados da Clínica</h2>
          <p className="mt-1 text-gray-400">Informações básicas para criar a conta</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelClass}>Nome da clínica *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Ex: Odonto Excellence"
              value={formData.nomeClinica}
              onChange={e => updateField('nomeClinica', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>CNPJ</label>
            <input
              type="text"
              className={inputClass}
              placeholder="00.000.000/0000-00"
              value={formData.cnpj}
              onChange={e => updateField('cnpj', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Responsável *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="Nome do responsável"
              value={formData.responsavel}
              onChange={e => updateField('responsavel', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              className={inputClass}
              placeholder="contato@clinica.com.br"
              value={formData.email}
              onChange={e => updateField('email', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>WhatsApp *</label>
            <input
              type="text"
              className={inputClass}
              placeholder="(00) 00000-0000"
              value={formData.whatsapp}
              onChange={e => updateField('whatsapp', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Cidade</label>
            <input
              type="text"
              className={inputClass}
              placeholder="São Paulo"
              value={formData.cidade}
              onChange={e => updateField('cidade', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>Estado</label>
            <select
              className={selectClass}
              value={formData.estado}
              onChange={e => updateField('estado', e.target.value)}
            >
              <option value="">Selecione</option>
              {ESTADOS_BR.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Especialidade</label>
            <select
              className={selectClass}
              value={formData.especialidade}
              onChange={e => updateField('especialidade', e.target.value)}
            >
              <option value="">Selecione</option>
              {ESPECIALIDADES.map(esp => (
                <option key={esp} value={esp}>{esp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Plano */}
        <div>
          <label className={labelClass}>Plano contratado</label>
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { id: 'starter', name: 'Starter', price: 'R$ 297', desc: '/mês', badge: null },
              { id: 'pro', name: 'Pro', price: 'R$ 597', desc: '/mês', badge: 'Popular' },
              { id: 'elite', name: 'Elite', price: 'R$ 997', desc: '/mês', badge: null },
            ].map(plan => (
              <label
                key={plan.id}
                className={`relative flex cursor-pointer flex-col items-center rounded-xl border-2 p-5 transition ${
                  formData.plano === plan.id
                    ? 'border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
                    : 'border-gray-800 bg-gray-900 hover:border-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name="plano"
                  value={plan.id}
                  checked={formData.plano === plan.id}
                  onChange={e => updateField('plano', e.target.value)}
                  className="sr-only"
                />
                {plan.badge && (
                  <span className="absolute -top-2.5 rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-gray-950">
                    {plan.badge}
                  </span>
                )}
                <span className="text-lg font-bold text-white">{plan.name}</span>
                <span className="mt-1 text-2xl font-black text-amber-500">{plan.price}</span>
                <span className="text-sm text-gray-500">{plan.desc}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Data de início</label>
            <input
              type="date"
              className={inputClass}
              value={formData.dataInicio}
              onChange={e => updateField('dataInicio', e.target.value)}
            />
          </div>

          <div>
            <label className={labelClass}>CS responsável</label>
            <select
              className={selectClass}
              value={formData.csResponsavel}
              onChange={e => updateField('csResponsavel', e.target.value)}
            >
              {CS_OPTIONS.map(cs => (
                <option key={cs} value={cs}>{cs}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 2: Configurações ──────────────────────────────────────────────

  function renderStep2() {
    function toggleProcedimento(proc: string) {
      setFormData(prev => {
        const exists = prev.procedimentos.includes(proc)
        return {
          ...prev,
          procedimentos: exists
            ? prev.procedimentos.filter(p => p !== proc)
            : [...prev.procedimentos, proc],
        }
      })
    }

    function updateHorario(dia: string, field: keyof HorarioDia, value: string | boolean) {
      setFormData(prev => ({
        ...prev,
        horarios: {
          ...prev.horarios,
          [dia]: { ...prev.horarios[dia], [field]: value },
        },
      }))
    }

    return (
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Configurações</h2>
          <p className="mt-1 text-gray-400">Personalize o sistema para a clínica</p>
        </div>

        {/* Procedimentos */}
        <div>
          <label className={labelClass}>Procedimentos oferecidos</label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            {PROCEDIMENTOS_OPCOES.map(proc => (
              <label
                key={proc}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition ${
                  formData.procedimentos.includes(proc)
                    ? 'border-amber-500/50 bg-amber-500/10 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
                    formData.procedimentos.includes(proc)
                      ? 'border-amber-500 bg-amber-500'
                      : 'border-gray-600 bg-gray-800'
                  }`}
                >
                  {formData.procedimentos.includes(proc) && (
                    <svg className="h-3 w-3 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">{proc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Horários */}
        <div>
          <label className={labelClass}>Horários de funcionamento</label>
          <div className="mt-2 space-y-2">
            {DIAS_SEMANA.map(dia => {
              const h = formData.horarios[dia.key]
              return (
                <div key={dia.key} className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 px-4 py-3">
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => updateHorario(dia.key, 'ativo', !h.ativo)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                      h.ativo ? 'bg-amber-500' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        h.ativo ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`w-10 text-sm font-medium ${h.ativo ? 'text-white' : 'text-gray-500'}`}>
                    {dia.label}
                  </span>
                  <input
                    type="time"
                    disabled={!h.ativo}
                    className={`rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none transition focus:border-amber-500 disabled:opacity-40`}
                    value={h.inicio}
                    onChange={e => updateHorario(dia.key, 'inicio', e.target.value)}
                  />
                  <span className="text-gray-500">até</span>
                  <input
                    type="time"
                    disabled={!h.ativo}
                    className={`rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-white outline-none transition focus:border-amber-500 disabled:opacity-40`}
                    value={h.fim}
                    onChange={e => updateHorario(dia.key, 'fim', e.target.value)}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Números */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Número de profissionais</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={formData.numProfissionais}
              onChange={e => updateField('numProfissionais', parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className={labelClass}>Número de salas</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={formData.numSalas}
              onChange={e => updateField('numSalas', parseInt(e.target.value) || 1)}
            />
          </div>
          <div>
            <label className={labelClass}>Meta mensal de faturamento (R$)</label>
            <input
              type="number"
              min={0}
              step={1000}
              className={inputClass}
              value={formData.metaMensal}
              onChange={e => updateField('metaMensal', parseInt(e.target.value) || 0)}
            />
          </div>
          <div>
            <label className={labelClass}>Investimento em tráfego (R$)</label>
            <input
              type="number"
              min={0}
              step={500}
              className={inputClass}
              value={formData.investimentoTrafego}
              onChange={e => updateField('investimentoTrafego', parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
    )
  }

  // ─── Step 3: Usuários ───────────────────────────────────────────────────

  function renderStep3() {
    function addUsuario() {
      setFormData(prev => ({
        ...prev,
        usuarios: [...prev.usuarios, { nome: '', email: '', cargo: 'Atendente' }],
      }))
    }

    function removeUsuario(idx: number) {
      setFormData(prev => ({
        ...prev,
        usuarios: prev.usuarios.filter((_, i) => i !== idx),
      }))
    }

    function updateUsuario(idx: number, field: keyof UsuarioExtra, value: string) {
      setFormData(prev => ({
        ...prev,
        usuarios: prev.usuarios.map((u, i) => (i === idx ? { ...u, [field]: value } : u)),
      }))
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Usuários</h2>
          <p className="mt-1 text-gray-400">Configure os acessos da equipe</p>
        </div>

        {/* Admin */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-amber-500">
            Administrador Principal
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Email do admin</label>
              <input
                type="email"
                className={`${inputClass} opacity-60`}
                value={formData.email}
                readOnly
              />
            </div>
            <div>
              <label className={labelClass}>Senha temporária</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputClass}
                  value={formData.senhaTemporaria}
                  readOnly
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(formData.senhaTemporaria)}
                  className="shrink-0 rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm font-medium text-white transition hover:border-amber-500 hover:text-amber-500"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Extra users */}
        <div className="space-y-3">
          {formData.usuarios.map((user, idx) => (
            <div
              key={idx}
              className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4"
            >
              <div className="flex-1 min-w-[140px]">
                <label className={labelClass}>Nome</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Nome"
                  value={user.nome}
                  onChange={e => updateUsuario(idx, 'nome', e.target.value)}
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className={labelClass}>Email</label>
                <input
                  type="email"
                  className={inputClass}
                  placeholder="email@clinica.com"
                  value={user.email}
                  onChange={e => updateUsuario(idx, 'email', e.target.value)}
                />
              </div>
              <div className="w-44">
                <label className={labelClass}>Cargo</label>
                <select
                  className={selectClass}
                  value={user.cargo}
                  onChange={e => updateUsuario(idx, 'cargo', e.target.value)}
                >
                  {CARGOS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeUsuario(idx)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-red-900/50 bg-red-950/30 text-red-400 transition hover:bg-red-900/40"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addUsuario}
          className="flex items-center gap-2 rounded-xl border border-dashed border-gray-700 px-5 py-3 text-sm font-medium text-gray-400 transition hover:border-amber-500 hover:text-amber-500"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Adicionar usuário
        </button>

        {/* Checkbox */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition ${
              formData.enviarEmailBoasVindas
                ? 'border-amber-500 bg-amber-500'
                : 'border-gray-600 bg-gray-800'
            }`}
            onClick={() => updateField('enviarEmailBoasVindas', !formData.enviarEmailBoasVindas)}
          >
            {formData.enviarEmailBoasVindas && (
              <svg className="h-3 w-3 text-gray-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="text-sm text-gray-300">Enviar email de boas-vindas para todos os usuários</span>
        </label>
      </div>
    )
  }

  // ─── Step 4: Checklist ──────────────────────────────────────────────────

  function renderStep4() {
    function toggleItem(idx: number) {
      setFormData(prev => ({
        ...prev,
        checklist: prev.checklist.map((item, i) =>
          i === idx ? { ...item, done: !item.done } : item
        ),
      }))
    }

    function markAll() {
      setFormData(prev => ({
        ...prev,
        checklist: prev.checklist.map(item => ({ ...item, done: true })),
      }))
    }

    const doneCount = formData.checklist.filter(i => i.done).length

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Checklist de Ativação</h2>
            <p className="mt-1 text-gray-400">
              {doneCount}/{formData.checklist.length} concluídos
            </p>
          </div>
          <button
            type="button"
            onClick={markAll}
            className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition hover:border-amber-500 hover:text-amber-500"
          >
            Marcar todos
          </button>
        </div>

        {/* Progress */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{ width: `${(doneCount / formData.checklist.length) * 100}%` }}
          />
        </div>

        <div className="space-y-2">
          {formData.checklist.map((item, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between rounded-xl border px-5 py-4 transition ${
                item.done
                  ? 'border-green-900/50 bg-green-950/20'
                  : 'border-gray-800 bg-gray-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    item.done
                      ? 'border-green-500 bg-green-500'
                      : 'border-gray-600 hover:border-amber-500'
                  }`}
                >
                  {item.done && (
                    <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`text-sm font-medium ${item.done ? 'text-green-400 line-through' : 'text-white'}`}>
                  {item.label}
                </span>
              </div>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-amber-500 hover:text-amber-400 transition"
              >
                {item.linkLabel} &rarr;
              </a>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ─── Step 5: Pronto ─────────────────────────────────────────────────────

  function renderStep5() {
    const planoLabel = formData.plano === 'starter' ? 'Starter' : formData.plano === 'pro' ? 'Pro' : 'Elite'
    const totalUsuarios = 1 + formData.usuarios.length
    const totalProc = formData.procedimentos.length
    const diasAtivos = Object.values(formData.horarios).filter(h => h.ativo).length

    return (
      <div className="space-y-8">
        {/* Celebration */}
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-black text-white">
            Clínica {formData.nomeClinica || 'Nova'} está pronta!
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-4 py-1.5">
            <span className="text-sm font-bold text-amber-500">Plano {planoLabel}</span>
          </div>
          <p className="mt-3 text-gray-400">
            CS responsável: <span className="text-white font-medium">{formData.csResponsavel}</span>
          </p>
        </div>

        {/* Summary */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Resumo</h3>
          {[
            'Clínica criada no sistema',
            `${totalUsuarios} usuário${totalUsuarios > 1 ? 's' : ''} cadastrado${totalUsuarios > 1 ? 's' : ''}`,
            `${totalProc} procedimento${totalProc !== 1 ? 's' : ''} configurado${totalProc !== 1 ? 's' : ''}`,
            `Horários definidos (${diasAtivos} dia${diasAtivos !== 1 ? 's' : ''}/semana)`,
            `Meta: R$ ${formData.metaMensal.toLocaleString('pt-BR')}/mês`,
          ].map((text, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20">
                <svg className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm text-gray-300">{text}</span>
            </div>
          ))}
        </div>

        {/* Access URLs */}
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">URLs de Acesso</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
              <span className="text-sm text-gray-400">Sistema</span>
              <a
                href="https://excalibur-app.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-amber-500 hover:text-amber-400"
              >
                excalibur-app.vercel.app
              </a>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-800 px-4 py-3">
              <span className="text-sm text-gray-400">HQ</span>
              <a
                href="https://excalibur-hq.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-amber-500 hover:text-amber-400"
              >
                excalibur-hq.vercel.app
              </a>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-4">
          <a
            href="/planos"
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-4 text-center text-sm font-bold text-gray-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-500/40"
          >
            Escolher plano e ativar
          </a>
          <a
            href="https://excalibur-app.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-6 py-4 text-center text-sm font-bold text-white transition hover:border-amber-500"
          >
            Acessar sistema
          </a>
        </div>
      </div>
    )
  }

  // ─── Navigation Buttons ─────────────────────────────────────────────────

  function renderNavButtons() {
    if (step === 5) return null

    return (
      <div className="flex items-center justify-between border-t border-gray-800 pt-6">
        <div>
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="rounded-xl border border-gray-700 bg-gray-800 px-6 py-3 text-sm font-medium text-white transition hover:border-gray-600"
            >
              &larr; Voltar
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={handleSaveAndExit}
              className="rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 text-sm font-medium text-gray-400 transition hover:text-white"
            >
              Salvar e sair
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (step === 1) {
                handleStep1Next()
              } else {
                handleStepNext(step)
              }
            }}
            className="rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-3 text-sm font-bold text-gray-950 shadow-lg shadow-amber-500/20 transition hover:shadow-amber-500/40 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Salvando...
              </span>
            ) : (
              'Avançar →'
            )}
          </button>
        </div>
      </div>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const stepRenderers: Record<number, () => React.JSX.Element> = {
    1: renderStep1,
    2: renderStep2,
    3: renderStep3,
    4: renderStep4,
    5: renderStep5,
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-900">
        <div
          className="h-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 transition-all duration-700 ease-out"
          style={{ width: `${(step / 5) * 100}%` }}
        />
      </div>

      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚔️</span>
            <span className="text-lg font-bold text-white">Onboarding</span>
            <span className="rounded-full bg-gray-800 px-3 py-0.5 text-xs font-medium text-gray-400">
              Passo {step} de 5
            </span>
          </div>
          {clinicaId && (
            <span className="text-xs text-gray-500 font-mono">
              ID: {clinicaId.slice(0, 8)}...
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          {renderSidebar()}

          {/* Form area */}
          <div className="flex-1 min-w-0">
            <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-8">
              {stepRenderers[step]()}
            </div>

            {/* Nav buttons */}
            <div className="mt-6">
              {renderNavButtons()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}