import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((a, l) => {
  const i = l.indexOf('=')
  if (i > 0 && !l.startsWith('#')) a[l.slice(0, i).trim()] = l.slice(i + 1).trim()
  return a
}, {})

const API_KEY = env.ASAAS_API_KEY
const WEBHOOK_TOKEN = env.ASAAS_WEBHOOK_TOKEN

if (!API_KEY || !WEBHOOK_TOKEN) {
  console.error('Env vars faltando')
  process.exit(1)
}

// Verificar se já existe um webhook registrado
console.log('Listando webhooks existentes...')
const listaRes = await fetch('https://api.asaas.com/v3/webhooks', {
  headers: { access_token: API_KEY },
})
const lista = await listaRes.json()
console.log('Webhooks existentes:', JSON.stringify(lista, null, 2).slice(0, 500))

const url = 'https://excalibur-hq.vercel.app/api/webhooks/asaas'
const existente = (lista.data || []).find(w => w.url === url)

if (existente) {
  console.log(`✅ Webhook já existe: ${existente.id}`)
  console.log('   Name:', existente.name)
  console.log('   Status:', existente.enabled ? 'enabled' : 'disabled')
  console.log('   Events:', (existente.events || []).length)
  process.exit(0)
}

console.log('Criando novo webhook...')
const body = {
  name: 'Excalibur HQ',
  url,
  email: 'contato.cardosoeo@gmail.com',
  enabled: true,
  interrupted: false,
  apiVersion: 3,
  sendType: 'SEQUENTIALLY',
  authToken: WEBHOOK_TOKEN,
  events: [
    'PAYMENT_RECEIVED',
    'PAYMENT_CONFIRMED',
    'PAYMENT_OVERDUE',
    'PAYMENT_CREATED',
    'PAYMENT_DELETED',
    'PAYMENT_REFUNDED',
    'PAYMENT_UPDATED',
  ],
}

const res = await fetch('https://api.asaas.com/v3/webhooks', {
  method: 'POST',
  headers: {
    access_token: API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
})

const data = await res.json()
console.log('Status:', res.status)
console.log('Response:', JSON.stringify(data, null, 2))

if (res.ok) {
  console.log(`\n🎯 WEBHOOK CRIADO — ID: ${data.id}`)
} else {
  console.error('❌ Erro ao criar webhook')
  process.exit(1)
}
