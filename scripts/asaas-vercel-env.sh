#!/bin/bash
# Sobe ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN para o Vercel prod
# Lê os valores de .env.local

set -e

API_KEY=$(grep '^ASAAS_API_KEY=' .env.local | cut -d= -f2-)
TOKEN=$(grep '^ASAAS_WEBHOOK_TOKEN=' .env.local | cut -d= -f2-)

if [ -z "$API_KEY" ] || [ -z "$TOKEN" ]; then
  echo "ERRO: variáveis não encontradas em .env.local"
  exit 1
fi

echo "Adicionando ASAAS_API_KEY (length=${#API_KEY})..."
printf '%s\n' "$API_KEY" | npx vercel env add ASAAS_API_KEY production --token $VERCEL_TOKEN

echo "Adicionando ASAAS_WEBHOOK_TOKEN (length=${#TOKEN})..."
printf '%s\n' "$TOKEN" | npx vercel env add ASAAS_WEBHOOK_TOKEN production --token $VERCEL_TOKEN

echo "✅ Env vars adicionadas"
