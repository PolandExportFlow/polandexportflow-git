// utils/newRequestFormHelper.ts

/**
 * Konwertuje wartość na liczbę (float) lub undefined.
 * Używane do pól opcjonalnych (wymiary, waga).
 */
export function toNumOrUndefined(v: unknown): number | undefined {
    if (v === null || v === undefined) return undefined
    const s = String(v).trim()
    if (s === '') return undefined
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
}

/**
 * Konwertuje wartość na liczbę (float) lub zwraca 0.
 * Używane do obliczeń finansowych i sum.
 */
export function toNumOrZero(v: unknown): number {
    const n = toNumOrUndefined(v)
    return n ?? 0
}

/**
 * Konwertuje wartość na liczbę całkowitą >= 1 (ilość sztuk).
 * Obsługuje inputy typu string, number, null.
 */
export function toQty(v: unknown): number {
    const s = String(v ?? '').replace(/[^\d]/g, '')
    const n = s ? parseInt(s, 10) : 1
    return Math.max(1, Number.isFinite(n) ? n : 1)
}

/**
 * Zwraca string ilości (do input value).
 * TO BYŁA BRAKUJĄCA FUNKCJA
 */
export function toQtyString(v: unknown): string {
    return String(toQty(v))
}

/**
 * Sprawdza, czy wartość jest poprawną dodatnią kwotą pieniężną.
 * TO TEŻ BYŁA BRAKUJĄCA FUNKCJA
 */
export function hasPositiveValue(v: unknown): boolean {
    const n = toNumOrZero(v)
    return n > 0
}

/**
 * Sprawdza, czy ciąg znaków (np. nazwa produktu, link) jest niepusty.
 */
export function isNonEmptyString(v: unknown): boolean {
    if (!v) return false
    return String(v).trim().length > 0
}