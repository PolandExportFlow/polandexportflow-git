// src/utils/number.ts
export function parseLocalizedNumber(input: unknown): number | null {
  if (input == null || input === '') return null
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  let s = String(input).trim().replace(/\s|\u00A0/g, '')
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.')
  if (c !== -1 && d !== -1) {
    const dec = c > d ? ',' : '.'
    const th = dec === ',' ? '.' : ','
    s = s.replace(new RegExp('\\' + th, 'g'), '').replace(dec, '.')
  } else if (c !== -1) s = s.replace(/,/g, '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
