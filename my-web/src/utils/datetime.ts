// utils/datetime.ts

/**
 * Parsuje string/datetime zawsze jako UTC (jeśli brak strefy).
 */
export function parseAsUTC(s: string | Date | null) {
  if (!s) return null
  if (s instanceof Date) return s

  const str = String(s).trim()
  // jeśli brak Z lub +hh:mm → traktujemy jako UTC
  const hasTZ = /([Zz]|[+\-]\d{2}:\d{2})$/.test(str)
  const iso = hasTZ ? str : str.replace(' ', 'T') + 'Z'

  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Formatuje datę do polskiego zapisu z godziną,
 * w wybranej strefie (domyślnie Europe/Warsaw).
 */
export function fmtDate(
  s: string | Date | null,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw'
) {
  const d = parseAsUTC(s)
  if (!d) return '—'

  return new Intl.DateTimeFormat('pl-PL', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(d)
}
