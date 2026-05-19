'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { createApp, weekStartFor, weekEndFor } = require('../server');
const db = require('../db');

function fetchApi(server, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const headers = {};
    let payload;
    if (body !== undefined) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const ct = res.headers['content-type'] || '';
        const parsed = ct.includes('application/json') && raw ? JSON.parse(raw) : raw;
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function withServer(t) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wsl-test-'));
  const dbPath = path.join(tmpDir, 'test.db');
  const database = db.open(dbPath);
  const server = http.createServer(createApp({ database }));
  server.listen(0);
  t.after(() => {
    server.close();
    database.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
  return { server, database };
}

test('week boundaries: Sunday is week start', () => {
  assert.equal(weekStartFor('2026-05-19'), '2026-05-17');
  assert.equal(weekEndFor('2026-05-17'), '2026-05-23');
  assert.equal(weekStartFor('2026-05-17'), '2026-05-17');
  assert.equal(weekStartFor('2026-05-23'), '2026-05-17');
});

test('GET /api/today returns today and an entries array', async (t) => {
  const { server } = withServer(t);
  const res = await fetchApi(server, 'GET', '/api/today');
  assert.equal(res.status, 200);
  assert.ok(res.body.date);
  assert.deepEqual(res.body.entries, []);
});

test('POST /api/entries creates an entry and GET /api/today returns it', async (t) => {
  const { server } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const create = await fetchApi(server, 'POST', '/api/entries', {
    date: today,
    type: 'Employer',
    employer_name: 'Test Co',
    person: 'Jane',
    contact_method: 'Email',
    contact_info: 'jane@test.co',
    type_of_work: 'engineer',
    results: 'Submitted',
  });
  assert.equal(create.status, 201);
  assert.equal(create.body.employer_name, 'Test Co');

  const view = await fetchApi(server, 'GET', '/api/today');
  assert.equal(view.body.entries.length, 1);
  assert.equal(view.body.entries[0].employer_name, 'Test Co');
});

test('POST /api/entries rejects missing required fields', async (t) => {
  const { server } = withServer(t);
  const res = await fetchApi(server, 'POST', '/api/entries', { date: '', employer_name: '' });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /required/);
});

test('PUT /api/entries/:id updates and DELETE removes', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const id = db.insertEntry(database, { date: today, employer_name: 'OldCo' });

  const upd = await fetchApi(server, 'PUT', `/api/entries/${id}`, {
    date: today, employer_name: 'NewCo', person: 'Alice',
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.employer_name, 'NewCo');

  const del = await fetchApi(server, 'DELETE', `/api/entries/${id}`);
  assert.equal(del.status, 200);
  assert.equal(db.getEntry(database, id), undefined);
});

test('Week endpoint reports prev/next nav and meta', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const ws = weekStartFor(today);
  db.insertEntry(database, { date: today, employer_name: 'Wk' });

  const res = await fetchApi(server, 'GET', `/api/week/${ws}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.entries.length, 1);
  assert.ok(res.body.nav.prev);
  assert.ok(res.body.nav.next);
  assert.equal(res.body.meta, null);
});

test('POST /api/week/:start/meta sets partial_ui flag', async (t) => {
  const { server } = withServer(t);
  const ws = weekStartFor(new Date().toISOString().slice(0, 10));
  const res = await fetchApi(server, 'POST', `/api/week/${ws}/meta`, {
    partial_ui: true,
    notes: 'called back',
  });
  assert.equal(res.status, 200);
  assert.equal(res.body.partial_ui, 1);

  const week = await fetchApi(server, 'GET', `/api/week/${ws}`);
  assert.equal(week.body.meta.partial_ui, 1);
  assert.equal(week.body.meta.notes, 'called back');
});

test('CSV export returns headers and rows', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const ws = weekStartFor(today);
  db.insertEntry(database, { date: today, employer_name: 'CsvCo' });

  const res = await fetchApi(server, 'GET', `/api/week/${ws}.csv`);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.match(res.body, /^date,type,employer_name,person/);
  assert.match(res.body, /CsvCo/);
});

test('Dreams: created with is_dream, excluded from today/week, listed in /api/dreams', async (t) => {
  const { server } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);

  // Create a regular entry and a dream.
  await fetchApi(server, 'POST', '/api/entries', { date: today, employer_name: 'Real' });
  await fetchApi(server, 'POST', '/api/entries', { date: today, employer_name: 'Dreamy', is_dream: true });

  const todayView = await fetchApi(server, 'GET', '/api/today');
  assert.equal(todayView.body.entries.length, 1);
  assert.equal(todayView.body.entries[0].employer_name, 'Real');

  const dreams = await fetchApi(server, 'GET', '/api/dreams');
  assert.equal(dreams.body.dreams.length, 1);
  assert.equal(dreams.body.dreams[0].employer_name, 'Dreamy');
});

test('Promote a dream to a regular entry', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const id = db.insertEntry(database, { date: today, employer_name: 'WillPromote', is_dream: true });

  const res = await fetchApi(server, 'POST', `/api/entries/${id}/promote`, { date: today });
  assert.equal(res.status, 200);
  assert.equal(res.body.is_dream, 0);

  // Dream list should be empty; today's entries should now include it.
  const dreams = await fetchApi(server, 'GET', '/api/dreams');
  assert.equal(dreams.body.dreams.length, 0);
  const todayView = await fetchApi(server, 'GET', '/api/today');
  assert.equal(todayView.body.entries.length, 1);
});

test('Promoting a non-dream entry is a 404', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const id = db.insertEntry(database, { date: today, employer_name: 'NotADream' });
  const res = await fetchApi(server, 'POST', `/api/entries/${id}/promote`, { date: today });
  assert.equal(res.status, 404);
});

test('legacy HTML parser extracts rows', async () => {
  const { parseLegacyHtml } = require('../migrate');
  const html = `<table><tr><th>Job Title<th>Organization<th>Person<th>Contact Info<th>Description<th>Link<tr><td>scientist<td>Catalent<td>Emory's Dad<td>Boston, MA<td><td><a href=></a></table>`;
  const rows = parseLegacyHtml(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].employer_name, 'Catalent');
});

test('legacy HTML parser handles older 5-col format with checkbox', async () => {
  const { parseLegacyHtml } = require('../migrate');
  const html = `<table><tr><td>research physicist<td>exxon mobile<td>w/gary hunt<td><input type='checkbox' onclick='saveTable()'><td><a href=https://example.com/x>link</a></table>`;
  const rows = parseLegacyHtml(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type_of_work, 'research physicist');
  assert.equal(rows[0].link, 'https://example.com/x');
});
