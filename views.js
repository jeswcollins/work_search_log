'use strict';

/*
 * HTML template functions for the Phase 1 server. Each function returns
 * a plain string. Field vocabulary mirrors MA DUA Form 1750.
 */

const TYPES = [
  'Employer',
  'Career Fair',
  'Networking Event',
  'Workshop',
  'Career Counseling',
  'MassHire Service',
  'Application Submitted',
  'Other',
];

const CONTACT_METHODS = [
  'In Person',
  'Phone',
  'Email',
  'Website',
  'Mail',
  'Fax',
  'Other',
];

const RESULTS = [
  'Submitted',
  'Interview',
  'Pending',
  'No Response',
  'Not Hired',
  'Hired',
  'N/A',
];

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout({ title, body, weekStart }) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" type="text/css" href="/style.css">
</head>
<body>
  <nav class="topnav">
    <a href="/">Today</a>
    <a href="/week${weekStart ? '/' + weekStart : ''}">This week</a>
  </nav>
  ${body}
</body>
</html>`;
}

function dayView({ date, entries, weekStart, formDefault }) {
  return layout({
    title: `Work Search Log — ${date}`,
    weekStart,
    body: `
      <h2>Work Search Log</h2>
      <p class="muted">Logging for ${escapeHtml(date)}. Activities are kept locally on your machine.</p>

      <section class="card">
        <h3>Add an activity</h3>
        ${entryForm({ values: formDefault, action: '/entries', submitLabel: 'Add activity' })}
      </section>

      <section class="card">
        <h3>Today's entries (${entries.length})</h3>
        ${entriesTable(entries)}
      </section>
    `,
  });
}

function editView({ entry, weekStart }) {
  return layout({
    title: `Edit entry #${entry.id}`,
    weekStart,
    body: `
      <h2>Edit entry #${entry.id}</h2>
      <section class="card">
        ${entryForm({ values: entry, action: `/entries/${entry.id}`, submitLabel: 'Save changes' })}
        <form method="POST" action="/entries/${entry.id}/delete"
              onsubmit="return confirm('Delete this entry?');"
              class="delete-form">
          <button type="submit" class="danger">Delete entry</button>
        </form>
      </section>
    `,
  });
}

function entryForm({ values, action, submitLabel }) {
  const v = values || {};
  return `
    <form method="POST" action="${escapeHtml(action)}" class="entry-form">
      <label>Date
        <input type="date" name="date" value="${escapeHtml(v.date || '')}" required>
      </label>
      <label>Type
        ${select('type', v.type, TYPES)}
      </label>
      <label>Employer / Agency
        <input type="text" name="employer_name" value="${escapeHtml(v.employer_name)}" required>
      </label>
      <label>Person contacted
        <input type="text" name="person" value="${escapeHtml(v.person)}">
      </label>
      <label>Contact method
        ${select('contact_method', v.contact_method, CONTACT_METHODS)}
      </label>
      <label>Contact info <span class="hint">(phone, email, URL, address)</span>
        <input type="text" name="contact_info" value="${escapeHtml(v.contact_info)}">
      </label>
      <label>Type of work
        <input type="text" name="type_of_work" value="${escapeHtml(v.type_of_work)}">
      </label>
      <label>Results
        ${select('results', v.results, RESULTS)}
      </label>
      <label>Link <span class="hint">(optional)</span>
        <input type="url" name="link" value="${escapeHtml(v.link)}">
      </label>
      <label>Notes <span class="hint">(optional)</span>
        <textarea name="description" rows="2">${escapeHtml(v.description)}</textarea>
      </label>
      <button type="submit">${escapeHtml(submitLabel)}</button>
    </form>
  `;
}

function select(name, current, options) {
  const opts = ['<option value="">(none)</option>']
    .concat(options.map(o =>
      `<option value="${escapeHtml(o)}"${o === current ? ' selected' : ''}>${escapeHtml(o)}</option>`
    ))
    .join('');
  return `<select name="${name}">${opts}</select>`;
}

function entriesTable(entries) {
  if (!entries.length) {
    return '<p class="muted">No entries yet.</p>';
  }
  const rows = entries.map(e => `
    <tr${e.legacy ? ' class="legacy"' : ''}>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.type)}</td>
      <td>${escapeHtml(e.employer_name)}</td>
      <td>${escapeHtml(e.person)}</td>
      <td>${escapeHtml(e.contact_method)}</td>
      <td>${escapeHtml(e.contact_info)}</td>
      <td>${escapeHtml(e.type_of_work)}</td>
      <td>${escapeHtml(e.results)}</td>
      <td>${e.link ? `<a href="${escapeHtml(e.link)}" target="_blank" rel="noopener">link</a>` : ''}</td>
      <td><a href="/entries/${e.id}/edit">edit</a></td>
    </tr>
  `).join('');
  return `
    <table class="entries">
      <thead>
        <tr>
          <th>Date</th><th>Type</th><th>Employer</th><th>Person</th>
          <th>Method</th><th>Contact info</th><th>Type of work</th>
          <th>Results</th><th>Link</th><th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function weekView({ weekStart, weekEnd, entries, meta, requiredActivities, weekNav }) {
  const partialUi = !!(meta && meta.partial_ui);
  const expected = partialUi ? 0 : requiredActivities;
  const banner = partialUi
    ? '<p class="banner ok">Called back this week — 0 activities expected.</p>'
    : entries.length >= expected
      ? `<p class="banner ok">${entries.length} activities logged this week (need ${expected}).</p>`
      : `<p class="banner warn">${entries.length} of ${expected} activities logged this week.</p>`;

  return layout({
    title: `Week of ${weekStart}`,
    weekStart,
    body: `
      <h2>Work Search Log — week of ${escapeHtml(weekStart)} to ${escapeHtml(weekEnd)}</h2>

      <nav class="weeknav">
        <a href="/week/${weekNav.prev}">&larr; Previous week</a>
        <a href="/week">Current week</a>
        <a href="/week/${weekNav.next}">Next week &rarr;</a>
        <span class="spacer"></span>
        <a href="/week/${weekStart}.csv">Download CSV</a>
        <a href="javascript:window.print()">Print</a>
      </nav>

      ${banner}

      <form method="POST" action="/week/${weekStart}/meta" class="week-meta">
        <label>
          <input type="checkbox" name="partial_ui" value="1" ${partialUi ? 'checked' : ''}>
          Called back this week — work search not required
        </label>
        <label class="grow">Notes
          <input type="text" name="notes" value="${escapeHtml(meta && meta.notes || '')}">
        </label>
        <button type="submit">Save week settings</button>
      </form>

      <section class="card">
        <h3>Activities (${entries.length})</h3>
        ${entriesTable(entries)}
      </section>
    `,
  });
}

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

module.exports = {
  layout,
  dayView,
  editView,
  weekView,
  entriesTable,
  entriesToCsv,
  escapeHtml,
  TYPES,
  CONTACT_METHODS,
  RESULTS,
};
