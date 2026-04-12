// Script one-shot de ativação Meta Ads.
// USO:
//   node scripts/meta-ads-ativar.mjs "EAA_SEU_TOKEN_AQUI"
//
// Faz em sequência:
//   1. Testa o token direto contra Graph API (valida antes de salvar)
//   2. Salva no .env.local
//   3. Salva no Vercel production
//   4. Testa o endpoint GET /api/trafego/meta-sync em prod
//   5. Roda POST /api/trafego/meta-sync pra fazer o sync real
//   6. Mostra as campanhas retornadas
//
// Não faz deploy automático — só reporta. Pra aplicar em prod, rodar vercel --prod.

import { readFileSync, writeFileSync } from 'fs'
import { execSync } from 'child_process'

const token = process.argv[2]

if (!token || token.length < 50) {
  console.error('❌ USO: node scripts/meta-ads-ativar.mjs "EAA_SEU_TOKEN_AQUI"')
  console.error('')
  console.error('Esperado: um long-lived token do Meta (começa com EAA...)')
  process.exit(1)
}

// ═══════════════ 1. Validar token direto contra Graph API ═══════════════
console.log('\n📡 Passo 1/5: Validando token contra Graph API...')
const accountId = 'act_466752360576763'

try {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${accountId}?fields=name,account_status,currency,timezone_name&access_token=${token}`,
  )
  const data = await res.json()
  if (data.error) {
    console.error('❌ Token inválido ou sem acesso à conta:')
    console.error('   ', data.error.message)
    console.error('   Type:', data.error.type)
    console.error('   Code:', data.error.code)
    process.exit(1)
  }
  console.log('✅ Token válido. Conta:')
  console.log(`   Nome: ${data.name}`)
  console.log(`   Status: ${data.account_status === 1 ? 'ATIVA' : 'INATIVA ou PAUSADA (status=' + data.account_status + ')'}`)
  console.log(`   Moeda: ${data.currency}`)
  console.log(`   Fuso: ${data.timezone_name}`)
} catch (e) {
  console.error('❌ Erro ao chamar Graph API:', e.message)
  process.exit(1)
}

// ═══════════════ 2. Listar campanhas ═══════════════
console.log('\n📊 Passo 2/5: Listando campanhas...')
try {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${accountId}/campaigns?fields=id,name,status,objective&limit=20&access_token=${token}`,
  )
  const data = await res.json()
  if (data.error) {
    console.error('❌', data.error.message)
    process.exit(1)
  }
  const camps = data.data || []
  console.log(`✅ ${camps.length} campanhas encontradas:`)
  camps.forEach((c, i) => {
    console.log(`   ${i + 1}. [${c.status}] ${c.name} (${c.objective || '—'})`)
  })
  if (camps.length === 0) {
    console.log('   ⚠️  Nenhuma campanha — conta vazia ou sem permissão de leitura')
  }
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
}

// ═══════════════ 3. Salvar em .env.local ═══════════════
console.log('\n💾 Passo 3/5: Salvando token em .env.local...')
try {
  const envContent = readFileSync('.env.local', 'utf8')
  const novoConteudo = envContent.replace(
    /^META_ADS_ACCESS_TOKEN=.*$/m,
    `META_ADS_ACCESS_TOKEN=${token}`,
  )
  writeFileSync('.env.local', novoConteudo)
  console.log('✅ .env.local atualizado')
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
}

// ═══════════════ 4. Subir pro Vercel ═══════════════
console.log('\n☁️  Passo 4/5: Subindo para Vercel production...')
try {
  // Primeiro remove se existir (idempotente)
  try {
    execSync(
      `npx vercel env rm META_ADS_ACCESS_TOKEN production --yes --token $VERCEL_TOKEN`,
      { stdio: 'pipe' },
    )
  } catch { /* não existia */ }

  // Adiciona via stdin
  execSync(
    `printf '%s\\n' "${token}" | npx vercel env add META_ADS_ACCESS_TOKEN production --token $VERCEL_TOKEN`,
    { stdio: 'inherit', shell: true },
  )
  console.log('✅ Vercel env var configurada')
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
}

// ═══════════════ 5. Instrução final ═══════════════
console.log('\n🎯 Passo 5/5: Quase lá — agora faça:')
console.log('')
console.log('   1. Redeploy Vercel:')
console.log('      npx vercel --prod --token $VERCEL_TOKEN')
console.log('')
console.log('   2. Testar endpoint sync em prod (aguarde ~30s pro deploy):')
console.log('      curl "https://excalibur-hq.vercel.app/api/trafego/meta-sync"')
console.log('')
console.log('   3. Rodar sync real:')
console.log('      curl -X POST "https://excalibur-hq.vercel.app/api/trafego/meta-sync"')
console.log('')
console.log('⚔️  Integração Meta Ads pronta pra ativar!')
