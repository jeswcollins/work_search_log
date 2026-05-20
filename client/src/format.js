// Small UI formatters shared across pages.

export function prettyUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    let s = u.hostname.replace(/^www\./, '') + u.pathname;
    if (u.search) s += u.search;
    if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
    if (s.length > 64) s = s.slice(0, 61) + '…';
    return s;
  } catch {
    // Not a valid URL — show whatever the user typed.
    return url.length > 64 ? url.slice(0, 61) + '…' : url;
  }
}
