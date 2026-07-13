// Extract a display message from an API error body. Internal endpoints return
// { error: string }; the /v0 surface returns { error: { code, message } } —
// components must accept both or real messages degrade to generic fallbacks.
export function apiError(body: unknown, fallback: string): string {
  const err = (body as { error?: unknown })?.error
  if (typeof err === 'string' && err) return err
  const msg = (err as { message?: unknown })?.message
  if (typeof msg === 'string' && msg) return msg
  return fallback
}
