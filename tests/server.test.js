'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const { createApp, weekStartFor, weekEndFor } = require('../server');
const db = require('../db');

function fetchJson(server, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const headers = {};
    let payload;
    if (body) {
      payload = typeof body === 'string' ? body : new URLSearchParams(body).toString();
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    const req = http.request({ hostname: '127.0.0.1', port, path: urlPath, method, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: Buffer.concat(chunks).toString('utf8'),
      }));
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
  // 2026-05-19 is a Tuesday; week starts Sunday 2026-05-17.
  assert.equal(weekStartFor('2026-05-19'), '2026-05-17');
  assert.equal(weekEndFor('2026-05-17'), '2026-05-23');
  // Boundary: Sunday itself maps to itself.
  assert.equal(weekStartFor('2026-05-17'), '2026-05-17');
  // Boundary: Saturday is end of its own week.
  assert.equal(weekStartFor('2026-05-23'), '2026-05-17');
});

test('GET / renders the day view with the form', async (t) => {
  const { server } = withServer(t);
  const res = await fetchJson(server, 'GET', '/');
  assert.equal(res.status, 200);
  assert.match(res.body, /Work Search Log/);
  assert.match(res.body, /Add an activity/);
  assert.match(res.body, /name="employer_name"/);
});

test('POST /entries creates a row visible on /', async (t) => {
  const { server } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const create = await fetchJson(server, 'POST', '/entries', {
    date: today,
    type: 'Employer',
    employer_name: 'Test Co',
    person: 'Jane',
    contact_method: 'Email',
    contact_info: 'jane@test.co',
    type_of_work: 'engineer',
    results: 'Submitted',
    link: 'https://test.co/jobs/1',
    description: '',
  });
  assert.equal(create.status, 303);
  assert.equal(create.headers.location, '/');

  const view = await fetchJson(server, 'GET', '/');
  assert.match(view.body, /Test Co/);
  assert.match(view.body, /jane@test\.co/);
});

test('POST /entries rejects missing required fields', async (t) => {
  const { server } = withServer(t);
  const res = await fetchJson(server, 'POST', '/entries', { date: '', employer_name: '' });
  assert.equal(res.status, 400);
});

test('edit + delete round trip', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const id = db.insertEntry(database, {
    date: today, employer_name: 'OldCo', person: 'Bob',
  });

  const editPage = await fetchJson(server, 'GET', `/entries/${id}/edit`);
  assert.equal(editPage.status, 200);
  assert.match(editPage.body, /OldCo/);

  const upd = await fetchJson(server, 'POST', `/entries/${id}`, {
    date: today, employer_name: 'NewCo', person: 'Alice',
  });
  assert.equal(upd.status, 303);
  assert.equal(db.getEntry(database, id).employer_name, 'NewCo');

  const del = await fetchJson(server, 'POST', `/entries/${id}/delete`);
  assert.equal(del.status, 303);
  assert.equal(db.getEntry(database, id), undefined);
});

test('week view shows banner reflecting partial-UI flag', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const ws = weekStartFor(today);

  // Empty week → warn banner.
  let res = await fetchJson(server, 'GET', `/week/${ws}`);
  assert.equal(res.status, 200);
  assert.match(res.body, /0 of 3/);
  assert.match(res.body, /banner warn/);

  // Flip partial-UI; banner should change.
  res = await fetchJson(server, 'POST', `/week/${ws}/meta`, { partial_ui: '1' });
  assert.equal(res.status, 303);

  res = await fetchJson(server, 'GET', `/week/${ws}`);
  assert.match(res.body, /Called back this week/);
  assert.match(res.body, /banner ok/);
});

test('CSV export returns expected headers', async (t) => {
  const { server, database } = withServer(t);
  const today = new Date().toISOString().slice(0, 10);
  const ws = weekStartFor(today);
  db.insertEntry(database, { date: today, employer_name: 'CsvCo', person: 'X' });

  const res = await fetchJson(server, 'GET', `/week/${ws}.csv`);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.match(res.body, /^date,type,employer_name,person/);
  assert.match(res.body, /CsvCo/);
});

test('legacy HTML parser extracts rows', async () => {
  const { parseLegacyHtml } = require('../migrate');
  const html = `<table><tr><th>Job Title<th>Organization<th>Person<th>Contact Info<th>Description<th>Link<tr><td>scientist<td>Catalent<td>Emory's Dad<td>Boston, MA<td><td><a href=></a></table>`;
  const rows = parseLegacyHtml(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].employer_name, 'Catalent');
  assert.equal(rows[0].person, "Emory's Dad");
  assert.equal(rows[0].type_of_work, 'scientist');
  assert.equal(rows[0].contact_info, 'Boston, MA');
});

test('legacy HTML parser handles older 5-col format with checkbox', async () => {
  const { parseLegacyHtml } = require('../migrate');
  const html = `<table><tr><td>research physicist<td>exxon mobile<td>w/gary hunt<td><input type='checkbox' onclick='saveTable()'><td><a href=https://example.com/x>link</a></table>`;
  const rows = parseLegacyHtml(html);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].type_of_work, 'research physicist');
  assert.equal(rows[0].employer_name, 'exxon mobile');
  assert.equal(rows[0].link, 'https://example.com/x');
});
