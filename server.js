'use strict';

/*
 * Work search log — Phase 1 (React SPA) server.
 *
 * - Serves a JSON API under /api/* backed by SQLite.
 * - Serves the built Vite client from client/dist/ for any non-API GET.
 * - Falls back to index.html for SPA routes.
 *
 * Field vocabulary aligned to MA DUA Form 1750. Entries can be marked
 * is_dream=1 ("future / idea") and promoted to a real work search later.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');
const { entriesToCsv } = require('./views');

const PORT = Number(process.env.PORT) || 1025;
const MAX_BODY_BYTES = 1_000_000;
const CLIENT_DIST = path.join(__dirname, 'client', 'dist');

function todayISO() { return toISODate(new Date()); }

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weekStartFor(isoDate) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() - d.getDay());
  return toISODate(d);
}

function weekEndFor(weekStart) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return toISODate(d);
}

function shiftWeek(weekStart, deltaDays) {
  const d = new Date(weekStart + 'T00:00:00');
  d.setDate(d.getDate() + deltaDays);
  return toISODate(d);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let length = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      length += chunk.length;
      if (length > MAX_BODY_BYTES) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function parseJson(req) {
  const body = await readBody(req);
  if (!body) return {};
  try { return JSON.parse(body); }
  catch { throw Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function text(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': contentType });
  res.end(body);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.map':  'application/json; charset=utf-8',
};

function serveFile(res, filePath, fallback) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      if (fallback) return serveFile(res, fallback);
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

function createApp({ database }) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const { pathname } = url;

      if (pathname.startsWith('/api/')) {
        return handleApi(req, res, pathname, database);
      }

      // Legacy CSS path (handy when running from source without a build)
      if (req.method === 'GET' && pathname === '/style.css') {
        return serveFile(res, path.join(__dirname, 'style.css'));
      }

      if (req.method !== 'GET') {
        return text(res, 405, 'Method not allowed');
      }

      // Static client assets, with SPA fallback to index.html.
      const safe = path.normalize(pathname).replace(/^[/\\]+/, '');
      const candidate = path.join(CLIENT_DIST, safe);
      const indexHtml = path.join(CLIENT_DIST, 'index.html');
      if (pathname === '/' || !path.extname(safe)) {
        return serveFile(res, indexHtml);
      }
      return serveFile(res, candidate, indexHtml);
    } catch (err) {
      console.error('handler error:', err);
      if (!res.headersSent) text(res, err.status || 500, err.message || 'Server error');
    }
  };
}

async function handleApi(req, res, pathname, database) {
  let m;

  if (req.method === 'GET' && pathname === '/api/today') {
    const date = todayISO();
    return json(res, 200, { date, entries: db.entriesByDate(database, date) });
  }

  if (req.method === 'GET' && pathname === '/api/jobs') {
    return json(res, 200, { jobs: withLinks(database, db.allJobs(database)) });
  }

  if (req.method === 'GET' && pathname === '/api/network') {
    return json(res, 200, { network: withLinks(database, db.allNetwork(database)) });
  }

  if (req.method === 'POST' && pathname === '/api/entries') {
    const fields = await parseJson(req);
    if (!fields.date || !fields.employer_name) {
      return json(res, 400, { error: 'date and employer_name are required' });
    }
    const id = db.insertEntry(database, fields);
    return json(res, 201, db.getEntry(database, id));
  }

  if ((m = pathname.match(/^\/api\/entries\/(\d+)\/links\/(\d+)$/))) {
    const id = Number(m[1]);
    const otherId = Number(m[2]);
    if (req.method === 'DELETE') {
      const removed = db.unlinkEntries(database, id, otherId);
      return json(res, removed ? 200 : 404, { ok: !!removed });
    }
  }

  if (req.method === 'POST' && (m = pathname.match(/^\/api\/entries\/(\d+)\/links$/))) {
    const id = Number(m[1]);
    const { other_id } = await parseJson(req);
    if (!other_id) return json(res, 400, { error: 'other_id required' });
    const result = db.linkEntries(database, id, Number(other_id));
    if (!result.ok) {
      const status = result.reason === 'missing' ? 404 : 400;
      return json(res, status, { error: `cannot link: ${result.reason}` });
    }
    return json(res, result.existed ? 200 : 201, {
      ok: true,
      existed: !!result.existed,
      link: result.link,
    });
  }

  if ((m = pathname.match(/^\/api\/entries\/(\d+)$/))) {
    const id = Number(m[1]);
    if (req.method === 'GET') {
      const row = db.getEntry(database, id);
      if (!row) return json(res, 404, { error: 'Not found' });
      return json(res, 200, { ...row, links: db.linksFor(database, id) });
    }
    if (req.method === 'PUT') {
      const fields = await parseJson(req);
      if (!fields.date || !fields.employer_name) {
        return json(res, 400, { error: 'date and employer_name are required' });
      }
      const changed = db.updateEntry(database, id, fields);
      if (!changed) return json(res, 404, { error: 'Not found' });
      return json(res, 200, db.getEntry(database, id));
    }
    if (req.method === 'PATCH') {
      const patch = await parseJson(req);
      const changed = db.patchEntry(database, id, patch);
      if (!changed) return json(res, 404, { error: 'Not found' });
      return json(res, 200, db.getEntry(database, id));
    }
    if (req.method === 'DELETE') {
      const changed = db.deleteEntry(database, id);
      if (!changed) return json(res, 404, { error: 'Not found' });
      return json(res, 200, { ok: true });
    }
  }

  if (req.method === 'POST' && (m = pathname.match(/^\/api\/entries\/(\d+)\/promote$/))) {
    const id = Number(m[1]);
    const fields = await parseJson(req);
    const newDate = fields.date || todayISO();
    const changed = db.promoteDream(database, id, newDate);
    if (!changed) return json(res, 404, { error: 'Not a dream, or not found' });
    return json(res, 200, db.getEntry(database, id));
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/api\/week\/(\d{4}-\d{2}-\d{2})\.csv$/))) {
    const ws = m[1];
    const we = weekEndFor(ws);
    const entries = db.entriesByWeek(database, ws, we);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="work-search-${ws}.csv"`,
    });
    res.end(entriesToCsv(entries));
    return;
  }

  if (req.method === 'GET' && (m = pathname.match(/^\/api\/week\/(\d{4}-\d{2}-\d{2})$/))) {
    const ws = m[1];
    const we = weekEndFor(ws);
    return json(res, 200, {
      week_start: ws,
      week_end: we,
      entries: db.entriesByWeek(database, ws, we),
      meta: db.getWeekMeta(database, ws) || null,
      nav: { prev: shiftWeek(ws, -7), next: shiftWeek(ws, 7) },
    });
  }

  if (req.method === 'POST' && (m = pathname.match(/^\/api\/week\/(\d{4}-\d{2}-\d{2})\/meta$/))) {
    const ws = m[1];
    const fields = await parseJson(req);
    db.setWeekMeta(database, ws, {
      partial_ui: !!fields.partial_ui,
      notes: fields.notes || null,
    });
    return json(res, 200, db.getWeekMeta(database, ws));
  }

  return json(res, 404, { error: 'Not found' });
}

/* Attach a `links` array to each entry in a list response. */
function withLinks(database, rows) {
  if (!rows.length) return rows;
  const linksByEntry = db.linksForMany(database, rows.map(r => r.id));
  return rows.map(r => ({ ...r, links: linksByEntry[r.id] || [] }));
}

function start({ port = PORT, dbPath } = {}) {
  const database = db.open(dbPath);
  const server = http.createServer(createApp({ database }));
  server.listen(port);
  server.on('listening', () => console.log(`work_search_log listening on http://localhost:${port}`));
  return { server, database };
}

if (require.main === module) start();

module.exports = { createApp, start, weekStartFor, weekEndFor, shiftWeek, toISODate };
