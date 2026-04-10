const https = require('https');
const { Client } = require('pg');

const DB = 'postgresql://postgres:Excalibur%402026%21DB@db.hluhlsnodndpskrkbjuw.supabase.co:5432/postgres';
const SHEET = '1kBuhI6W5l2-EkiT-v8rNL-2EGyw12_gMoq-d7l15dB0';

const ABAS = [
  { mes: 1, gid: '695712306' },
  { mes: 2, gid: '1780814657' },
  { mes: 3, gid: '464283661' },
  // Abril não tem aba detalhada ainda (a aba é um resumo anual)
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchCSV(aba) {
  let url;
  if (aba.gid) {
    url = `https://docs.google.com/spreadsheets/d/${SHEET}/export?format=csv&gid=${aba.gid}`;
  } else {
    url = `https://docs.google.com/spreadsheets/d/${SHEET}/export?format=csv&sheet=${encodeURIComponent(aba.sheet)}`;
  }
  return fetchUrl(url);
}

function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  const chars = text.split('');

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    if (c === '"') {
      if (inQuotes && chars[i+1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      rows.push(current); current = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (c === '\r' && chars[i+1] === '\n') i++;
      rows.push(current); current = '';
      // Mark end of row
      rows.push('__ROW_END__');
    } else {
      current += c;
    }
  }
  if (current) rows.push(current);

  // Split into actual rows
  const result = [];
  let currentRow = [];
  for (const cell of rows) {
    if (cell === '__ROW_END__') {
      if (currentRow.length > 0) result.push(currentRow);
      currentRow = [];
    } else {
      currentRow.push(cell);
    }
  }
  if (currentRow.length > 0) result.push(currentRow);
  return result;
}

function parseValor(s) {
  if (!s) return 0;
  s = s.replace(/R\$/g, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function parseData(s, mesRef, anoRef) {
  if (!s) return null;
  s = s.trim();
  const p = s.split('/');
  if (p.length < 2) return null;
  let [d, m, a] = p;
  if (!a || a.length === 0) a = String(anoRef);
  if (a.length === 2) a = '20' + a;
  d = d.padStart(2, '0');
  m = m.padStart(2, '0');
  try {
    const date = `${a}-${m}-${d}`;
    if (date.length !== 10) return null;
    // Validar data real
    const test = new Date(date + 'T12:00:00Z');
    if (isNaN(test.getTime())) return null;
    if (test.getUTCDate() !== parseInt(d)) return null; // Ex: 29/02 em ano não-bissexto
    return date;
  } catch { return null; }
}

function mapTipo(tipo) {
  if (!tipo) return 'outro';
  const t = tipo.toLowerCase().trim();
  if (t.includes('prolabore') || t.includes('pró-labore') || t.includes('pro-labore') || t.includes('pro labore')) return 'prolabore';
  if (t.includes('colaborador')) return 'colaborador';
  if (t.includes('ferramenta') || t.includes('software') || t.includes('tool')) return 'ferramenta';
  if (t.includes('marketing') || t.includes('trafego') || t.includes('tráfego') || t.includes('ads')) return 'marketing';
  if (t.includes('aluguel') || t.includes('sede') || t.includes('escritorio')) return 'aluguel';
  if (t.includes('variavel') || t.includes('variável') || t.includes('comiss')) return 'outro';
  return 'outro';
}

(async () => {
  const receberRows = [];
  const pagarRows = [];

  for (const aba of ABAS) {
    try {
      console.log(`Buscando mes ${aba.mes}...`);
      const raw = await fetchCSV(aba);
      const rows = parseCSV(raw);
      console.log(`  ${rows.length} linhas brutas`);

      let receberCount = 0;
      let pagarCount = 0;

      for (let i = 2; i < rows.length; i++) {
        const row = rows[i];

        // A Receber: col 1=Data, 2=Conta, 3=Servico, 4=Valor, 5=Pago?, 6=grupo
        if (row.length > 5) {
          const data = parseData(row[1], aba.mes, 2026);
          const cliente = (row[2] || '').trim();
          const plano = (row[3] || '').trim();
          const valor = parseValor(row[4]);
          const pagoStr = (row[5] || '').trim().toUpperCase();
          const pago = pagoStr === 'TRUE' || pagoStr === 'SIM' || pagoStr === 'PAGO';

          if (data && cliente.length > 2 && valor > 0) {
            // Determinar status
            let status = 'pendente';
            if (pago) status = 'pago';
            else {
              const venc = new Date(data + 'T12:00:00');
              if (venc < new Date()) status = 'atrasado';
            }
            receberRows.push({ data_vencimento: data, cliente_nome: cliente.substring(0, 200), plano: plano.substring(0, 100) || 'Outro', valor, status, data_pagamento: pago ? data : null, observacao: null });
            receberCount++;
          }
        }

        // A Pagar: col 8=Data, 9=Conta, 10=Valor, 11=Tipo, 12=Pago?
        if (row.length > 12) {
          const data2 = parseData(row[8], aba.mes, 2026);
          const desc = (row[9] || '').trim();
          const valor2 = parseValor(row[10]);
          const tipo = mapTipo(row[11]);
          const pagoStr2 = (row[12] || '').trim().toUpperCase();
          const pago2 = pagoStr2 === 'TRUE' || pagoStr2 === 'SIM' || pagoStr2 === 'PAGO';

          if (data2 && desc.length > 2 && valor2 > 0) {
            let status2 = 'pendente';
            if (pago2) status2 = 'pago';
            else {
              const venc2 = new Date(data2 + 'T12:00:00');
              if (venc2 < new Date()) status2 = 'atrasado';
            }
            pagarRows.push({ data_vencimento: data2, descricao: desc.substring(0, 200), tipo, valor: valor2, status: status2, data_pagamento: pago2 ? data2 : null, observacao: null });
            pagarCount++;
          }
        }
      }

      console.log(`  Mes ${aba.mes}: ${receberCount} receber, ${pagarCount} pagar`);
    } catch (e) {
      console.error(`Erro mes ${aba.mes}:`, e.message);
    }
  }

  console.log(`\nTotal: ${receberRows.length} receber, ${pagarRows.length} pagar`);

  // Inserir no banco
  const client = new Client({ connectionString: DB });
  await client.connect();

  await client.query('DELETE FROM financeiro_receber');
  await client.query('DELETE FROM financeiro_pagar');
  console.log('Tabelas limpas');

  for (const r of receberRows) {
    await client.query(
      'INSERT INTO financeiro_receber (data_vencimento, cliente_nome, plano, valor, status, data_pagamento, observacao) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [r.data_vencimento, r.cliente_nome, r.plano, r.valor, r.status, r.data_pagamento, r.observacao]
    );
  }
  console.log(`Inseridos ${receberRows.length} receber`);

  for (const p of pagarRows) {
    await client.query(
      'INSERT INTO financeiro_pagar (data_vencimento, descricao, tipo, valor, status, data_pagamento, observacao) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [p.data_vencimento, p.descricao, p.tipo, p.valor, p.status, p.data_pagamento, p.observacao]
    );
  }
  console.log(`Inseridos ${pagarRows.length} pagar`);

  // Verificar
  const r1 = await client.query("SELECT date_part('month', data_vencimento) as mes, COUNT(*) as qtd, SUM(valor) as total FROM financeiro_receber GROUP BY 1 ORDER BY 1");
  console.log('\n=== RECEBER POR MES ===');
  r1.rows.forEach(r => console.log(`  Mes ${r.mes}: ${r.qtd} registros, R$${Number(r.total).toFixed(2)}`));

  const r2 = await client.query("SELECT date_part('month', data_vencimento) as mes, COUNT(*) as qtd, SUM(valor) as total FROM financeiro_pagar GROUP BY 1 ORDER BY 1");
  console.log('\n=== PAGAR POR MES ===');
  r2.rows.forEach(r => console.log(`  Mes ${r.mes}: ${r.qtd} registros, R$${Number(r.total).toFixed(2)}`));

  await client.end();
  console.log('\n✅ Importacao concluida!');
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
