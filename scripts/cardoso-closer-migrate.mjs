import pg from 'pg'
const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

await c.connect()

// ══════════════════════════════════════════════════════════════
// 1. Adicionar 'closer' ao array roles do Cardoso (mantém admin)
// ══════════════════════════════════════════════════════════════
const upd = await c.query(`
  UPDATE usuarios_internos
  SET roles = CASE
    WHEN 'closer' = ANY(roles) THEN roles
    ELSE array_append(roles, 'closer')
  END
  WHERE email = 'contato.cardosoeo@gmail.com'
  RETURNING nome, email, role, roles
`)
console.log('✅ Cardoso atualizado:', upd.rows[0])

// ══════════════════════════════════════════════════════════════
// 2. metas_closer — mesmas metas do Guilherme (alvo R$90k)
// ══════════════════════════════════════════════════════════════
const metaCardoso = await c.query(`
  INSERT INTO metas_closer (closer_email, mes, ano, meta_reunioes, meta_fechamentos, meta_mrr, comissao_pct)
  VALUES ('contato.cardosoeo@gmail.com', 4, 2026, 188, 45, 90000, 0.05)
  ON CONFLICT DO NOTHING
  RETURNING closer_email, meta_reunioes, meta_fechamentos, meta_mrr
`)
console.log('✅ metas_closer Cardoso:', metaCardoso.rows[0] || 'já existia')

// Verificar os 2 closers
const closers = await c.query(`
  SELECT nome, email, roles FROM usuarios_internos
  WHERE 'closer' = ANY(roles) OR role='closer'
  ORDER BY nome
`)
console.log('\n📋 Closers ativos:')
closers.rows.forEach(r => console.log(' -', r.nome, r.email, r.roles))

const metas = await c.query(`
  SELECT closer_email, meta_reunioes, meta_fechamentos, meta_mrr
  FROM metas_closer WHERE mes=4 AND ano=2026
`)
console.log('\n📋 Metas closer abril/2026:')
metas.rows.forEach(r => console.log(' -', r.closer_email, r.meta_reunioes+'R', r.meta_fechamentos+'F', 'R$'+r.meta_mrr))

await c.end()
console.log('\n✅ Migration Cardoso closer concluída')
