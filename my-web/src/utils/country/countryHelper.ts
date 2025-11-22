// src/utils/countryHelper.ts
import { COUNTRY_CODES, type SelectOption } from './countryCodes'
import { COUNTRY_ALIASES } from './countryAliases'

// Globalny cache, aby budować mapy tylko raz na dany język
const CACHE = new Map<string, {
  all: SelectOption[],
  codeToInfo: Map<string, SelectOption>,
  nameOrCodeToCode: Map<string, string>
}>()

// Funkcja normalizująca
const normalize = (s: string) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')

/**
 * Główna funkcja budująca dane. Robi to, co stary helper, ale dynamicznie.
 */
function buildCountryData(locale: string = 'en') {
  // 1. Sprawdź cache
  if (CACHE.has(locale)) {
    return CACHE.get(locale)!
  }

  // 2. Użyj Intl do wygenerowania nazw w danym języku
  const regionNames = new Intl.DisplayNames([locale], { type: 'region' })
  const codeToInfo = new Map<string, SelectOption>()
  const nameOrCodeToCode = new Map<string, string>()
  const all: SelectOption[] = []

  // 3. Przejdź po wszystkich kodach i zbuduj mapy
  for (const code of COUNTRY_CODES) {
    const label = regionNames.of(code) || code
    const option: SelectOption = { value: code, label, code }

    all.push(option)
    codeToInfo.set(code, option)

    // Dodaj zlokalizowaną nazwę i kod do mapy wyszukiwania
    nameOrCodeToCode.set(normalize(label), code) // np. 'germany' -> 'DE' lub 'niemcy' -> 'DE'
    nameOrCodeToCode.set(code.toLowerCase(), code) // 'de' -> 'DE'
  }

  // 4. Dodaj nasze centralne aliasy do mapy wyszukiwania
  for (const [code, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (codeToInfo.has(code)) { // Upewnij się, że kraj istnieje
      aliases.forEach(alias => {
        nameOrCodeToCode.set(normalize(alias), code) // np. 'stany' -> 'US'
      })
    }
  }

  // 5. Posortuj finalną listę alfabetycznie wg zlokalizowanych nazw
  all.sort((a, b) => a.label.localeCompare(b.label, locale))

  // 6. Zapisz w cache i zwróć
  const data = { all, codeToInfo, nameOrCodeToCode }
  CACHE.set(locale, data)
  return data
}

// --- PUBLICZNE API (Twoje stare funkcje, teraz z obsługą 'locale') ---

/**
 * Zwraca pełną, posortowaną i zlokalizowaną listę krajów.
 */
export const getAllCountries = (locale: string = 'en'): SelectOption[] => {
  return buildCountryData(locale).all
}

/**
 * Zwraca pełne info o kraju na podstawie kodu ISO-2 (np. 'PL').
 */
export const getCountryInfoByCode = (code?: string | null, locale: string = 'en'): SelectOption | undefined => {
  if (!code) return undefined
  const { codeToInfo } = buildCountryData(locale)
  return codeToInfo.get(code.trim().toUpperCase())
}

/**
 * Zwraca pełne info o kraju na podstawie DOWOLNEJ nazwy, aliasu lub kodu.
 */
export const getCountryInfoByName = (nameOrCode?: string | null, locale: string = 'en'): SelectOption | undefined => {
  if (!nameOrCode) return undefined
  const { nameOrCodeToCode, codeToInfo } = buildCountryData(locale)

  const term = normalize(nameOrCode.trim())
  const isoCode = nameOrCodeToCode.get(term)

  return isoCode ? codeToInfo.get(isoCode) : undefined
}