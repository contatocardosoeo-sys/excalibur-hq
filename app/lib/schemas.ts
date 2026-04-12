import { z } from 'zod'

// ═══════════════════════════════════════════════════════════
// SCHEMAS DE VALIDAÇÃO — usar em APIs que recebem POST/PATCH
// Padrão: validar ANTES de qualquer query no banco
// ═══════════════════════════════════════════════════════════

export const comissaoCalcSchema = z.object({
  tipo: z.enum(['agendamento', 'comparecimento', 'venda']),
  ticket: z.number().positive().optional(),
  lead_nome: z.string().optional(),
  pipeline_card_id: z.string().uuid().optional(),
  data_evento: z.string().optional(),
})

export const propostaAjusteSchema = z.object({
  campo: z.string().min(1),
  valor_proposto: z.union([z.string(), z.number()]),
  justificativa: z.string().min(5),
  autor_email: z.string().email(),
  autor_nome: z.string().optional(),
  autor_role: z.string().optional(),
})

export const onboardingCompletarSchema = z.object({
  userEmail: z.string().email(),
  role: z.string().min(1),
  ferramentas: z.array(z.string()).optional(),
  ferramentas_outro: z.string().optional(),
  dificuldades: z.array(z.string()).optional(),
  expectativa: z.string().optional(),
})

export const indicacaoSchema = z.object({
  cs_email: z.string().email(),
  cs_nome: z.string().optional(),
  cliente_id: z.string().uuid().optional(),
  cliente_nome: z.string().min(1),
  indicado_nome: z.string().optional(),
  indicado_telefone: z.string().optional(),
  indicado_clinica: z.string().optional(),
  indicado_cidade: z.string().optional(),
})

export const feedbackRespostaSchema = z.object({
  pergunta_id: z.string().uuid(),
  user_email: z.string().email(),
  resposta: z.string().optional(),
  resposta_livre: z.string().optional(),
})

export const comportamentoEventoSchema = z.object({
  userEmail: z.string().min(1),
  tipo: z.string().min(1),
  userNome: z.string().optional(),
  role: z.string().optional(),
  pagina: z.string().optional(),
  elemento: z.string().optional(),
  acao: z.string().optional(),
  resultado: z.string().optional(),
  contexto: z.record(z.string(), z.unknown()).optional(),
  duracao_ms: z.number().optional(),
})

// Helper: validar body e retornar erro formatado
export function validate<T>(schema: z.ZodType<T>, data: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const result = schema.safeParse(data)
  if (!result.success) {
    const msg = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { ok: false, error: msg }
  }
  return { ok: true, data: result.data }
}
