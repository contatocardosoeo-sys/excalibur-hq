import { NextRequest, NextResponse } from 'next/server'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

// Walks app/api recursivamente e descobre todas as rotas dinamicamente
// Admin-only — lista + testa + mede latência
function walkApiDir(dir: string, base = ''): Array<{ rota: string; arquivo: string; metodos: string[] }> {
  const out: Array<{ rota: string; arquivo: string; metodos: string[] }> = []
  let entries: string[] = []
  try { entries = readdirSync(dir) } catch { return out }

  for (const entry of entries) {
    const full = join(dir, entry)
    let s
    try { s = statSync(full) } catch { continue }

    if (s.isDirectory()) {
      out.push(...walkApiDir(full, `${base}/${entry}`))
    } else if (entry === 'route.ts' || entry === 'route.tsx') {
      const content = readFileSync(full, 'utf8')
      const metodos: string[] = []
      if (/export\s+(async\s+)?function\s+GET\b/.test(content)) metodos.push('GET')
      if (/export\s+(async\s+)?function\s+POST\b/.test(content)) metodos.push('POST')
      if (/export\s+(async\s+)?function\s+PATCH\b/.test(content)) metodos.push('PATCH')
      if (/export\s+(async\s+)?function\s+DELETE\b/.test(content)) metodos.push('DELETE')
      if (/export\s+(async\s+)?function\s+PUT\b/.test(content)) metodos.push('PUT')
      out.push({
        rota: `/api${base}`,
        arquivo: full.replace(process.cwd(), '').replace(/\\/g, '/'),
        metodos,
      })
    }
  }
  return out
}

// Rotas que são seguras de testar via GET (sem efeito colateral)
const SEGURAS_PARA_PING = new Set([
  '/api/hq/alertas',
  '/api/ceo/dashboard',
  '/api/ceo/adocao-equipe',
  '/api/cs/painel',
  '/api/cs/cockpit',
  '/api/comercial/stats',
  '/api/comercial/pipeline',
  '/api/sdr/metricas',
  '/api/trafego/funil',
  '/api/trafego-clientes/overview',
  '/api/trafego-clientes/clinicas',
  '/api/trafego-clientes/gestores',
  '/api/trafego-clientes/setup',
  '/api/trafego-clientes/relatorio-semanal',
  '/api/jornada',
  '/api/clientes',
  '/api/escritorio/presenca',
  '/api/financeiro/resumo',
  '/api/financeiro/receber',
  '/api/financeiro/pagar',
  '/api/asaas/balance',
  '/api/migracao/score',
  '/api/notificacoes',
])

export async function GET(req: NextRequest) {
  const apiDir = join(process.cwd(), 'app', 'api')
  const lista = walkApiDir(apiDir).sort((a, b) => a.rota.localeCompare(b.rota))

  const origin = req.nextUrl.origin

  // Enriquecer com info de "segura pra ping"
  const comFlag = lista.map(r => ({
    ...r,
    segura_ping: SEGURAS_PARA_PING.has(r.rota),
    suporta_GET: r.metodos.includes('GET'),
  }))

  // Sumário
  const resumo = {
    total: comFlag.length,
    por_metodo: {
      GET: comFlag.filter(r => r.metodos.includes('GET')).length,
      POST: comFlag.filter(r => r.metodos.includes('POST')).length,
      PATCH: comFlag.filter(r => r.metodos.includes('PATCH')).length,
      DELETE: comFlag.filter(r => r.metodos.includes('DELETE')).length,
    },
    com_ping_seguro: comFlag.filter(r => r.segura_ping).length,
  }

  // Se ?ping=1, roda healthcheck em todas as rotas seguras em paralelo
  const fazerPing = req.nextUrl.searchParams.get('ping') === '1'
  if (fazerPing) {
    const pingResults = await Promise.all(
      comFlag
        .filter(r => r.segura_ping)
        .map(async r => {
          const t0 = Date.now()
          try {
            const resp = await fetch(`${origin}${r.rota}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
            const ms = Date.now() - t0
            let tamanho = 0
            try { tamanho = (await resp.text()).length } catch { /* */ }
            return { rota: r.rota, status: resp.status, ok: resp.ok, latencia_ms: ms, tamanho_bytes: tamanho }
          } catch (e) {
            return { rota: r.rota, status: 0, ok: false, latencia_ms: Date.now() - t0, erro: e instanceof Error ? e.message : String(e) }
          }
        })
    )
    return NextResponse.json({ resumo, lista: comFlag, ping: pingResults, ping_rodado_em: new Date().toISOString() })
  }

  return NextResponse.json({ resumo, lista: comFlag })
}
