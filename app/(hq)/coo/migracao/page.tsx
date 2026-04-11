'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'

type Colab = {
  email: string
  nome: string
  role: string
  score: number
  dias_sem_externo: number
  dias_com_externo: number
  passos_concluidos: number
  passos_total: number
  bonus: number
}

export default function CooMigracaoPage() {
  const [loading, setLoading] = useState(true)
  const [semana, setSemana] = useState('')
  const [colaboradores, setColaboradores] = useState<Colab[]>([])

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/migracao/score?todos=1').then(r => r.json())
        setSemana(r.semana)
        setColaboradores(r.colaboradores || [])
      } catch { /* */ }
      setLoading(false)
    })()
  }, [])

  const mediaScore = colaboradores.length > 0
    ? Math.round(colaboradores.reduce((s, c) => s + c.score, 0) / colaboradores.length)
    : 0

  const emRisco = colaboradores.filter(c => c.score < 50).length
  const saudaveis = colaboradores.filter(c => c.score >= 80).length
  const totalDiasExterno = colaboradores.reduce((s, c) => s + c.dias_com_externo, 0)

  return (
    <div className="min-h-screen bg-gray-950 flex overflow-x-hidden">
      <Sidebar />
      <div className="flex-1 p-4 md:p-6 overflow-auto min-w-0">
        <div className="mb-6">
          <Link href="/coo" className="text-xs text-amber-400 hover:text-amber-300">← COO</Link>
          <h1 className="text-white text-2xl md:text-3xl font-bold mt-1">⚔️ Adoção HQ-only — semana {semana}</h1>
          <p className="text-gray-400 text-sm mt-1">Painel da Luana · Monitoramento semanal do time · Nível <strong className="text-red-400">DURO</strong></p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">Carregando...</div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">Score médio</div>
                <div className={`text-2xl font-bold mt-1 ${mediaScore >= 70 ? 'text-green-400' : mediaScore >= 50 ? 'text-amber-400' : 'text-red-400'}`}>{mediaScore}</div>
                <div className="text-[10px] text-gray-600 mt-1">equipe toda</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">🟢 Saudáveis</div>
                <div className="text-2xl font-bold mt-1 text-green-400">{saudaveis}</div>
                <div className="text-[10px] text-gray-600 mt-1">score ≥ 80</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">🔴 Em risco</div>
                <div className="text-2xl font-bold mt-1 text-red-400">{emRisco}</div>
                <div className="text-[10px] text-gray-600 mt-1">score &lt; 50</div>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="text-[10px] uppercase text-gray-500 font-semibold">Desvios na semana</div>
                <div className="text-2xl font-bold mt-1 text-amber-400">{totalDiasExterno}</div>
                <div className="text-[10px] text-gray-600 mt-1">checkins com "usou fora"</div>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden mb-6">
              <div className="p-4 border-b border-gray-800">
                <h2 className="text-white font-bold text-sm">🏆 Ranking semanal</h2>
                <p className="text-[11px] text-gray-500 mt-0.5">Ordenado por score de adoção HQ-only</p>
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
                    </tr>
                  </thead>
                  <tbody>
                    {colaboradores.map((c, i) => {
                      const scoreCor = c.score >= 80 ? 'text-green-400' : c.score >= 50 ? 'text-amber-400' : 'text-red-400'
                      const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''
                      return (
                        <tr key={c.email} className="border-t border-gray-800 hover:bg-gray-800/30">
                          <td className="p-3 text-gray-500 font-mono">{i + 1}{medalha}</td>
                          <td className="p-3 text-white font-medium">{c.nome || c.email.split('@')[0]}</td>
                          <td className="p-3 text-gray-400 uppercase text-[10px]">{c.role}</td>
                          <td className="p-3 text-center">
                            <span className={`text-lg font-bold ${scoreCor}`}>{c.score}</span>
                          </td>
                          <td className="p-3 text-center text-green-400">{c.dias_sem_externo}</td>
                          <td className="p-3 text-center">{c.dias_com_externo > 0 ? <span className="text-red-400 font-bold">{c.dias_com_externo}</span> : <span className="text-gray-600">—</span>}</td>
                          <td className="p-3 text-center text-gray-300">{c.passos_concluidos}/{c.passos_total}</td>
                          <td className="p-3">
                            {c.score < 50 && (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-semibold border border-red-500/40">
                                🚨 1:1 segunda
                              </span>
                            )}
                            {c.score >= 50 && c.score < 80 && (
                              <span className="text-[10px] text-amber-400">⚠️ conversar</span>
                            )}
                            {c.score >= 80 && (
                              <span className="text-[10px] text-green-400">✅ OK</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {colaboradores.length === 0 && (
                      <tr><td colSpan={8} className="p-6 text-center text-gray-500">Sem dados ainda — equipe precisa começar a fazer checkin</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Regras em vigor */}
            <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-5">
              <h3 className="text-amber-400 font-bold text-sm mb-3 uppercase tracking-wider">📋 Regras vigentes (nível DURO — aprovado pelo Cardoso)</h3>
              <ul className="text-xs text-gray-300 space-y-2">
                <li>✓ <strong>Score &lt; 50</strong>: conversa 1:1 obrigatória com Luana na segunda-feira da próxima semana</li>
                <li>✓ <strong>Venda fora do Kanban</strong> (Guilherme): não conta pra comissão. Dinheiro que não passou pelo HQ não existe.</li>
                <li>✓ <strong>Lead fora do CRM</strong> (Trindade): não é atribuído como acúmulo da SDR. Cada lead precisa de registro.</li>
                <li>✓ <strong>Contato CS fora do sistema</strong> (Medina): não conta como health score. Registro no `/cs` é auditado.</li>
                <li>✓ <strong>Bônus +10 pts</strong>: 5 dias HQ-only consecutivos sem uso externo</li>
                <li>✓ <strong>Cardoso dá o exemplo</strong>: responde tudo no HQ pelos próximos 14 dias. Quem pergunta por WhatsApp recebe "manda no HQ".</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
