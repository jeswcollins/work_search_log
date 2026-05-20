async function request(method, url, body) {
  const init = { method, headers: {} };
  if (body !== undefined) {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${url} → ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  today: () => request('GET', '/api/today'),
  getEntry: (id) => request('GET', `/api/entries/${id}`),
  createEntry: (fields) => request('POST', '/api/entries', fields),
  updateEntry: (id, fields) => request('PUT', `/api/entries/${id}`, fields),
  patchEntry: (id, patch) => request('PATCH', `/api/entries/${id}`, patch),
  deleteEntry: (id) => request('DELETE', `/api/entries/${id}`),
  promote: (id, date) => request('POST', `/api/entries/${id}/promote`, { date }),
  week: (start) => request('GET', `/api/week/${start}`),
  setWeekMeta: (start, meta) => request('POST', `/api/week/${start}/meta`, meta),
  jobs: () => request('GET', '/api/jobs'),
  network: () => request('GET', '/api/network'),
  link: (id, otherId) => request('POST', `/api/entries/${id}/links`, { other_id: otherId }),
  unlink: (id, otherId) => request('DELETE', `/api/entries/${id}/links/${otherId}`),
  csvUrl: (start) => `/api/week/${start}.csv`,
};
