'use client'

import { useEffect, useState } from 'react'

interface AcaoHojeProps {
  role: 'sdr' | 'closer' | 'cs'
}

type Acao = {
  titulo: string
  descricao: string
  btnLabel: string
  href: string
} | null

export default function AcaoHoje({ role }: AcaoHojeProps) {
  const [acao, setAcao] = useState<Acao>(null)
  const [dispensado, setDispensado] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const hoje = new Date().toISOString().slice(0, 10)
    const key = `acao_hoje_${role}_${hoje}`
    if (sessionStorage.getItem(key) === 'dispensado') {
      setDispensado(true)
      return
    }

    ;(async () => {
      try {
        // Chamar /api/ceo/adocao-equipe que já sabe se executou hoje
        const r = await fetch('/api/ceo/adocao-equipe').then(r => r.json())
        const colaboradores = r.colaboradores || []
        const meu = colaboradores.find((c: { role: string }) => c.role === role)
        if (!meu) return
        if (meu.executou_hoje) return // Tudo ok, nao mostra

        if (role === 'sdr') {
          setAcao({
            titulo: 'Você ainda não lançou suas métricas hoje',
            descricao: 'Mantenha o Cardoso informado em tempo real. Leva menos de 1 minuto.',
            btnLabel: '→ Ir para métricas',
            href: '/sdr',
          })
        } else if (role === 'cs') {
          setAcao({
            titulo: 'Nenhum contato registrado hoje',
            descricao: 'Registre ao menos 1 contato com cliente pra manter o health score atualizado.',
            btnLabel: '→ Ver cockpit CS',
            href: '/cs',
          })
        } else if (role === 'closer') {
          setAcao({
            titulo: 'Kanban sem movimentação hoje',
            descricao: 'Leads parados = dados errados para o CEO. Atualize o pipeline agora.',
            btnLabel: '→ Abrir kanban',
            href: '/comercial',
          })
        }
      } catch { /* */ }
    })()
  }, [role])

  if (dispensado || !acao) return null

  const dispensar = () => {
    const hoje = new Date().toISOString().slice(0, 10)
    sessionStorage.setItem(`acao_hoje_${role}_${hoje}`, 'dispensado')
    setDispensado(true)
  }

  return (
    <div className="mx-4 md:mx-6 mb-4 p-4 rounded-xl border bg-amber-950/30 border-amber-500/40 flex items-start gap-4">
      <div className="text-2xl mt-0.5 shrink-0">⚡</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm text-amber-300 mb-1">{acao.titulo}</div>
        <div className="text-xs text-gray-400 mb-3">{acao.descricao}</div>
        <a
          href={acao.href}
          onClick={dispensar}
          className="inline-block text-xs font-bold px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-gray-950 transition min-h-[36px]"
        >
          {acao.btnLabel}
        </a>
      </div>
      <button
        onClick={dispensar}
        className="text-gray-600 hover:text-gray-400 text-sm px-1 shrink-0"
        title="Dispensar por hoje"
      >
        ✕
      </button>
    </div>
  )
}
