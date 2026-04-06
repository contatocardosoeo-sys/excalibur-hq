'use client'

import { useState } from 'react'
import { supabase } from './lib/supabase'

export default function LoginHQ() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro(error.message)
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">⚔️ Excalibur HQ</h1>
          <p className="text-gray-400 text-sm">Backoffice — Acesso Interno</p>
        </div>

        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-5">
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block font-medium">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="equipe@excalibur.com" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 placeholder-gray-500 transition" />
          </div>
          <div>
            <label className="text-gray-400 text-xs mb-1.5 block font-medium">Senha</label>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••" required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 placeholder-gray-500 transition" />
          </div>

          {erro && <p className="text-red-400 text-xs bg-red-500/10 border border-red-700/40 rounded-lg px-3 py-2">{erro}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-gray-950 font-bold py-3 rounded-lg transition text-sm">
            {loading ? 'Entrando...' : 'Acessar HQ'}
          </button>
        </form>

        <p className="text-center text-gray-600 text-xs mt-6">Excalibur HQ v0.6.0 · Acesso restrito</p>
      </div>
    </div>
  )
}
