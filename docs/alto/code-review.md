# Code Review — Excalibur HQ

Checklist antes de qualquer commit/deploy.

## Build
- [ ] `npm run build` passa sem erros
- [ ] Sem warnings de TypeScript
- [ ] Sem console.log esquecidos
- [ ] Sem `any` no código novo

## Funcionalidade
- [ ] Faz EXATAMENTE o que foi pedido
- [ ] Não fez nada extra (nem otimização não pedida)
- [ ] Testou no browser pelo menos 1 vez
- [ ] Não quebrou nada que estava funcionando

## Padrões do projeto
- [ ] Segue paleta de cores (amber/dark)
- [ ] Usa Sidebar component existente
- [ ] APIs com service-role
- [ ] Erros tratados com `error.message`
- [ ] Loading state implementado

## Segurança
- [ ] Sem secrets no código
- [ ] Sem hardcoded tokens
- [ ] Validação de inputs (POST/PATCH)
- [ ] Rota protegida no middleware (se sensível)

## Banco
- [ ] Não dropou tabelas existentes
- [ ] Não deletou dados reais
- [ ] Migrations idempotentes (CREATE IF NOT EXISTS)

## Git
- [ ] Mensagem de commit clara (conventional)
- [ ] Stage só os arquivos necessários
- [ ] Não vai commitar .env, .next, node_modules

## Deploy
- [ ] Build local passou
- [ ] Push pro GitHub passou (sem secret detection)
- [ ] Deploy Vercel concluído (READY)
- [ ] Validou em produção

## Documentação
- [ ] Reportou ✅/❌ por item
- [ ] Mencionou arquivos modificados
- [ ] Avisou sobre side effects (se houver)

## Red flags — RECUSAR mudança
- ❌ Reescreveu tela aprovada sem autorização
- ❌ Mudou rota padrão sem pedir
- ❌ Implementou feature não pedida
- ❌ Deletou dados sem confirmar
- ❌ Commitou secret
