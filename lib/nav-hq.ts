// lib/nav-hq.ts — Navegacao excalibur-hq (Operacao Interna)

export type NavItem = { label: string; href: string; icon: string }
export type NavGroup = { grupo: string; items: NavItem[] }

export const NAV_HQ: NavGroup[] = [
  {
    grupo: 'Executivo',
    items: [
      { label: 'Dashboard CEO', href: '/dashboard', icon: '⚔️' },
      { label: 'CEO', href: '/ceo', icon: '👑' },
      { label: 'Observabilidade', href: '/observabilidade', icon: '👁️' },
      { label: 'Alertas', href: '/alertas', icon: '🚨' },
    ],
  },
  {
    grupo: 'Comercial B2B',
    items: [
      { label: 'Pipeline', href: '/pipeline', icon: '🎯' },
      { label: 'CRM WhatsApp', href: '/crm-whatsapp', icon: '💬' },
      { label: 'SDR', href: '/sdr', icon: '📞' },
      { label: 'Trafego', href: '/trafego', icon: '📣' },
      { label: 'Comercial', href: '/comercial', icon: '📊' },
    ],
  },
  {
    grupo: 'Customer Success',
    items: [
      { label: 'Clientes', href: '/clientes', icon: '🏥' },
      { label: 'CS', href: '/cs', icon: '❤️' },
      { label: 'Onboarding', href: '/onboarding', icon: '🚀' },
      { label: 'Jornada D0-D90', href: '/jornada', icon: '📅' },
    ],
  },
  {
    grupo: 'Financeiro',
    items: [
      { label: 'Financeiro', href: '/financeiro', icon: '💰' },
      { label: 'Planos', href: '/planos', icon: '📋' },
    ],
  },
  {
    grupo: 'IA',
    items: [
      { label: 'Supervisor IA', href: '/ia/supervisor', icon: '🧠' },
      { label: 'Event Reactions', href: '/ia/reactions', icon: '⚡' },
    ],
  },
  {
    grupo: 'Sistema',
    items: [
      { label: 'Automacoes', href: '/automacoes', icon: '⚙️' },
      { label: 'Base do Projeto', href: '/base', icon: '📚' },
    ],
  },
]
