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
  Headphones,
  Users,
  Clock,
  CalendarCheck,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from 'lucide-react'

interface KPIs {
  leads_fila: number
  atendidos_hoje: number
  taxa_agendamento: number
  tempo_medio_resposta: string
}

interface LeadFila {
  id: number
  nome: string
  origem: string
  tempo_fila: string
  prioridade: string
  sdr: string | null
  status: string
}

interface SDRPerformance {
  id: number
  nome: string
  leads_atendidos: number
  agendamentos: number
  taxa_agendamento: number
  tempo_medio: string
  conversoes: number
  taxa_conversao: number
}

interface Alerta {
  tipo: string
  mensagem: string
  severidade: string
}

const origemBadgeColor: Record<string, string> = {
  Meta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Google: 'bg-green-500/20 text-green-400 border-green-500/30',
  Organico: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Indicacao: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Lista Fria': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const prioridadeBadgeColor: Record<string, string> = {
  alta: 'bg-red-500/20 text-red-400 border-red-500/30',
  media: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  baixa: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

const statusBadgeColor: Record<string, string> = {
  aguardando: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  em_atendimento: 'bg-green-500/20 text-green-400 border-green-500/30',
  finalizado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const severidadeColor: Record<string, string> = {
  danger: 'border-red-500/50 bg-red-500/10 text-red-400',
  warning: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  info: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
}

export default function SDRPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [fila, setFila] = useState<LeadFila[]>([])
  const [performanceSdrs, setPerformanceSdrs] = useState<SDRPerformance[]>([])
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const res = await fetch('/api/hq/sdr')
      const data = await res.json()
      setKpis(data.kpis)
      setFila(data.fila)
      setPerformanceSdrs(data.performance_sdrs)
      setAlertas(data.alertas)
    } catch (err) {
      console.error('Erro ao carregar dados SDR:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const isTempoAlerta = (tempo: string) => tempo.includes('h')

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

  return (
    <div className="flex h-screen bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Headphones className="h-6 w-6 text-amber-500" />
              SDR - Pré-Vendas
            </h1>
            <p className="text-gray-400 text-sm mt-1">Fila de atendimento e performance da equipe</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Leads na Fila</span>
                <Users className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">{kpis?.leads_fila}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Atendidos Hoje</span>
                <UserCheck className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">{kpis?.atendidos_hoje}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Taxa Agendamento</span>
                <CalendarCheck className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-green-400">{kpis?.taxa_agendamento}%</p>
              <div className="mt-2">
                <Progress value={kpis?.taxa_agendamento || 0} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">Tempo Médio Resposta</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-3xl font-bold text-white">{kpis?.tempo_medio_resposta}</p>
            </CardContent>
          </Card>
        </div>

        {/* BLOCO 2: Fila de Leads */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-500" />
              Fila de Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">Lead</TableHead>
                  <TableHead className="text-gray-400">Origem</TableHead>
                  <TableHead className="text-gray-400">Tempo</TableHead>
                  <TableHead className="text-gray-400">Prioridade</TableHead>
                  <TableHead className="text-gray-400">SDR</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fila.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className={`border-gray-800 hover:bg-gray-800/50 ${
                      isTempoAlerta(lead.tempo_fila) ? 'bg-red-500/5' : ''
                    }`}
                  >
                    <TableCell className="text-white font-medium">{lead.nome}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={origemBadgeColor[lead.origem] || 'bg-gray-500/20 text-gray-400'}
                      >
                        {lead.origem}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium ${
                          isTempoAlerta(lead.tempo_fila) ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        {lead.tempo_fila}
                        {isTempoAlerta(lead.tempo_fila) && (
                          <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-red-400" />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={prioridadeBadgeColor[lead.prioridade] || 'bg-gray-500/20 text-gray-400'}
                      >
                        {lead.prioridade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">
                      {lead.sdr || <span className="text-gray-500 italic">Sem SDR</span>}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusBadgeColor[lead.status] || 'bg-gray-500/20 text-gray-400'}
                      >
                        {lead.status === 'em_atendimento' ? 'Em atendimento' : lead.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* BLOCO 3: Performance SDR */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Headphones className="h-5 w-5 text-amber-500" />
              Performance SDR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-gray-800 hover:bg-transparent">
                  <TableHead className="text-gray-400">SDR</TableHead>
                  <TableHead className="text-gray-400 text-right">Atendidos</TableHead>
                  <TableHead className="text-gray-400 text-right">Agendamentos</TableHead>
                  <TableHead className="text-gray-400 text-right">Taxa Agend.</TableHead>
                  <TableHead className="text-gray-400 text-right">Tempo Médio</TableHead>
                  <TableHead className="text-gray-400 text-right">Conversões</TableHead>
                  <TableHead className="text-gray-400 text-right">Taxa Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceSdrs.map((sdr) => (
                  <TableRow key={sdr.id} className="border-gray-800 hover:bg-gray-800/50">
                    <TableCell className="text-white font-medium">{sdr.nome}</TableCell>
                    <TableCell className="text-white text-right">{sdr.leads_atendidos}</TableCell>
                    <TableCell className="text-white text-right">{sdr.agendamentos}</TableCell>
                    <TableCell className="text-right">
                      <span className={sdr.taxa_agendamento >= 60 ? 'text-green-400' : 'text-amber-400'}>
                        {sdr.taxa_agendamento}%
                      </span>
                    </TableCell>
                    <TableCell className="text-white text-right">{sdr.tempo_medio}</TableCell>
                    <TableCell className="text-white text-right">{sdr.conversoes}</TableCell>
                    <TableCell className="text-right">
                      <span className={sdr.taxa_conversao >= 40 ? 'text-green-400' : 'text-amber-400'}>
                        {sdr.taxa_conversao}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* BLOCO 4: Alertas SDR */}
        {alertas.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Alertas SDR
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
