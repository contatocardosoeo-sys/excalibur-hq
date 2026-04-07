import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const kpis = {
      leads_fila: 12,
      atendidos_hoje: 28,
      taxa_agendamento: 62,
      tempo_medio_resposta: '4min',
    }

    const fila = [
      { id: 1, nome: 'Maria Silva', origem: 'Meta', tempo_fila: '2min', prioridade: 'alta', sdr: 'Ana Costa', status: 'aguardando' },
      { id: 2, nome: 'João Santos', origem: 'Google', tempo_fila: '5min', prioridade: 'media', sdr: null, status: 'aguardando' },
      { id: 3, nome: 'Carla Oliveira', origem: 'Organico', tempo_fila: '12min', prioridade: 'alta', sdr: 'Ana Costa', status: 'em_atendimento' },
      { id: 4, nome: 'Pedro Almeida', origem: 'Meta', tempo_fila: '25min', prioridade: 'media', sdr: null, status: 'aguardando' },
      { id: 5, nome: 'Fernanda Lima', origem: 'Indicacao', tempo_fila: '1h 15min', prioridade: 'baixa', sdr: 'Lucas Mendes', status: 'aguardando' },
      { id: 6, nome: 'Roberto Costa', origem: 'Google', tempo_fila: '45min', prioridade: 'alta', sdr: null, status: 'aguardando' },
      { id: 7, nome: 'Amanda Souza', origem: 'Lista Fria', tempo_fila: '3min', prioridade: 'baixa', sdr: 'Lucas Mendes', status: 'em_atendimento' },
      { id: 8, nome: 'Thiago Rocha', origem: 'Meta', tempo_fila: '1h 42min', prioridade: 'alta', sdr: null, status: 'aguardando' },
    ]

    const performance_sdrs = [
      {
        id: 1,
        nome: 'Ana Costa',
        leads_atendidos: 18,
        agendamentos: 12,
        taxa_agendamento: 67,
        tempo_medio: '3min',
        conversoes: 8,
        taxa_conversao: 44,
      },
      {
        id: 2,
        nome: 'Lucas Mendes',
        leads_atendidos: 10,
        agendamentos: 5,
        taxa_agendamento: 50,
        tempo_medio: '6min',
        conversoes: 3,
        taxa_conversao: 30,
      },
    ]

    // Auto-generated alertas
    const alertas: Array<{ tipo: string; mensagem: string; severidade: string }> = []

    const leadsAcima1h = fila.filter((l) => l.tempo_fila.includes('h'))
    if (leadsAcima1h.length > 0) {
      alertas.push({
        tipo: 'tempo_espera',
        mensagem: `${leadsAcima1h.length} lead(s) esperando há mais de 1 hora na fila`,
        severidade: 'danger',
      })
    }

    const leadsSemSdr = fila.filter((l) => !l.sdr)
    if (leadsSemSdr.length > 0) {
      alertas.push({
        tipo: 'sem_sdr',
        mensagem: `${leadsSemSdr.length} lead(s) sem SDR atribuído`,
        severidade: 'warning',
      })
    }

    if (kpis.leads_fila > 10) {
      alertas.push({
        tipo: 'fila_grande',
        mensagem: `Fila com ${kpis.leads_fila} leads — considere redistribuir`,
        severidade: 'warning',
      })
    }

    const sdrBaixaPerf = performance_sdrs.filter((s) => s.taxa_agendamento < 55)
    if (sdrBaixaPerf.length > 0) {
      alertas.push({
        tipo: 'performance_baixa',
        mensagem: `${sdrBaixaPerf.map((s) => s.nome).join(', ')} com taxa de agendamento abaixo de 55%`,
        severidade: 'info',
      })
    }

    return NextResponse.json({
      kpis,
      fila,
      performance_sdrs,
      alertas,
    })
  } catch (error) {
    console.error('Erro API SDR:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
