# Git — Excalibur HQ

## Regras do projeto
- NUNCA commitar secrets (.env, tokens)
- NUNCA usar `--no-verify` (skip hooks)
- NUNCA force push em main sem autorização
- SEMPRE criar novo commit ao invés de amend
- Branch principal: `main`

## Workflow padrão
```bash
git add app/(hq)/sdr/page.tsx app/api/sdr/metricas/route.ts
git commit -m "feat(sdr): adicionar filtros de periodo"
git push
```

## Conventional commits
```
feat(escopo): nova funcionalidade
fix(escopo): correcao de bug
docs(escopo): mudanca em documentacao
refactor(escopo): refatoracao sem mudar comportamento
chore(escopo): tarefas de build/deps
ui(escopo): mudancas visuais
polish(escopo): pequenos ajustes UX
```

## Heredoc para mensagens longas
```bash
git commit -m "$(cat <<'EOF'
feat(sdr): adicionar filtros de periodo

- API suporta param 'periodo' (hoje/semana/mes/personalizado)
- UI com 4 botoes + date pickers
- Auto-recarrega ao trocar filtro

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"
```

## Reset seguro (sem perder trabalho)
```bash
git reset --soft HEAD~1   # desfaz último commit, mantém staged
git reset --mixed HEAD~1  # desfaz commit, unstage (default)
git reset --hard HEAD~1   # PERIGOSO — perde tudo
```

## Recuperar de push protection (secret detected)
```bash
# 1. Remove o secret do arquivo
# 2. Soft reset
git reset --soft HEAD~1
# 3. Re-stage e commit limpo
git add . && git commit -m "..."
git push
```

## .gitignore essencial
```
.env*
.next/
node_modules/
*.log
.vercel/
```
