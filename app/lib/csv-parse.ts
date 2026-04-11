// CSV/TSV parser simples — suporta ',' ';' '\t' e aspas duplas

export function parseCsv(text: string): string[][] {
  if (!text) return []

  // Detectar delimiter
  const firstLine = text.split('\n')[0] || ''
  const delimiter = firstLine.includes('\t') ? '\t'
    : (firstLine.match(/;/g)?.length || 0) > (firstLine.match(/,/g)?.length || 0) ? ';' : ','

  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { field += '"'; i++ }
      else if (ch === '"') { inQuotes = false }
      else field += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === delimiter) { row.push(field.trim()); field = '' }
      else if (ch === '\n') { row.push(field.trim()); rows.push(row); row = []; field = '' }
      else if (ch === '\r') { /* skip */ }
      else field += ch
    }
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row) }
  return rows.filter(r => r.length > 0 && r.some(c => c !== ''))
}

// Aceita também lista colada (uma linha por item sem delimiter)
export function parseSimples(text: string): string[] {
  return text.split('\n').map(l => l.trim()).filter(Boolean)
}
