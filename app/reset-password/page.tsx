'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [nome, setNome] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessaoOK, setSessaoOK] = useState(false)
  const [destino, setDestino] = useState('/ceo')

  useEffect(() => {
    ;(async () => {
      // Precisa estar logada pra resetar a senha
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        window.location.href = '/'
        return
      }
      setEmail(session.user.email || '')
      setSessaoOK(true)

      // Buscar dados do colaborador pra saber destino pós-reset
      const { data: interno } = await supabase
        .from('usuarios_internos')
        .select('nome, role, roles')
        .eq('email', session.user.email)
        .single()
      if (interno) {
        setNome(interno.nome || '')
        const roles: string[] = (interno.roles && interno.roles.length > 0) ? interno.roles : [interno.role || 'cs']
        const primary = roles[0]
        const destinoMap: Record<string, string> = {
          admin: '/ceo', coo: '/coo', cs: '/cs', sdr: '/sdr',
          closer: '/comercial', cmo: '/trafego', financeiro: '/financeiro',
        }
        setDestino(destinoMap[primary] || '/ceo')
      }
    })()
  }, [])

  const salvarNovaSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 8) {
      setErro('Sua senha precisa ter pelo menos 8 caracteres')
      return
    }
    if (novaSenha !== confirmaSenha) {
      setErro('As senhas não coincidem')
      return
    }
    if (novaSenha === 'Senhareset1') {
      setErro('Escolha uma senha diferente da padrão temporária')
      return
    }

    setLoading(true)

    // 1) Atualizar senha no Supabase Auth
    const { error: authErr } = await supabase.auth.updateUser({ password: novaSenha })
    if (authErr) {
      setErro('Erro ao salvar senha: ' + authErr.message)
      setLoading(false)
      return
    }

    // 2) Limpar flag must_reset_password via API admin
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, must_reset_password: false }),
    })
    if (!res.ok) {
      // Mesmo se falhar, a senha foi trocada. Continua.
      console.warn('Flag must_reset_password nao foi limpa, mas senha foi trocada')
    }

    // 3) Redirecionar pra dashboard do role
    setTimeout(() => { window.location.href = destino }, 400)
  }

  if (!sessaoOK) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Verificando sessão...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚔️ Excalibur HQ</h1>
          <p className="text-amber-400 text-sm font-medium">Redefina sua senha</p>
        </div>

        <form onSubmit={salvarNovaSenha} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm">
            <p className="text-amber-400 font-semibold mb-1">Olá{nome ? `, ${nome.split(' ')[0]}` : ''}! 👋</p>
            <p className="text-gray-300 text-xs leading-relaxed">
              Por segurança, você precisa criar uma nova senha pessoal. A senha padrão
              temporária não funcionará mais depois disso.
            </p>
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1.5 block font-medium">Seu email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-3 text-gray-400 text-sm"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1.5 block font-medium">Nova senha</label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              required
              autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 placeholder-gray-500 transition"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs mb-1.5 block font-medium">Confirme a nova senha</label>
            <input
              type="password"
              value={confirmaSenha}
              onChange={(e) => setConfirmaSenha(e.target.value)}
              placeholder="Digite a senha novamente"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 placeholder-gray-500 transition"
            />
          </div>

          {erro && (
            <p className="text-red-400 text-xs bg-red-500/10 border border-red-700/40 rounded-lg px-3 py-2">
              {erro}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !novaSenha || !confirmaSenha}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-bold py-3 rounded-lg transition text-sm"
          >
            {loading ? 'Salvando...' : '🔒 Salvar nova senha'}
          </button>

          <p className="text-center text-gray-600 text-[10px] mt-2">
            Dica: use uma senha com letras, números e símbolos
          </p>
        </form>
      </div>
    </div>
  )
}
