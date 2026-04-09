#!/bin/bash
while true; do
  sleep 1800
  cd ~/Desktop/excalibur/excalibur-hq
  git add -A
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M')
  CHANGES=$(git diff --cached --name-only | head -5 | tr '\n' ', ')
  if [ -n "$CHANGES" ]; then
    git commit -m "auto-save: $TIMESTAMP — $CHANGES"
    git push
    echo "✅ Auto-save: $TIMESTAMP"
  fi
done
