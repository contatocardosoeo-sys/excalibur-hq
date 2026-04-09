#!/bin/bash
echo "⚔️ Salvando estado da sessão..."
cd ~/Desktop/excalibur/excalibur-hq
git add -A
TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
git commit -m "chore: fim de sessão — $TIMESTAMP"
git push
echo "✅ Estado salvo no GitHub com sucesso."
echo "📋 Próxima sessão: cole o EXCALIBUR_OS.md no chat antes de começar."
