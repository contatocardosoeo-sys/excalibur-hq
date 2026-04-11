const r = await fetch('https://excalibur-hq.vercel.app/api/hq/alertas')
const d = await r.json()
console.log('total:', d.alertas?.length || 0)
;(d.alertas || []).forEach(a => console.log(' -', a.tipo, a.prioridade, '|', (a.descricao||'').slice(0,60)))
