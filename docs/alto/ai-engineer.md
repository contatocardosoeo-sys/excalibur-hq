# AI Engineer — Excalibur HQ

## Stack de IA no projeto
- Claude API (Anthropic SDK)
- Modelo: `claude-sonnet-4-20250514`
- Token: `ANTHROPIC_API_KEY` em .env.local

## Uso
```ts
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2048,
  messages: [{ role: 'user', content: 'pergunta' }],
})
```

## Padrões de prompt
- System prompt claro (papel + restrições)
- Few-shot examples quando necessário
- Output em JSON estruturado para parsing
- Temperatura baixa (0.2-0.4) para tarefas factuais

## Onde está usado
- `/api/ia/supervisor` — análise de dados + recomendação
- Extensão Chrome — análise de conversa WhatsApp

## Custo controlado
- Limit max_tokens
- Cache de respostas similares (Supabase)
- Não chamar em loop sem rate limit

## Prompt caching (Anthropic)
- Cache de system prompts longos
- Reduz custo em até 90%
- Cache vive 5min (TTL extendable)
