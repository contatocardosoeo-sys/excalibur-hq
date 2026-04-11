import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const i = line.indexOf('=')
  if (i > 0 && !line.startsWith('#')) acc[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  return acc
}, {})

const key = env.ASAAS_API_KEY
const base = env.ASAAS_ENV === 'production' ? 'https://api.asaas.com' : 'https://sandbox.asaas.com/api'

console.log('Env:', env.ASAAS_ENV)
console.log('Base:', base)
console.log('Key length:', key?.length, 'starts:', key?.slice(0, 15) + '...')

const r = await fetch(`${base}/v3/finance/balance`, {
  headers: { access_token: key },
})

console.log('Status:', r.status)
const text = await r.text()
try {
  const d = JSON.parse(text)
  console.log('Response:', JSON.stringify(d, null, 2))
} catch {
  console.log('Raw:', text.slice(0, 500))
}
