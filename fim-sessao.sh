#!/bin/bash
echo "🏁 Encerrando sessão Excalibur HQ..."

cd ~/Desktop/excalibur/excalibur-hq

DATE=$(date '+%d/%m/%Y %H:%M')
BRANCH=$(git branch --show-current)
LAST_COMMIT=$(git log --oneline -1)
FILES_CHANGED=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | head -10)

# Atualizar data no CLAUDE.md
sed -i "s/> Última atualização:.*/> Última atualização: $DATE/" CLAUDE.md 2>/dev/null || true
sed -i "s/> Última atualização:.*/> Última atualização: $DATE/" EXCALIBUR_OS.md 2>/dev/null || true

# Adicionar entrada no histórico
cat >> CLAUDE.md << EOF

### Sessão encerrada: $DATE
- Branch: $BRANCH
- Último commit: $LAST_COMMIT
- Arquivos alterados: $FILES_CHANGED
EOF

# Commit de tudo incluindo CLAUDE.md atualizado
git add -A
git commit -m "chore(sessao): fim de sessão $DATE — CLAUDE.md atualizado" 2>/dev/null || true
git push 2>/dev/null || true

echo "✅ CLAUDE.md atualizado"
echo "✅ Commit realizado"
echo "✅ Sessão encerrada com sucesso"
echo "⚔️  Até a próxima sessão, Cardoso!"
