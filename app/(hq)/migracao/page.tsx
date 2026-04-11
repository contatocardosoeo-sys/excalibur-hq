'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../components/Sidebar'
import { supabase } from '../../lib/supabase'

type ScorePayload = {
  email: string
  semana: string
  score: number
  dias_sem_externo: number
  dias_com_externo: number
  dias_uteis: number
  passos_concluidos: number
  passos_total: number
  bonus: number
  passos: Array<{ key: string; label: string; peso: number; ordem: number; concluido: boolean; concluido_em: string | null }>
}

const CHECKLIST_ROTA: Record<string, string> = {
  diagnostico: '/migracao/diagnostico',
  importar_dados: '/importar',
  checkin_7_dias: '/migracao/checkin',
  acesso_7_dias: '/ceo',
  zero_externo_7d: '/migracao/checkin',
  tutorial_equipe: '/migracao/diagnostico',
}

export default function MigracaoPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [role, setRole] = useState('')
  const [score, setScore] = useState<ScorePayload | null>(null)
  const [diagRespondido, setDiagRespondido] = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { setLoading(false); return }
      setEmail(user.email)

      const { data: interno } = await supabase.from('usuarios_internos').select('nome, role').eq('email', user.email).single()
      setNome(interno?.nome || '')
      setRole(interno?.role || '')

      const [s, d] = await Promise.all([
        fetch(`/api/migracao/score?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
        fetch(`/api/migracao/diagnostico?email=${encodeURIComponent(user.email)}`).then(r => r.json()),
      ])
      setScore(s)
      setDiagRespondido(d.respondido)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 p-4 md:p-6 flex items-center justify-center text-gray-500 text-sm">Carregando...</div>
      </div>
    )
  }

  const primeiroNome = nome.split(' ')[0] || email.split('@')[0]

  const scoreCor = (score?.score || 0) >= 80 ? 'text-green-400' : (score?.score || 0) >= 50 ? 'text-amber-400' : 'text-red-400'
  const scoreBadge = (score?.score || 0) >= 80 ? '🟢 Saudável' : (score?.score || 0) >= 50 ? '🟡 Atenção' : '🔴 Crítico'

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-white text-2xl md:text-3xl font-bold">⚔️ Migração Cultural</h1>
          <p className="text-gray-400 text-sm mt-1">
            Olá, {primeiroNome}. Vamos trazer <strong>100% da sua operação</strong> pra dentro do Excalibur HQ.
          </p>
        </div>

        {/* Alerta crítico se diagnóstico não respondido */}
        {!diagRespondido && (
          <div className="mb-6 bg-red-500/10 border border-red-500/40 rounded-xl p-4">
            <div className="flex flex-wrap items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1 min-w-0">
                <div className="text-red-400 font-bold text-sm">Primeiro passo: responder o diagnóstico (5 min)</div>
                <p className="text-gray-300 text-xs mt-1">Suas respostas vão moldar quais importadores criar pra você. Sem isso, nada funciona.</p>
              </div>
              <Link href="/migracao/diagnostico" className="bg-red-500 hover:bg-red-400 text-white text-xs font-bold px-4 py-2 rounded-lg min-h-[40px] flex items-center">
                Responder →
              </Link>
            </div>
          </div>
        )}

        {/* Score grande */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">Seu score HQ-only · semana {score?.semana}</span>
              <span className={`text-xs font-bold ${scoreCor}`}>{scoreBadge}</span>
            </div>
            <div className="flex items-end gap-3">
              <div className={`text-5xl font-bold ${scoreCor}`}>{score?.score || 0}</div>
              <div className="text-gray-500 text-sm pb-2">/ 100</div>
            </div>
            <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${(score?.score || 0) >= 80 ? 'bg-green-500' : (score?.score || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score?.score || 0}%` }} />
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Cardoso está monitorando. Score abaixo de 80 = vai ser conversado na 1:1 de segunda.
              <strong className="text-red-400"> Comissão (se aplica) está atrelada a este score.</strong>
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="text-[10px] uppercase text-gray-500 font-semibold mb-2">Checkins da semana</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
                <div className="text-green-400 font-bold text-xl">{score?.dias_sem_externo || 0}</div>
                <div className="text-[9px] text-gray-500 uppercase">HQ only</div>
              </div>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
                <div className="text-red-400 font-bold text-xl">{score?.dias_com_externo || 0}</div>
                <div className="text-[9px] text-gray-500 uppercase">Usou fora</div>
              </div>
            </div>
            <p className="text-[10px] text-gray-600 mt-2">
              Bônus +10 pontos se 5 dias HQ only sem uso externo.
            </p>
          </div>
        </div>

        {/* Passos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <h2 className="text-white font-bold text-sm uppercase tracking-wider mb-4">📋 Sua trilha de migração</h2>
          <div className="space-y-2">
            {score?.passos.map(p => (
              <Link
                key={p.key}
                href={CHECKLIST_ROTA[p.key] || '/migracao'}
                className={`flex items-center gap-3 p-3 rounded-lg transition ${p.concluido ? 'bg-green-500/10 border border-green-500/30' : 'bg-gray-800/40 border border-gray-700 hover:border-amber-500/40'}`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${p.concluido ? 'bg-green-500 text-gray-950' : 'bg-gray-700 text-gray-400'}`}>
                  {p.concluido ? '✓' : p.ordem}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm ${p.concluido ? 'text-green-400 line-through' : 'text-white'}`}>{p.label}</div>
                  {p.concluido && p.concluido_em && (
                    <div className="text-[10px] text-gray-500">Concluído em {new Date(p.concluido_em).toLocaleDateString('pt-BR')}</div>
                  )}
                </div>
                <span className="text-[10px] text-gray-500">{p.peso} pts</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Link href="/migracao/diagnostico" className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition">
            <div className="text-2xl mb-2">📝</div>
            <div className="text-white font-bold text-sm">Diagnóstico</div>
            <div className="text-xs text-gray-500 mt-1">5 perguntas pra moldar seu setor</div>
          </Link>
          <Link href="/migracao/checkin" className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition">
            <div className="text-2xl mb-2">✅</div>
            <div className="text-white font-bold text-sm">Checkin de hoje</div>
            <div className="text-xs text-gray-500 mt-1">Diga se usou alguma ferramenta externa</div>
          </Link>
          <Link href="/importar" className="bg-gray-900 border border-gray-800 hover:border-amber-500/40 rounded-xl p-4 transition">
            <div className="text-2xl mb-2">📥</div>
            <div className="text-white font-bold text-sm">Importar dados</div>
            <div className="text-xs text-gray-500 mt-1">Trazer seus dados externos pro HQ</div>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <p className="text-amber-300 text-xs">
            <strong>Regra vigente (nível DURO):</strong> a partir de agora, informação que não está no HQ = informação que não existe.
            Venda fora do Kanban = sem comissão. Lead fora do CRM = invisível. Cliente fora da jornada = churn iminente.
            Cardoso leva isso a sério. Luana valida semanalmente.
          </p>
        </div>
      </div>
    </div>
  )
}
