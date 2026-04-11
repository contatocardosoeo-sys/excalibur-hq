'use client'

import { useState } from 'react'

interface Props {
  onComplete: () => void
  respondidoPor: string
}

type Respostas = {
  q_gestores_count: string
  q_clinicas_por_gestor: string
  q_plataformas: string[]
  q_rotina_diaria: string
  q_dados_hoje: string
  q_integracao_api: string
  q_metricas_importantes: string[]
  q_meta_padrao: string
  q_cpl_alvo: string
  q_definicao_bom: string
  q_fluxo_medina: string
  q_saber_jornada: string
  q_trafego_pausado: string
  q_planilha_atual: string
  q_relatorio_manual: string
  q_dor_principal: string
  q_mvp: string
}

const PLATAFORMAS = ['Meta Ads', 'Google Ads', 'TikTok Ads', 'Outro']
const METRICAS = ['CPL', 'Volume de Leads', 'CTR', 'CPC', 'ROAS', 'Investimento', 'Frequência', 'Alcance']

export default function SetupOnboarding({ onComplete, respondidoPor }: Props) {
  const [etapa, setEtapa] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const [r, setR] = useState<Respostas>({
    q_gestores_count: '',
    q_clinicas_por_gestor: '',
    q_plataformas: [],
    q_rotina_diaria: '',
    q_dados_hoje: '',
    q_integracao_api: '',
    q_metricas_importantes: [],
    q_meta_padrao: '',
    q_cpl_alvo: '',
    q_definicao_bom: '',
    q_fluxo_medina: '',
    q_saber_jornada: '',
    q_trafego_pausado: '',
    q_planilha_atual: '',
    q_relatorio_manual: '',
    q_dor_principal: '',
    q_mvp: '',
  })

  const set = <K extends keyof Respostas>(k: K, v: Respostas[K]) => setR(prev => ({ ...prev, [k]: v }))

  const toggleArray = (k: 'q_plataformas' | 'q_metricas_importantes', val: string) => {
    const arr = r[k]
    set(k, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const finalizar = async () => {
    setSalvando(true)
    setErro('')
    try {
      const body = { ...r, respondido_por: respondidoPor || 'jessica' }
      const res = await fetch('/api/trafego-clientes/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Erro ao salvar')
      onComplete()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido')
      setSalvando(false)
    }
  }

  const inputClass = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none transition'
  const labelClass = 'block text-xs font-semibold text-gray-300 mb-1.5'
  const helperClass = 'text-[11px] text-gray-500 mt-1'

  const radioOptions = (k: keyof Respostas, opts: { value: string; label: string }[]) => (
    <div className="grid gap-2">
      {opts.map(o => (
        <label key={o.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${r[k] === o.value ? 'bg-amber-500/10 border-amber-500/60' : 'bg-gray-800/40 border-gray-700 hover:border-gray-600'}`}>
          <input
            type="radio"
            name={k}
            value={o.value}
            checked={r[k] === o.value}
            onChange={e => set(k, e.target.value as never)}
            className="accent-amber-500"
          />
          <span className="text-sm text-gray-200">{o.label}</span>
        </label>
      ))}
    </div>
  )

  const checkboxes = (k: 'q_plataformas' | 'q_metricas_importantes', opts: string[]) => (
    <div className="flex flex-wrap gap-2">
      {opts.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => toggleArray(k, o)}
          className={`px-4 py-2 rounded-lg text-xs font-semibold border transition ${r[k].includes(o) ? 'bg-amber-500 text-gray-950 border-amber-500' : 'bg-gray-800/40 text-gray-300 border-gray-700 hover:border-gray-600'}`}
        >
          {o}
        </button>
      ))}
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="text-4xl mb-2">📣</div>
        <h1 className="text-white text-2xl md:text-3xl font-bold">Olá, {respondidoPor?.split(' ')[0] || 'Jéssica'}! 👋</h1>
        <p className="text-gray-400 text-sm mt-2">Vamos configurar o seu setor de Tráfego de Clientes</p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          <span className="text-xs text-gray-500">Etapa {etapa} de 5</span>
          <span className="text-xs text-amber-400 font-semibold">{Math.round((etapa / 5) * 100)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-300" style={{ width: `${(etapa / 5) * 100}%` }} />
        </div>
      </div>

      {/* Card */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 md:p-8">
        {/* ETAPA 1 */}
        {etapa === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white text-lg font-bold">Sua equipe</h2>
              <p className="text-gray-500 text-xs">Suas respostas vão moldar exatamente como o sistema vai funcionar para você.</p>
            </div>

            <div>
              <label className={labelClass}>Quantos gestores de tráfego você coordena hoje?</label>
              <input type="number" min="0" value={r.q_gestores_count} onChange={e => set('q_gestores_count', e.target.value)} className={inputClass} placeholder="Ex: 3" />
            </div>

            <div>
              <label className={labelClass}>Quantas clínicas cada gestor gerencia em média?</label>
              <input type="text" value={r.q_clinicas_por_gestor} onChange={e => set('q_clinicas_por_gestor', e.target.value)} className={inputClass} placeholder="Ex: 15 clínicas por gestor" />
            </div>

            <div>
              <label className={labelClass}>Quais plataformas vocês usam?</label>
              {checkboxes('q_plataformas', PLATAFORMAS)}
              <p className={helperClass}>Clique para marcar as que usa</p>
            </div>
          </div>
        )}

        {/* ETAPA 2 */}
        {etapa === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white text-lg font-bold">Sua rotina hoje</h2>
              <p className="text-gray-500 text-xs">Como é o seu dia a dia gerenciando os gestores e clínicas.</p>
            </div>

            <div>
              <label className={labelClass}>O que você verifica todos os dias?</label>
              <textarea rows={3} value={r.q_rotina_diaria} onChange={e => set('q_rotina_diaria', e.target.value)} className={inputClass} placeholder="Ex: CPL por clínica, leads do dia, campanhas pausadas..." />
            </div>

            <div>
              <label className={labelClass}>Onde ficam os dados hoje?</label>
              {radioOptions('q_dados_hoje', [
                { value: 'planilha_google', label: 'Planilha Google Sheets' },
                { value: 'meta_ads_manager', label: 'Meta Ads Manager' },
                { value: 'dashboard_proprio', label: 'Dashboard próprio' },
                { value: 'outro', label: 'Outro' },
              ])}
            </div>

            <div>
              <label className={labelClass}>Usa Meta Ads API ou Google Ads API para extrair dados?</label>
              {radioOptions('q_integracao_api', [
                { value: 'meta', label: 'Sim, Meta Ads API' },
                { value: 'google', label: 'Sim, Google Ads API' },
                { value: 'ambos', label: 'Ambos' },
                { value: 'nao', label: 'Não — é manual' },
              ])}
            </div>
          </div>
        )}

        {/* ETAPA 3 */}
        {etapa === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white text-lg font-bold">Métricas que importam</h2>
              <p className="text-gray-500 text-xs">O sistema vai priorizar o que você quer ver.</p>
            </div>

            <div>
              <label className={labelClass}>Quais métricas você acompanha por clínica?</label>
              {checkboxes('q_metricas_importantes', METRICAS)}
            </div>

            <div>
              <label className={labelClass}>Existe uma meta padrão de CPL para todas?</label>
              {radioOptions('q_meta_padrao', [
                { value: 'padrao', label: 'Sim, uma meta padrão para todas' },
                { value: 'individual', label: 'Não, cada clínica tem a sua' },
              ])}
            </div>

            {r.q_meta_padrao === 'padrao' && (
              <div>
                <label className={labelClass}>Qual é o CPL alvo padrão? (em R$)</label>
                <input type="number" min="0" step="0.01" value={r.q_cpl_alvo} onChange={e => set('q_cpl_alvo', e.target.value)} className={inputClass} placeholder="Ex: 15.00" />
              </div>
            )}

            <div>
              <label className={labelClass}>O que define tráfego bom pra você?</label>
              <textarea rows={3} value={r.q_definicao_bom} onChange={e => set('q_definicao_bom', e.target.value)} className={inputClass} placeholder="Ex: CPL abaixo da meta + volume de leads acima de X + frequência saudável" />
            </div>
          </div>
        )}

        {/* ETAPA 4 */}
        {etapa === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white text-lg font-bold">Integração com o CS</h2>
              <p className="text-gray-500 text-xs">Como seu setor se conecta com a jornada D0-D90 que o Medina gerencia.</p>
            </div>

            <div>
              <label className={labelClass}>Quando uma clínica tem leads ruins, como comunica ao Medina?</label>
              {radioOptions('q_fluxo_medina', [
                { value: 'whatsapp', label: 'WhatsApp direto' },
                { value: 'sistema', label: 'Pelo sistema' },
                { value: 'reuniao', label: 'Reunião semanal' },
                { value: 'nao', label: 'Não costumo comunicar' },
              ])}
            </div>

            <div>
              <label className={labelClass}>Você precisa saber em qual etapa (D0-D30...) cada clínica está?</label>
              {radioOptions('q_saber_jornada', [
                { value: 'essencial', label: 'Sim, é essencial' },
                { value: 'util', label: 'Seria útil' },
                { value: 'nao', label: 'Não preciso' },
              ])}
            </div>

            <div>
              <label className={labelClass}>Alguma clínica tem tráfego pausado agora?</label>
              {radioOptions('q_trafego_pausado', [
                { value: 'sim', label: 'Sim, algumas' },
                { value: 'nao', label: 'Não, todas ativas' },
              ])}
            </div>
          </div>
        )}

        {/* ETAPA 5 */}
        {etapa === 5 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-white text-lg font-bold">O que vai mudar</h2>
              <p className="text-gray-500 text-xs">A parte mais importante: sua dor vai moldar o próximo passo.</p>
            </div>

            <div>
              <label className={labelClass}>Qual planilha você usa hoje?</label>
              <input type="text" value={r.q_planilha_atual} onChange={e => set('q_planilha_atual', e.target.value)} className={inputClass} placeholder="Ex: Planilha do Google chamada 'Trafego Clientes 2026'" />
            </div>

            <div>
              <label className={labelClass}>Seu relatório é manual ou automático?</label>
              {radioOptions('q_relatorio_manual', [
                { value: 'manual', label: 'Manual — eu monto na mão' },
                { value: 'semi', label: 'Semi-automático' },
                { value: 'auto', label: 'Já é automático' },
              ])}
            </div>

            <div>
              <label className={labelClass}>Qual é sua maior dor no dia a dia? <span className="text-amber-400">(mais importante)</span></label>
              <textarea rows={4} value={r.q_dor_principal} onChange={e => set('q_dor_principal', e.target.value)} className={inputClass} placeholder="Ex: Perco 3h todo dia montando relatórios na mão..." />
            </div>

            <div>
              <label className={labelClass}>O que precisaria pra largar a planilha e usar só o sistema?</label>
              <textarea rows={4} value={r.q_mvp} onChange={e => set('q_mvp', e.target.value)} className={inputClass} placeholder="Ex: Integração com Meta Ads API + relatório automático + alertas quando CPL passa da meta" />
            </div>
          </div>
        )}

        {erro && <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-red-400 text-xs">{erro}</div>}

        {/* Botões */}
        <div className="flex justify-between gap-3 mt-7 pt-5 border-t border-gray-800">
          <button
            onClick={() => setEtapa(e => Math.max(1, e - 1))}
            disabled={etapa === 1}
            className="px-5 py-2.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/40 hover:bg-gray-800 border border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition min-h-[44px]"
          >
            ← Anterior
          </button>
          {etapa < 5 ? (
            <button
              onClick={() => setEtapa(e => e + 1)}
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 transition min-h-[44px]"
            >
              Próxima etapa →
            </button>
          ) : (
            <button
              onClick={finalizar}
              disabled={salvando}
              className="px-5 py-2.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-gray-950 transition min-h-[44px] disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Configurar meu setor ⚔️'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
