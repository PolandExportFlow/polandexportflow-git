// src/components/lib/getTrackingLink.ts
export function getTrackingLink(carrierKeyOrName?: string, trackingCode?: string): string {
  const key = String(carrierKeyOrName || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  const code = (trackingCode || '').trim()
  if (!code) return ''

  const map: Record<string, (c: string) => string> = {
    dhl:   c => `https://www.dhl.com/pl-pl/home/sledzenie.html?tracking-id=${encodeURIComponent(c)}`,
    dpd:   c => `https://track.dpd.com/pl/pl/parcelstatus?query=${encodeURIComponent(c)}`,
    gls:   c => `https://gls-group.eu/PL/pl/sledzenie-przesylek?match=${encodeURIComponent(c)}`,
    ups:   c => `https://www.ups.com/track?loc=pl_PL&tracknum=${encodeURIComponent(c)}`,
    inpost:c => `https://inpost.pl/sledzenie-przesylek?number=${encodeURIComponent(c)}`,
    fedex: c => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(c)}`,
    pocztapolska: c => `https://emonitoring.poczta-polska.pl/?numer=${encodeURIComponent(c)}`,
  }

  const fn = map[key]
  if (fn) return fn(code)

  // fallback – spróbuj z samej nazwy (np. "FedEx")
  const byName = Object.entries(map).find(([k]) => (carrierKeyOrName || '').toLowerCase().includes(k))
  return byName ? byName[1](code) : ''
}

export default getTrackingLink
