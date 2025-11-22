export function logSbError(scope: string, err: any) {
  const msg =
    err?.message ??
    err?.error?.message ??
    err?.data?.message ??
    err?._error?.message ??
    String(err);
  const details = err?.details ?? err?.hint ?? err?.code ?? '';
  // eslint-disable-next-line no-console
  console.error(`[SB] ${scope}:`, { message: msg, details, raw: err });
}
