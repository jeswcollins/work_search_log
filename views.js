'use strict';

/*
 * CSV serialization for weekly exports. The Phase 1-React server keeps
 * this server-side because the browser issues a plain GET so the file
 * downloads cleanly as an attachment.
 */

function entriesToCsv(entries) {
  const headers = [
    'date', 'type', 'employer_name', 'person', 'contact_method',
    'contact_info', 'type_of_work', 'results', 'link', 'description'
  ];
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const e of entries) {
    lines.push(headers.map(h => escape(e[h])).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

module.exports = { entriesToCsv };
