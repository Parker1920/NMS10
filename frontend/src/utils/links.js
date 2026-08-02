// Community links are free-text on submission — nothing validates them on the way
// in (see backend schemas.py: `link_url: Optional[str]`). People routinely paste
// "discord.gg/foo" or "www.example.com" with no scheme, and a bare value in an
// href is treated as a *relative* path, so the link lands on nms10.online/civs/...
// instead of the civ's site.
//
// Normalise at render time rather than backfilling the DB: it fixes every row we
// already have plus everything submitted from here on.

const SAFE_SCHEME = /^https?:\/\//i

export function normalizeCivLink(raw) {
  if (typeof raw !== 'string') return null
  const url = raw.trim()
  if (!url) return null

  // Anything carrying its own scheme is only allowed through if it's http(s).
  // Blocks javascript:/data:/vbscript: reaching an href — these strings are
  // user-submitted, and approval is a human eyeballing a name, not a URL audit.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return SAFE_SCHEME.test(url) ? url : null
  }

  // Protocol-relative ("//discord.gg/x") would inherit our scheme and work, but
  // it's indistinguishable from a typo'd path — treat it as a bare host.
  return 'https://' + url.replace(/^\/+/, '')
}
