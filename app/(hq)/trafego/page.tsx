'use client'

import { useEffect, useState } from 'react'
import Sidebar from '../../components/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { createClient } from '@supabase/supabase-js'
import {
  Megaphone,
  TrendingUp,
  DollarSign,
  Target,
  Users,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hluhlsnodndpskrkbjuw.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

interface KPIs {
  leads_hoje: number
  cpl_atual: number
  meta_cpl: number
  investimento_total: number
  roas: number
  custo_agendamento: number
}

interface LeadDia {
  data: string
  leads: number
}

interface Campanha {
  id: number
  nome: string
  canal: string
  leads: number
  cpl: number
  investimento: number
  status: string
}

interface Alerta {
  tipo: string
  mensagem: string
  severidade: string
}

const canalBadgeColor: Record<string, string> = {
  Meta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Google: 'bg-green-500/20 text-green-400 border-green-500/30',
  Organico: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Indicacao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Lista Fria': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const statusBadgeColor: Record<string, string> = {
  ativa: 'bg-green-500/20 text-green-400 border-green-500/30',
  pausada: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  encerrada: 'bg-red-500/20 text-red-400 border-red-500/30',
}

const severidadeColor: Record<string, string> = {
  danger: 'border-red-500/50 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
}

export default function TrafegoPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [leads14d, setLeads14d] = useState<LeadDia[]>([])
  const [campanhas, setCampanhas] = useState<Campanha[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/hq/trafego')
      const data = await res.json()
      setKpis(data.kpis)
      setLeads14d(data.leads_14d)
      setCampanhas(data.campanhas)
      setAlertas(data.alertas)
    } catch (err) {
      console.error('Erro ao carregar dados de tráfego:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()

    // Realtime on performance_diaria
    const perfChannel = supabase
      .channel('performance_diaria_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'performance_diaria' }, () => {
        fetchData()
      })
      .subscribe()

    // Realtime on campanhas_trafego
    const campChannel = supabase
      .channel('campanhas_trafego_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campanhas_trafego' }, () => {
        fetchData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(perfChannel)
      supabase.removeChannel(campChannel)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-950">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
        </main>
      </div>
    )
  }

  const cplProgress = kpis ? Math.min((kpis.meta_cpl / kpis.cpl_atual) * 100, 100) : 0

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-amber-500" />
              Tráfego & Campanhas
            </h1>
            <p className="text-gray-400 text-sm mt-1">Painel de performance de aquisição</p>
          </div>
          <Button
            onClick={fetchData}
            variant="outline"
            className="border-gray-700 text-gray-400 hover:text-white hover:border-amber-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* BLOCO 1: KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Leads Hoje</span>
                <Users className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">{kpis?.leads_hoje}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">CPL Atual</span>
                <Target className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">
                R${kpis?.cpl_atual.toFixed(2)}
              </p>
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Meta: R${kpis?.meta_cpl}</span>
                  <span className={kpis && kpis.cpl_atual <= kpis.meta_cpl ? 'text-green-400' : 'text-red-400'}>
                    {cplProgress.toFixed(0)}%
                  </span>
                </div>
                <Progress value={cplProgress} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Investimento</span>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">
                R${kpis?.investimento_total.toLocaleString('pt-BR')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">ROAS</span>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-green-400">{kpis?.roas}x</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Custo/Agend</span>
                <DollarSign className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">
                R${kpis?.custo_agendamento.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* BLOCO 2: Chart Leads 7 Dias */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Leads - Últimos 7 Dias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leads14d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="data"
                    stroke="#9ca3af"
                    fontSize={12}
                    tickFormatter={(value: string) => {
                      const d = new Date(value + 'T00:00:00')
                      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
                    }}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff',
                    }}
                    labelFormatter={(value) => {
                      const d = new Date(String(value) + 'T00:00:00')
                      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    }}
                  />
                  <Bar dataKey="leads" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* BLOCO 3: Campanhas Table */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Campanhas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Nome</TableHead>
                  <TableHead className="text-gray-400">Canal</TableHead>
                  <TableHead className="text-gray-400 text-right">Leads</TableHead>
                  <TableHead className="text-gray-400 text-right">CPL</TableHead>
                  <TableHead className="text-gray-400 text-right">Investimento</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campanhas.map((c) => (
                  <TableRow key={c.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="text-white font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={canalBadgeColor[c.canal] || 'bg-gray-500/20 text-gray-400'}
                      >
                        {c.canal}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-right">{c.leads}</TableCell>
                    <TableCell className="text-white text-right">
                      {c.cpl > 0 ? `R$${c.cpl.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {c.investimento > 0 ? `R$${c.investimento.toLocaleString('pt-BR')}` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusBadgeColor[c.status] || 'bg-gray-500/20 text-gray-400'}
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* BLOCO 4: Alertas */}
        {alertas.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertas de Tráfego
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {alertas.map((alerta, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${severidadeColor[alerta.severidade] || 'border-gray-700 text-gray-400'}`}
                >
                  <p className="text-sm">{alerta.mensagem}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
