'use client'

import { useState } from 'react'
import Sidebar from '../../components/Sidebar'

const SECTIONS = [
  { id: 'objetivo', label: 'Objetivo Central', icon: '🎯' },
  { id: 'arquitetura', label: 'Arquitetura', icon: '🏗️' },
  { id: 'operacao', label: 'Dupla Operacao', icon: '🔄' },
  { id: 'fonte1', label: 'Jornada D0-D90', icon: '📊' },
  { id: 'fonte2', label: 'Comercial + MKT', icon: '📊' },
  { id: 'fonte3', label: 'Extensao CRC', icon: '📊' },
  { id: 'inteligencia', label: 'IA + Eventos', icon: '🤖' },
  { id: 'estado', label: 'Estado Atual', icon: '📋' },
  { id: 'regras', label: 'Regras', icon: '🚫' },
  { id: 'prioridade', label: 'Prioridades', icon: '✅' },
  { id: 'papeis', label: 'Papeis', icon: '👥' },
]

export default function BasePage() {
  const [activeSection, setActiveSection] = useState('objetivo')

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-amber-500">⚔️</span> EXCALIBUR OS — Documento Base
            </h1>
            <p className="text-gray-400 text-sm mt-1">Fonte unica da verdade do projeto | v2.0 | 08/04/2026</p>
          </div>

          <div className="flex gap-6">
            {/* Nav lateral */}
            <nav className="w-48 shrink-0 sticky top-0">
              <div className="space-y-0.5">
                {SECTIONS.map((s) => (
                  <button key={s.id} onClick={() => setActiveSection(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition flex items-center gap-2 ${activeSection === s.id ? 'bg-amber-500/10 text-amber-400 font-medium' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                    <span>{s.icon}</span> {s.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Conteudo */}
            <div className="flex-1 space-y-6">

              {/* OBJETIVO */}
              <Section id="objetivo" active={activeSection} title="🎯 Objetivo Central">
                <P>Construir o Excalibur OS — sistema operacional completo para:</P>
                <Ul items={['Excalibur vender para clinicas (INTERNO)', 'Clinicas venderem para pacientes (EXTERNO)']} />
                <P className="mt-3">Usando 1 unica engine comercial:</P>
                <Ul items={['Extensao CRC (clone Aceler/WaSeller)', 'CRM integrado (HQ + APP)', 'BI + Automacoes + IA por cima']} />
              </Section>

              {/* ARQUITETURA */}
              <Section id="arquitetura" active={activeSection} title="🏗️ Arquitetura (Nao Mudar)">
                <Code>{`EXTENSAO = EXECUCAO (onde a venda acontece)
CRM      = ORGANIZACAO (onde os dados vivem)
BI + IA  = INTELIGENCIA (onde as decisoes sao tomadas)
N8N      = AUTOMACAO (onde as rotinas rodam)`}</Code>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <Card title="excalibur-hq" desc="Equipe interna Excalibur" />
                  <Card title="excalibur-app" desc="Clinicas clientes" />
                  <Card title="excalibur-ext" desc="Extensao Chrome (os dois usam)" />
                </div>
                <P className="mt-3">Stack: Next.js 16 + TS + Tailwind + shadcn dark amber + Supabase + Vercel + N8N + Claude API + Asaas</P>
              </Section>

              {/* DUPLA OPERACAO */}
              <Section id="operacao" active={activeSection} title="🔄 Dupla Operacao">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left py-2 px-3"></th><th className="text-left py-2 px-3">INTERNO</th><th className="text-left py-2 px-3">EXTERNO</th></tr></thead>
                  <tbody className="divide-y divide-gray-800">
                    {[
                      ['Quem usa', 'SDR + Closer', 'CRC + Recepcao + Orcamento'],
                      ['Lead e', 'Clinica', 'Paciente'],
                      ['Ticket', 'R$297-997/mes', 'R$500-50k'],
                      ['Funil', 'B2B', 'B2C'],
                      ['CRM', 'excalibur-hq', 'excalibur-app'],
                      ['Score', 'Faturamento+Urgencia+Decisao', 'Dor+Urgencia+Financeiro'],
                    ].map(([label, int, ext]) => (
                      <tr key={label} className="hover:bg-gray-800/30">
                        <td className="py-2 px-3 text-gray-400 font-medium">{label}</td>
                        <td className="py-2 px-3 text-white">{int}</td>
                        <td className="py-2 px-3 text-white">{ext}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>

              {/* FONTE 1 */}
              <Section id="fonte1" active={activeSection} title="📊 Fonte 1 — Jornada do Cliente (D0-D90)">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                    <p className="text-amber-400 font-bold text-xs mb-2">ONBOARDING (D0-D7)</p>
                    <Ul items={['D0: Pagamento + boas-vindas', 'D1-D2: Onboarding + acessos', 'D3-D5: Campanha configurada', 'D6-D7: Campanha ativa']} small />
                  </div>
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                    <p className="text-blue-400 font-bold text-xs mb-2">ADOCAO (D7-D30)</p>
                    <Ul items={['Leads chegando', 'Taxa resposta >= 85%', 'Health score D15', 'Classificacao D30']} small />
                  </div>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                    <p className="text-green-400 font-bold text-xs mb-2">ESCALA (D30-D90)</p>
                    <Ul items={['Estavel → Crescendo', 'NPS D30', 'Check-up D60', 'Indicacao D90']} small />
                  </div>
                </div>
                <Code>{`Health Score = adocao(40) + operacao(30) + resultado(30)
>=80 saudavel | 60-79 atencao | <60 risco`}</Code>
              </Section>

              {/* FONTE 2 */}
              <Section id="fonte2" active={activeSection} title="📊 Fonte 2 — Comercial + Marketing">
                <P>2 closers x 5 reunioes/dia = 10 reunioes/dia | 220/mes | Ticket R$2.000</P>
                <table className="w-full text-xs mt-3">
                  <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left py-2 px-3">Metrica</th><th className="text-center py-2 px-3">Meta</th><th className="text-center py-2 px-3">Verde</th><th className="text-center py-2 px-3">Amarelo</th><th className="text-center py-2 px-3">Vermelho</th></tr></thead>
                  <tbody className="divide-y divide-gray-800">
                    {[
                      ['CPL', 'R$10,68', '<=12', '13-15', '>15'],
                      ['Agendamento', '35,25%', '>=35%', '30-34%', '<30%'],
                      ['Comparecimento', '71,30%', '>=70%', '65-69%', '<65%'],
                      ['Qualificacao', '82,56%', '>=75%', '65-74%', '<65%'],
                      ['Conversao', '24,09%', '>=24%', '20-23%', '<20%'],
                      ['CAC', 'R$188,94', '<=200', '201-300', '>300'],
                    ].map(([m, meta, v, a, vm]) => (
                      <tr key={m}><td className="py-2 px-3 text-white font-medium">{m}</td><td className="py-2 px-3 text-center text-amber-400">{meta}</td><td className="py-2 px-3 text-center text-green-400">{v}</td><td className="py-2 px-3 text-center text-amber-400">{a}</td><td className="py-2 px-3 text-center text-red-400">{vm}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">Meta Minima</p><p className="text-white font-bold">R$74.000</p><p className="text-gray-500 text-[10px]">37 vendas | 153 reun</p></div>
                  <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">Meta Normal</p><p className="text-amber-400 font-bold">R$90.000</p><p className="text-gray-500 text-[10px]">45 vendas | 187 reun</p></div>
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">Super Meta</p><p className="text-green-400 font-bold">R$106.000</p><p className="text-gray-500 text-[10px]">53 vendas | 220 reun</p></div>
                </div>
              </Section>

              {/* FONTE 3 */}
              <Section id="fonte3" active={activeSection} title="📊 Fonte 3 — Extensao CRC">
                <P>89 respostas reais (WaSeller) | 15 categorias | Backup hierarquico</P>
                <div className="grid grid-cols-5 gap-2 mt-3">
                  {['SDR: B2B', 'CLOSER: B2B', 'CRC: B2C', 'RECEPCAO: B2C', 'ORCAMENTO: B2C'].map(r => (
                    <div key={r} className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-white text-xs font-medium">{r}</p></div>
                  ))}
                </div>
                <P className="mt-3">Fluxo: Selecionar → Variaveis → Confirmar → Delay digitacao → Registrar CRM</P>
              </Section>

              {/* INTELIGENCIA */}
              <Section id="inteligencia" active={activeSection} title="🤖 Camada de Inteligencia">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-amber-400 font-bold text-xs">Event System</p><p className="text-gray-300 text-[10px] mt-1">15 eventos tipados → reacoes em cadeia</p></div>
                  <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-amber-400 font-bold text-xs">Supervisor IA</p><p className="text-gray-300 text-[10px] mt-1">Claude API → resumo executivo diario</p></div>
                  <div className="bg-gray-800/50 rounded-xl p-3"><p className="text-amber-400 font-bold text-xs">Event Reactions</p><p className="text-gray-300 text-[10px] mt-1">8 cadeias automaticas ativas</p></div>
                </div>
              </Section>

              {/* ESTADO */}
              <Section id="estado" active={activeSection} title="📋 Estado Atual">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">Tabelas Supabase</p><p className="text-white font-bold text-lg">40+</p></div>
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">APIs criadas</p><p className="text-white font-bold text-lg">35+</p></div>
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">Workflows N8N</p><p className="text-white font-bold text-lg">6</p></div>
                  <div className="bg-gray-800/50 rounded-xl p-3 text-center"><p className="text-gray-500 text-[10px]">Linhas de codigo</p><p className="text-white font-bold text-lg">15k+</p></div>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-500 border-b border-gray-800"><th className="text-left py-2 px-3">Produto</th><th className="text-left py-2 px-3">URL</th><th className="text-left py-2 px-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-gray-800">
                    <tr><td className="py-2 px-3 text-white">excalibur-app</td><td className="py-2 px-3 text-amber-400">excalibur-web.vercel.app</td><td className="py-2 px-3 text-green-400">8 modulos</td></tr>
                    <tr><td className="py-2 px-3 text-white">excalibur-hq</td><td className="py-2 px-3 text-amber-400">excalibur-hq.vercel.app</td><td className="py-2 px-3 text-green-400">14 modulos</td></tr>
                    <tr><td className="py-2 px-3 text-white">excalibur-ext</td><td className="py-2 px-3 text-gray-400">GitHub</td><td className="py-2 px-3 text-amber-400">v2.0 em build</td></tr>
                  </tbody>
                </table>
              </Section>

              {/* REGRAS */}
              <Section id="regras" active={activeSection} title="🚫 Regras (Nao Negociaveis)">
                <div className="space-y-2">
                  {[
                    'NAO criar novo CRM do zero',
                    'NAO reinventar o Aceler/WaSeller',
                    'NAO mudar fluxo comercial validado',
                    'NAO complicar arquitetura',
                    'NAO implementar sem estar neste documento',
                    'NAO fugir do dark mode amber',
                    'NAO remover clinica_id de nenhuma query',
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-2"><span className="text-red-400 text-xs">✕</span><p className="text-white text-sm">{r}</p></div>
                  ))}
                </div>
              </Section>

              {/* PRIORIDADE */}
              <Section id="prioridade" active={activeSection} title="✅ Prioridades de Execucao">
                <div className="space-y-2">
                  {[
                    { p: 'P0', desc: 'Extensao CRC v2.0', status: 'em execucao' },
                    { p: 'P1', desc: 'SDR dashboard com IA + gamificacao', status: 'proximo' },
                    { p: 'P2', desc: 'Comercial + Trafego HQ (dados reais)', status: 'proximo' },
                    { p: 'P3', desc: 'Dominio excalibur.com.br', status: 'aguardando' },
                    { p: 'P4', desc: 'Asaas integracao real', status: 'aguardando' },
                    { p: 'P5', desc: '8 Agentes IA supervisionados', status: 'futuro' },
                  ].map((item) => (
                    <div key={item.p} className="flex items-center gap-3 bg-gray-800/50 rounded-lg p-3">
                      <span className="text-amber-500 font-bold text-sm w-8">{item.p}</span>
                      <p className="text-white text-sm flex-1">{item.desc}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded ${item.status === 'em execucao' ? 'bg-amber-500/20 text-amber-400' : item.status === 'proximo' ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-700 text-gray-500'}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* PAPEIS */}
              <Section id="papeis" active={activeSection} title="👥 Papeis">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { papel: 'CEO', nome: 'Matheus Cardoso', funcao: 'Visao + decisao' },
                    { papel: 'CTO', nome: 'Claude', funcao: 'Arquitetura + execucao' },
                    { papel: 'Dev', nome: 'Lucas', funcao: 'Implementacao' },
                    { papel: 'Consultor', nome: 'GPT', funcao: 'Validacao estrategica' },
                  ].map((p) => (
                    <div key={p.papel} className="bg-gray-800/50 rounded-xl p-3 text-center">
                      <p className="text-amber-400 font-bold text-xs">{p.papel}</p>
                      <p className="text-white text-sm font-medium mt-1">{p.nome}</p>
                      <p className="text-gray-500 text-[10px]">{p.funcao}</p>
                    </div>
                  ))}
                </div>
              </Section>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────
function Section({ id, active, title, children }: { id: string; active: string; title: string; children: React.ReactNode }) {
  if (active !== id) return null
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
      <h2 className="text-white font-bold text-lg mb-4">{title}</h2>
      {children}
    </div>
  )
}

function P({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-gray-300 text-sm leading-relaxed ${className}`}>{children}</p>
}

function Ul({ items, small = false }: { items: string[]; small?: boolean }) {
  return (<ul className="space-y-1 mt-1">{items.map((item, i) => (
    <li key={i} className={`flex items-start gap-2 ${small ? 'text-[10px]' : 'text-sm'} text-gray-300`}>
      <span className="text-amber-500 mt-0.5">•</span>{item}
    </li>
  ))}</ul>)
}

function Code({ children }: { children: string }) {
  return <pre className="bg-gray-800 rounded-xl p-4 text-xs text-gray-300 font-mono overflow-x-auto mt-2">{children}</pre>
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (<div className="bg-gray-800/50 border border-gray-700 rounded-xl p-3"><p className="text-amber-400 font-bold text-xs">{title}</p><p className="text-gray-400 text-[10px] mt-1">{desc}</p></div>)
}
