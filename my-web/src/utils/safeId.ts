// utils/safeId.ts
export function safeUUID(): string {
  // 1) Jeśli jest randomUUID – użyj
  // @ts-ignore
  const g: any = typeof globalThis !== 'undefined' ? globalThis : window;
  if (g?.crypto?.randomUUID) return g.crypto.randomUUID();

  // 2) Jeśli jest getRandomValues – wylosuj UUID v4
  try {
    const bytes: Uint8Array =
      g?.crypto?.getRandomValues?.(new Uint8Array(16)) ?? new Uint8Array(16).map(() => (Math.random() * 256) | 0);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // wersja 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // wariant
    const h = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  } catch {
    // 3) Ostateczny fallback
    return `r${Date.now().toString(36)}${Math.random().toString(36).slice(2,10)}`;
  }
}
