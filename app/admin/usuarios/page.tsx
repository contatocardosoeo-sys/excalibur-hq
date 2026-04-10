'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import Sidebar from '../../components/Sidebar'

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
  ativo: boolean
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: '#a855f7',
  cs: '#3b82f6',
  sdr: '#f97316',
  closer: '#22c55e',
  trafego: '#eab308',
  financeiro: '#06b6d4',
}

const ROLES = ['admin', 'cs', 'sdr', 'closer', 'trafego', 'financeiro']

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', role: 'cs', senha: '1234' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  // Modal alterar senha
  const [senhaModal, setSenhaModal] = useState<Usuario | null>(null)
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/usuarios')
    const json = await res.json()
    setUsuarios(json.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: interno } = await supabase.from('usuarios_internos').select('role').eq('email', user.email).single()
        if (interno?.role === 'admin') {
          setIsAdmin(true)
          load()
        } else {
          window.location.href = '/ceo'
        }
      } else {
        window.location.href = '/'
      }
    })()
  }, [load])

  const criar = async () => {
    setSaving(true)
    setMsg('')
    const res = await fetch('/api/admin/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    if (json.success) {
      setMsg('Colaborador criado!')
      setShowModal(false)
      setForm({ nome: '', email: '', role: 'cs', senha: '1234' })
      load()
    } else {
      setMsg(`Erro: ${json.error}`)
    }
    setSaving(false)
  }

  const toggleAtivo = async (u: Usuario) => {
    await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, ativo: !u.ativo }),
    })
    load()
  }

  const alterarSenha = async () => {
    if (!senhaModal) return
    setMsg('')
    if (novaSenha.length < 6) { setMsg('Erro: Senha deve ter no minimo 6 caracteres'); return }
    if (novaSenha !== confirmaSenha) { setMsg('Erro: As senhas nao coincidem'); return }
    setSalvandoSenha(true)
    const res = await fetch('/api/admin/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: senhaModal.email, novaSenha }),
    })
    const json = await res.json()
    if (json.success) {
      setMsg(`Senha de ${senhaModal.nome} alterada com sucesso`)
      setSenhaModal(null); setNovaSenha(''); setConfirmaSenha('')
    } else {
      setMsg(`Erro: ${json.error || 'falha ao alterar senha'}`)
    }
    setSalvandoSenha(false)
  }

  if (!isAdmin) return null

  return (
    <div style={{ minHeight: '100vh', background: '#030712', display: 'flex' }}>
      <Sidebar />
      <div style={{ flex: 1, padding: '24px 32px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Colaboradores</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: '4px 0 0' }}>Gerencie usuarios internos da Excalibur</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 10, padding: '10px 20px', cursor: 'pointer' }}
          >
            + Novo Colaborador
          </button>
        </div>

        {msg && (
          <div style={{ background: msg.startsWith('Erro') ? '#ef444420' : '#22c55e20', border: `1px solid ${msg.startsWith('Erro') ? '#ef4444' : '#22c55e'}40`, borderRadius: 8, padding: '8px 14px', marginBottom: 16, color: msg.startsWith('Erro') ? '#ef4444' : '#22c55e', fontSize: 13 }}>
            {msg}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 24, marginBottom: 24 }}>
            <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Novo Colaborador</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Nome</label>
                <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Email</label>
                <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Senha inicial</label>
                <input value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })}
                  style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={criar} disabled={saving}
                style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', opacity: saving ? 0.5 : 1 }}>
                {saving ? 'Criando...' : 'Criar'}
              </button>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'transparent', color: '#6b7280', fontWeight: 500, fontSize: 13, border: '1px solid #374151', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: 40 }}>Carregando...</p>
        ) : (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['', 'Nome', 'Email', 'Role', 'Status', 'Criado em', 'Acao'].map(h => (
                    <th key={h} style={{ color: '#6b7280', fontSize: 11, fontWeight: 600, padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #1f2937', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1f293750' }}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${ROLE_COLORS[u.role] || '#6b7280'}20`, border: `1px solid ${ROLE_COLORS[u.role] || '#6b7280'}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: ROLE_COLORS[u.role] || '#6b7280', fontSize: 11, fontWeight: 700 }}>
                        {u.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 500 }}>{u.nome}</td>
                    <td style={{ padding: '10px 16px', color: '#9ca3af', fontSize: 13 }}>{u.email}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: `${ROLE_COLORS[u.role] || '#6b7280'}20`, color: ROLE_COLORS[u.role] || '#6b7280', border: `1px solid ${ROLE_COLORS[u.role] || '#6b7280'}40`, borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: u.ativo ? '#22c55e' : '#ef4444', display: 'inline-block', marginRight: 6 }} />
                      <span style={{ color: u.ativo ? '#22c55e' : '#ef4444', fontSize: 12 }}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setSenhaModal(u); setNovaSenha(''); setConfirmaSenha(''); setMsg('') }}
                          style={{ background: '#3b82f620', color: '#60a5fa', border: '1px solid #3b82f640', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                          🔑 Senha
                        </button>
                        <button onClick={() => toggleAtivo(u)}
                          style={{ background: u.ativo ? '#ef444420' : '#22c55e20', color: u.ativo ? '#ef4444' : '#22c55e', border: `1px solid ${u.ativo ? '#ef4444' : '#22c55e'}40`, borderRadius: 6, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                          {u.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal alterar senha */}
        {senhaModal && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setSenhaModal(null)}>
            <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 16, padding: 28, width: 440 }} onClick={e => e.stopPropagation()}>
              <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🔑 Alterar senha</h3>
              <p style={{ color: '#6b7280', fontSize: 12, marginBottom: 16 }}>{senhaModal.nome} · {senhaModal.email}</p>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Nova senha *</label>
                  <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Minimo 6 caracteres" autoFocus
                    style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
                </div>
                <div>
                  <label style={{ color: '#9ca3af', fontSize: 11, display: 'block', marginBottom: 4 }}>Confirme a nova senha *</label>
                  <input type="password" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} placeholder="Repita a senha"
                    style={{ width: '100%', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
                    onKeyDown={e => { if (e.key === 'Enter') alterarSenha() }} />
                </div>
                {novaSenha && confirmaSenha && novaSenha !== confirmaSenha && (
                  <div style={{ background: '#ef444420', border: '1px solid #ef444440', borderRadius: 8, padding: '8px 12px', color: '#ef4444', fontSize: 11 }}>
                    As senhas nao coincidem
                  </div>
                )}
                {novaSenha && novaSenha.length > 0 && novaSenha.length < 6 && (
                  <div style={{ background: '#f59e0b20', border: '1px solid #f59e0b40', borderRadius: 8, padding: '8px 12px', color: '#f59e0b', fontSize: 11 }}>
                    Senha muito curta — minimo 6 caracteres
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                <button onClick={alterarSenha} disabled={salvandoSenha || !novaSenha || novaSenha.length < 6 || novaSenha !== confirmaSenha}
                  style={{ background: '#f59e0b', color: '#030712', fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', opacity: (salvandoSenha || !novaSenha || novaSenha.length < 6 || novaSenha !== confirmaSenha) ? 0.4 : 1 }}>
                  {salvandoSenha ? 'Alterando...' : '✅ Confirmar'}
                </button>
                <button onClick={() => setSenhaModal(null)}
                  style={{ background: 'transparent', color: '#6b7280', border: '1px solid #374151', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', fontSize: 13 }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
