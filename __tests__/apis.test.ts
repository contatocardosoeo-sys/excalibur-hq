import { describe, test, expect } from 'vitest'

const BASE = process.env.TEST_BASE_URL || 'https://excalibur-hq.vercel.app'

describe('APIs críticas — Excalibur HQ', () => {
  test('alertas retorna no máximo 7', async () => {
    const r = await fetch(`${BASE}/api/hq/alertas`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(Array.isArray(d.alertas)).toBe(true)
    expect(d.alertas.length).toBeLessThanOrEqual(7)
  })

  test('comercial stats tem dados reais (não zerado)', async () => {
    const r = await fetch(`${BASE}/api/comercial/stats`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.fechamentos).toBeGreaterThan(0)
    expect(d.mrr_gerado).toBeGreaterThan(0)
  })

  test('comercial pipeline retorna kpis válidos', async () => {
    const r = await fetch(`${BASE}/api/comercial/pipeline`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.kpis).toBeDefined()
    expect(d.kpis.fechamentos).toBeGreaterThan(0)
  })

  test('cs painel retorna score positivo', async () => {
    const r = await fetch(`${BASE}/api/cs/painel`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.kpis?.total_ativos).toBeGreaterThan(0)
    expect(d.kpis?.score_medio).toBeGreaterThan(10)
  })

  test('sdr metricas retorna acumulado do mês', async () => {
    const r = await fetch(`${BASE}/api/sdr/metricas?periodo=mes`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.metas).toBeDefined()
    expect(d.acumulado).toBeDefined()
  })

  test('trafego-clientes overview responde 200', async () => {
    const r = await fetch(`${BASE}/api/trafego-clientes/overview`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.kpis).toBeDefined()
    expect(d.kpis.totalClinicas).toBe(48)
  })

  test('trafego-clientes clinicas responde 200', async () => {
    const r = await fetch(`${BASE}/api/trafego-clientes/clinicas`)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(Array.isArray(d.clinicas)).toBe(true)
    expect(d.clinicas.length).toBeGreaterThan(0)
  })

  test('escritorio presenca API responde 200', async () => {
    const r = await fetch(`${BASE}/api/escritorio/presenca`)
    expect(r.status).toBe(200)
  })
})
