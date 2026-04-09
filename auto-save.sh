#!/bin/bash
echo "⚔️ Auto-save ativo — salva a cada 30min"
while true; do
  sleep 1800
  cd ~/Desktop/excalibur/excalibur-hq
  git add -A
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
  CHANGES=$(git diff --cached --name-only 2>/dev/null | wc -l)
  if [ "$CHANGES" -gt "0" ]; then
    git commit -m "auto-save: $TIMESTAMP"
    git push
    echo "✅ Auto-save: $TIMESTAMP"
  fi
done
