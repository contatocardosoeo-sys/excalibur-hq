'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

type Passo = {
  key: string
  label: string
  descricao: string
  link: string
  concluido: boolean
  progresso?: { atual: number; meta: number; unidade?: string }
}

type ScoreDados = {
  score: number
  dias_sem_externo: number
  dias_com_externo: number
  passos_concluidos: number
  passos_total: number
}

type Colab = {
  email: string
  nome: string
  role: string
  score: number
  dias_sem_externo: number
  dias_com_externo: number
  passos_concluidos: number
  passos_total: number
}

const EMOJI_SCORE = (s: number) => s >= 81 ? '⚔️ HQ-only' : s >= 61 ? '🔥 No ritmo' : s >= 31 ? '💪 Evoluindo' : '😰 Começando'
const COR_SCORE = (s: number) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-amber-400' : s >= 40 ? 'text-orange-400' : 'text-red-400'
const BG_SCORE = (s: number) => s >= 80 ? 'from-green-500/20 to-emerald-500/10 border-green-500/40' : s >= 60 ? 'from-amber-500/20 to-yellow-500/10 border-amber-500/40' : s >= 40 ? 'from-orange-500/20 to-red-500/10 border-orange-500/40' : 'from-red-500/20 to-rose-500/10 border-red-500/40'

