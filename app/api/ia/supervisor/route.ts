import { NextResponse } from 'next/server'
import { rodarAgenteSupervisor } from '@/app/lib/agentes/supervisor'

export const maxDuration = 30

export async function GET() {
  try {
    const resultado = await rodarAgenteSupervisor()
    return NextResponse.json({ success: true, data: resultado })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ia/supervisor]', message)
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

export async function POST() {
  return GET()
}
