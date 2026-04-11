'use client'

import { useEffect, useState } from 'react'

type Resumo = {
  pagamentos: number
  valor_pago: number
  leads: number
  alertas: number
}

export default function ResumoDia() {
  const [r, setR] = useState<Resumo | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const [balance, alt] = await Promise.all([
          fetch('/api/asaas/balance').then(r => r.json()).catch(() => null),
          fetch('/api/hq/alertas').then(r => r.json()).catch(() => ({ alertas: [] })),
        ])

        // Pagamentos de hoje vêm de financeiro_receber via API
        const hojeStr = new Date().toISOString().slice(0, 10)
        let pagamentosHoje = 0
        let valorHoje = 0
        try {
          const fin = await fetch('/api/financeiro/receber').then(r => r.json())
          const items = Array.isArray(fin) ? fin : (fin.items || fin.receber || [])
          const pagos = items.filter((i: { data_pagamento?: string; status?: string }) =>
            i.status === 'pago' && i.data_pagamento?.slice(0, 10) === hojeStr
          )
          pagamentosHoje = pagos.length
          valorHoje = pagos.reduce((s: number, p: { valor_pago?: number; valor?: number }) => s + Number(p.valor_pago || p.valor || 0), 0)
        } catch { /* */ }

        // Leads lançados hoje (via métricas SDR)
        let leadsHoje = 0
        try {
          const sdr = await fetch('/api/sdr/metricas?periodo=hoje').then(r => r.json())
          leadsHoje = Number(sdr?.metricas_dia?.leads_recebidos || sdr?.acumulado?.leads || 0)
        } catch { /* */ }

        setR({
          pagamentos: pagamentosHoje,
          valor_pago: valorHoje,
          leads: leadsHoje,
          alertas: (alt.alertas || []).length,
        })
      } catch { /* */ }
    })()
  }, [])

  if (!r) return null

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const fmtR = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const partes: React.ReactNode[] = []
  partes.push(
    r.pagamentos > 0
      ? <span key="p" className="text-emerald-400">{r.pagamentos} pagamento{r.pagamentos > 1 ? 's' : ''} recebido{r.pagamentos > 1 ? 's' : ''} ({fmtR(r.valor_pago)})</span>
      : <span key="p">nenhum pagamento ainda</span>
  )
  partes.push(<span key="s1"> · </span>)
  partes.push(
    r.leads > 0
      ? <span key="l" className="text-blue-400">{r.leads} lead{r.leads > 1 ? 's' : ''} lançado{r.leads > 1 ? 's' : ''}</span>
      : <span key="l">0 leads lançados</span>
  )
  if (r.alertas > 0) {
    partes.push(<span key="s2"> · </span>)
    partes.push(<span key="a" className="text-red-400">{r.alertas} alerta{r.alertas > 1 ? 's' : ''} ativo{r.alertas > 1 ? 's' : ''}</span>)
  }

  return (
    <div className="mb-4 mx-4 md:mx-6 px-4 py-3 bg-gray-800/30 border border-gray-700/50 rounded-xl text-sm text-gray-400">
      <span className="text-gray-500">Hoje, {hoje}:</span>{' '}{partes}
    </div>
  )
}