export default function MigracaoRolePage() {
  const router = useRouter()
  const params = useParams()
  const role = String(params.role || '').toLowerCase()

  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(true)
  const [score, setScore] = useState<ScoreDados | null>(null)
  const [passos, setPassos] = useState<Passo[]>([])

  // Dashboard mode (coo, admin)
  const [equipe, setEquipe] = useState<Colab[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user?.email) { setLoading(false); return }
        setEmail(user.email)
        const { data: interno } = await supabase.from('usuarios_internos').select('nome').eq('email', user.email).single()
        setNome(interno?.nome || '')

        const scoreData = await fetch(`/api/migracao/score?email=${encodeURIComponent(user.email)}`).then(r => r.json())
        setScore({
          score: scoreData.score || 0,
          dias_sem_externo: scoreData.dias_sem_externo || 0,
          dias_com_externo: scoreData.dias_com_externo || 0,
          passos_concluidos: scoreData.passos_concluidos || 0,
          passos_total: scoreData.passos_total || 6,
        })

        const passosDb: Record<string, boolean> = Object.fromEntries(
          (scoreData.passos || []).map((p: { key: string; concluido: boolean }) => [p.key, p.concluido])
        )

        // Buscar dados específicos do role
        await montarPassos(role, user.email, passosDb)

        // Se for coo/admin, buscar equipe
        if (role === 'coo' || role === 'admin') {
          const equipeData = await fetch('/api/migracao/score?todos=1').then(r => r.json())
          setEquipe(equipeData.colaboradores || [])
        }
      } catch { /* */ }
      setLoading(false)
    })()
  }, [role])

  const montarPassos = async (r: string, userEmail: string, passosDb: Record<string, boolean>) => {
    const lista: Passo[] = [
      {
        key: 'diagnostico',
        label: '📝 Diagnóstico respondido',
        descricao: 'As 5 perguntas que moldam o sistema pra sua realidade',
        link: '/migracao/diagnostico',
        concluido: !!passosDb.diagnostico,
      },
    ]

    if (r === 'sdr') {
      let leadsMes = 0
      try {
        const m = await fetch(`/api/sdr/metricas?periodo=mes`).then(r => r.json())
        leadsMes = Number(m?.acumulado?.leads || 0)
      } catch { /* */ }
      lista.push(
        { key: 'importar_leads', label: '📥 Importar seus leads', descricao: 'Cole sua planilha ou WhatsApp CSV aqui', link: '/importar/leads', concluido: !!passosDb.importar_dados },
        { key: 'checkin', label: '✅ Checkin diário', descricao: 'Registre qual ferramenta você usou hoje', link: '/migracao/checkin', concluido: !!passosDb.checkin_7_dias },
        { key: 'leads_mes', label: '🎯 Meta: 90 leads no HQ este mês', descricao: `Lançar todo dia no /sdr — dados viram números em tempo real`, link: '/sdr', concluido: leadsMes >= 90, progresso: { atual: leadsMes, meta: 90, unidade: 'leads' } },
        { key: 'zero_externo', label: '📞 7 dias sem WhatsApp manual', descricao: 'Meta HQ-only — cada dia sem usar WhatsApp pro CRM conta', link: '/migracao/checkin', concluido: !!passosDb.zero_externo_7d },
      )
    } else if (r === 'closer') {
      let fechamentos = 0
      try {
        const s = await fetch('/api/comercial/stats').then(r => r.json())
        fechamentos = Number(s?.fechamentos || 0)
      } catch { /* */ }
      lista.push(
        { key: 'importar_pipeline', label: '📥 Importar pipeline comercial', descricao: 'Mova seus leads do caderno/planilha para o Kanban', link: '/importar/pipeline', concluido: !!passosDb.importar_dados },
        { key: 'checkin', label: '✅ Checkin diário', descricao: 'Se usou WhatsApp/planilha pra fechar, registra', link: '/migracao/checkin', concluido: !!passosDb.checkin_7_dias },
        { key: 'kanban', label: '💼 Pipeline atualizado semanalmente', descricao: `Todos os deals abertos precisam estar em /comercial — ${fechamentos} fechamentos registrados`, link: '/comercial', concluido: fechamentos >= 5, progresso: { atual: fechamentos, meta: 5, unidade: 'fechamentos' } },
        { key: 'regra_duro', label: '⚠️ Regra DURO: comissão = só o que está no Kanban', descricao: 'Venda fora do /comercial não entra no cálculo de comissão. Sem exceção.', link: '/comercial', concluido: fechamentos >= 5 },
      )
    } else if (r === 'cs') {
      let scoreMedio = 0
      try {
        const p = await fetch('/api/cs/painel').then(r => r.json())
        scoreMedio = Number(p?.kpis?.score_medio || 0)
      } catch { /* */ }
      lista.push(
        { key: 'importar_contatos', label: '📥 Importar histórico de contatos', descricao: 'Histórico das 48 clínicas no /cs (WhatsApp + caderneta)', link: '/importar/contatos-cs', concluido: !!passosDb.importar_dados },
        { key: 'checkin', label: '✅ Checkin diário', descricao: 'Cada dia HQ-only é +1 pro seu score', link: '/migracao/checkin', concluido: !!passosDb.checkin_7_dias },
        { key: 'contatos_diarios', label: '📋 Registrar 3 contatos/dia no HQ', descricao: 'Ligar/WhatsApp 3 clínicas todo dia útil e registrar no /cs', link: '/cs', concluido: false },
        { key: 'score_meta', label: '🎯 Score médio das clínicas > 80', descricao: `Meta de saúde da carteira — atual ${scoreMedio}/100`, link: '/cs', concluido: scoreMedio >= 80, progresso: { atual: scoreMedio, meta: 80, unidade: 'pts' } },
      )
    } else if (r === 'head_traffic') {
      let configuradas = 0
      let total = 48
      try {
        const o = await fetch('/api/trafego-clientes/overview').then(r => r.json())
        configuradas = Number(o?.kpis?.comGestor || 0)
        total = Number(o?.kpis?.totalClinicas || 48)
      } catch { /* */ }
      lista.push(
        { key: 'setup', label: '⚔️ Setup do setor (5 etapas)', descricao: 'As 15 perguntas que você já respondeu moldaram o dashboard', link: '/trafego-clientes', concluido: true },
        { key: 'importar_clinicas', label: '📥 Vincular 48 clínicas aos gestores', descricao: `Cada clínica precisa de gestor + metas definidas — ${configuradas}/${total}`, link: '/importar/clinicas-trafego', concluido: configuradas >= total, progresso: { atual: configuradas, meta: total, unidade: 'clínicas' } },
        { key: 'checkin', label: '✅ Checkin diário', descricao: 'Reportar o uso da planilha externa (Meta Ads Manager não conta)', link: '/migracao/checkin', concluido: !!passosDb.checkin_7_dias },
        { key: 'lancar_metricas', label: '📊 Lançar métricas de 3+ clínicas/dia', descricao: 'CPL/leads/investimento no /trafego-clientes — não mais planilha', link: '/trafego-clientes', concluido: false },
        { key: 'cobertura', label: '🗺️ Meta: 24/48 clínicas configuradas até fim do mês', descricao: 'Primeira metade da carteira migrada — Meta Ads API em breve', link: '/trafego-clientes', concluido: configuradas >= 24, progresso: { atual: configuradas, meta: 24, unidade: 'clínicas' } },
      )
    } else if (r === 'coo' || r === 'admin') {
      // Esses roles veem dashboard, não trilha
      return setPassos([])
    } else {
      lista.push({ key: 'default', label: '🧭 Role não reconhecido', descricao: `"${r}" não tem trilha customizada ainda`, link: '/migracao', concluido: false })
    }

    setPassos(lista)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">Carregando trilha...</div>
      </div>
    )
  }

  const primeiroNome = nome.split(' ')[0] || email.split('@')[0]

  // ─── MODO DASHBOARD (coo, admin) ───
  if (role === 'coo' || role === 'admin') {
    const media = equipe.length > 0 ? Math.round(equipe.reduce((s, c) => s + c.score, 0) / equipe.length) : 0
    const emRisco = equipe.filter(c => c.score < 50).length
    const saudaveis = equipe.filter(c => c.score >= 80).length

    // Admin também vê o próprio progresso
    const meu = equipe.find(c => c.email === email)

    return (
      <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
        <Sidebar />
        <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
          <div className="max-w-5xl mx-auto">
            <div className="mb-6">
              <Link href="/migracao" className="text-xs text-amber-400 hover:text-amber-300">← Migração</Link>
              <h1 className="text-white text-2xl md:text-3xl font-bold mt-1">
                {role === 'admin' ? '⚔️ Migração Cultural — Visão CEO' : '📊 Adoção da Equipe — COO'}
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {role === 'admin' ? `Olá, ${primeiroNome}. Você dá o exemplo. Seu time está olhando.` : `Olá, ${primeiroNome}. Monitoramento semanal do time.`}
              </p>
            </div>

            {/* Admin: bloco "você dá o exemplo" */}
            {role === 'admin' && meu && (
              <div className={`mb-6 bg-gradient-to-br ${BG_SCORE(meu.score)} border rounded-xl p-5`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Sua trilha pessoal</div>
                    <div className={`text-3xl font-bold mt-1 ${COR_SCORE(meu.score)}`}>
                      {meu.score}<span className="text-gray-500 text-lg">/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl">{EMOJI_SCORE(meu.score)}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{meu.passos_concluidos}/{meu.passos_total} passos</div>
                  </div>
                </div>
                {meu.score < 100 && (
                  <Link href="/migracao/diagnostico" className="text-xs text-amber-400 hover:text-amber-300">
                    Complete seus passos pendentes →
                  </Link>
                )}
              </div>
            )}

            {/* KPIs agregados */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500">Score médio equipe</div>
                <div className={`text-2xl font-bold mt-1 ${COR_SCORE(media)}`}>{media}</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500">🟢 Saudáveis</div>
                <div className="text-2xl font-bold mt-1 text-green-400">{saudaveis}</div>
                <div className="text-[10px] text-gray-600">score ≥ 80</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500">🔴 Em risco</div>
                <div className="text-2xl font-bold mt-1 text-red-400">{emRisco}</div>
                <div className="text-[10px] text-gray-600">1:1 obrigatória</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500">Total equipe</div>
                <div className="text-2xl font-bold mt-1 text-white">{equipe.length}</div>
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-white font-bold text-sm">🏆 Ranking semanal</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800/40">
                    <tr className="text-left text-[10px] uppercase text-gray-500">
                      <th className="p-3">#</th>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-center">Score</th>
                      <th className="p-3 text-center">HQ-only</th>
                      <th className="p-3 text-center">Desvios</th>
                      <th className="p-3 text-center">Passos</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Trilha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipe.map((c, i) => {
                      const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''
                      return (
                        <tr key={c.email} className="border-t border-gray-800 hover:bg-gray-800/30">
                          <td className="p-3 text-gray-500 font-mono">{i + 1}{medalha}</td>
                          <td className="p-3 text-white font-medium">{c.nome || c.email.split('@')[0]}</td>
                          <td className="p-3 text-gray-400 uppercase text-[10px]">{c.role}</td>
                          <td className="p-3 text-center"><span className={`text-lg font-bold ${COR_SCORE(c.score)}`}>{c.score}</span></td>
                          <td className="p-3 text-center text-green-400">{c.dias_sem_externo}</td>
                          <td className="p-3 text-center">{c.dias_com_externo > 0 ? <span className="text-red-400 font-bold">{c.dias_com_externo}</span> : <span className="text-gray-600">—</span>}</td>
                          <td className="p-3 text-center text-gray-300">{c.passos_concluidos}/{c.passos_total}</td>
                          <td className="p-3">
                            {c.score < 50 ? <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-semibold border border-red-500/40">🚨 1:1</span>
                              : c.score < 80 ? <span className="text-[10px] text-amber-400">⚠️</span>
                              : <span className="text-[10px] text-green-400">✅</span>}
                          </td>
                          <td className="p-3">
                            {['sdr', 'closer', 'cs', 'head_traffic'].includes(c.role) && (
                              <Link href={`/migracao/${c.role}`} className="text-[10px] text-amber-400 hover:text-amber-300 underline">Ver →</Link>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {equipe.length === 0 && (
                      <tr><td colSpan={9} className="p-6 text-center text-gray-500">Sem dados ainda — equipe precisa começar a fazer checkin</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── MODO TRILHA (sdr, closer, cs, head_traffic) ───
  const passosDone = passos.filter(p => p.concluido).length
  const pct = passos.length > 0 ? Math.round((passosDone / passos.length) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/migracao" className="text-xs text-amber-400 hover:text-amber-300">← Migração</Link>
            <h1 className="text-white text-2xl md:text-3xl font-bold mt-1">
              Sua trilha — {role.toUpperCase().replace('_', ' ')}
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Olá, <strong className="text-white">{primeiroNome}</strong>. Cada passo te aproxima do HQ-only.
            </p>
          </div>

          {/* Score hero */}
          {score && (
            <div className={`mb-6 bg-gradient-to-br ${BG_SCORE(score.score)} border rounded-2xl p-5`}>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="text-[10px] uppercase text-gray-400 font-bold tracking-wider">Score HQ-only desta semana</div>
                  <div className="flex items-end gap-2 mt-1">
                    <div className={`text-5xl font-bold ${COR_SCORE(score.score)}`}>{score.score}</div>
                    <div className="text-gray-500 text-lg pb-2">/100</div>
                  </div>
                  <div className="text-sm mt-2 text-gray-300">{EMOJI_SCORE(score.score)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase font-bold">Passos</div>
                  <div className="text-white font-bold text-xl">{passosDone}/{passos.length}</div>
                  <div className="text-[10px] text-green-400 mt-2">✓ {score.dias_sem_externo} HQ-only</div>
                  <div className="text-[10px] text-red-400">✗ {score.dias_com_externo} externo</div>
                </div>
              </div>
              <div className="h-2 bg-gray-800/60 rounded-full overflow-hidden">
                <div className={`h-full transition-all ${score.score >= 80 ? 'bg-green-500' : score.score >= 60 ? 'bg-amber-500' : score.score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} style={{ width: `${score.score}%` }} />
              </div>
            </div>
          )}

          {/* Progresso geral */}
          <div className="mb-4 flex items-center justify-between text-xs">
            <span className="text-gray-400">Progresso da trilha</span>
            <span className="text-amber-400 font-bold">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-6">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all" style={{ width: `${pct}%` }} />
          </div>

          {/* Passos */}
          <div className="space-y-3">
            {passos.map((p, idx) => {
              const isAtual = !p.concluido && passos.slice(0, idx).every(x => x.concluido)
              return (
                <Link
                  key={p.key}
                  href={p.link}
                  className={`block rounded-xl border transition p-4 ${
                    p.concluido ? 'bg-green-500/5 border-green-500/30'
                    : isAtual ? 'bg-amber-500/10 border-amber-500/50 hover:border-amber-500'
                    : 'bg-gray-800/30 border-gray-700/50 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                      p.concluido ? 'bg-green-500 text-gray-950' : isAtual ? 'bg-amber-500 text-gray-950' : 'bg-gray-700 text-gray-400'
                    }`}>
                      {p.concluido ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${p.concluido ? 'text-green-400 line-through' : 'text-white'}`}>
                        {p.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.descricao}</div>
                      {p.progresso && (
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                            <span>{p.progresso.atual} / {p.progresso.meta} {p.progresso.unidade || ''}</span>
                            <span>{Math.min(100, Math.round((p.progresso.atual / p.progresso.meta) * 100))}%</span>
                          </div>
                          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (p.progresso.atual / p.progresso.meta) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-amber-400 text-xs shrink-0">→</span>
                  </div>
                </Link>
              )
            })}
          </div>

          {passos.length === 0 && (
            <div className="text-center py-12 text-gray-500 text-sm">
              Role "{role}" não tem trilha configurada. <Link href="/migracao" className="text-amber-400">Voltar</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
