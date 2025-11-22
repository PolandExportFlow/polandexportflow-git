type LogoType = 'carrier' | 'payment'

/**
 * Zwraca ścieżkę do logo przewoźnika lub metody płatności.
 * Bezpieczna – przy pustym lub błędnym kluczu zwraca undefined.
 */
export function getLogo(type: LogoType, key?: string): string | undefined {
  if (!key) return undefined

  const normalized = key.toLowerCase().trim()

  if (type === 'carrier') {
    const carrierMap: Record<string, string> = {
      dhl: '/img/carriers/dhlPEF.svg',
      ups: '/img/carriers/upsPEF.svg',
      upsstandard: '/img/carriers/upsPEF.svg',
      inpost: '/img/carriers/inpostPEF.svg',
      pocztapolska: '/img/carriers/pocztaPolskaPEF.svg',
      fedex: '/img/carriers/FedExPEF.svg',
      dpd: '/img/carriers/dpdPEF.svg',
      gls: '/img/carriers/glsPEF.svg',
      orlen: '/img/carriers/orlenPEF.svg',
    }
    return carrierMap[normalized]
  }

  if (type === 'payment') {
    const paymentMap: Record<string, string> = {
      paypal: '/img/paymentMethods/PayPal.svg',
      revolut: '/img/paymentMethods/Revolut.svg',
      visa: '/img/paymentMethods/Visa.svg',
      mastercard: '/img/paymentMethods/Mastercard.svg',
      blik: '/img/paymentMethods/Blik.svg',
      googlepay: '/img/paymentMethods/GooglePay.svg',
      applepay: '/img/paymentMethods/ApplePay.svg',
    }
    return paymentMap[normalized]
  }

  return undefined
}