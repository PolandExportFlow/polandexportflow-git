import { NextResponse } from 'next/server'

export const runtime = 'nodejs' // stabilnie w Node

const WANTED = ['USD','EUR','GBP','CHF','JPY','AUD','CAD'] as const
type Wanted = typeof WANTED[number]
const UNITS: Record<string, number> = { JPY: 100, HUF: 100 }

export async function GET() {
  try {
    const r = await fetch('https://api.nbp.pl/api/exchangerates/tables/A?format=json', { cache: 'no-store' })
    if (!r.ok) {
      const preview = await r.text().catch(()=> '')
      return NextResponse.json({ error: 'NBP error', status: r.status, preview: preview.slice(0,160) }, { status: 502 })
    }
    const json = await r.json()
    const table = Array.isArray(json) ? json[0] : null
    if (!table?.rates) return NextResponse.json({ error: 'Invalid payload' }, { status: 502 })

    const map = new Map<string, number>()
    for (const it of table.rates as Array<{ code: string; mid: number }>) {
      if ((WANTED as readonly string[]).includes(it.code)) {
        const unit = UNITS[it.code] ?? 1
        map.set(it.code, it.mid / unit)
      }
    }

    const out: Record<string, number> = {}
    for (const c of WANTED) if (typeof map.get(c) === 'number') out[c] = map.get(c)!

    const res = NextResponse.json({
      base: 'PLN',
      updated: table.effectiveDate ?? new Date().toISOString().slice(0,10),
      rates: out,
    })
    res.headers.set('Cache-Control','s-maxage=600, stale-while-revalidate=3600')
    return res
  } catch (e: any) {
    return NextResponse.json({ error: 'Fetch failed', message: String(e?.message ?? e) }, { status: 500 })
  }
}
