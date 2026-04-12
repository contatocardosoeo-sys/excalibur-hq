// Rate limiter in-memory (sem Redis — bom pra Vercel serverless)
// Cada instância serverless tem seu próprio Map, mas como Vercel reutiliza
// instâncias por ~5min, o rate limit funciona pra maioria dos casos.

const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  limit: number = 30,
  windowMs: number = 60_000,
): { ok: boolean; remaining: number } {
  const now = Date.now()
  const entry = hits.get(key)

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1 }
  }

  entry.count++
  if (entry.count > limit) {
    return { ok: false, remaining: 0 }
  }

  return { ok: true, remaining: limit - entry.count }
}

// Helper pra usar nas APIs: retorna Response 429 se excedeu
export function checkRateLimit(
  identifier: string,
  limit?: number,
  windowMs?: number,
): Response | null {
  const result = rateLimit(identifier, limit, windowMs)
  if (!result.ok) {
    return new Response(
      JSON.stringify({ error: 'Muitas requisições. Tente novamente em breve.' }),
      { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': '60' } },
    )
  }
  return null
}
