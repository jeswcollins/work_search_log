'use strict';

/*
 * Work search log — Phase 1 server.
 *
 * - SQLite-backed CRUD aligned to MA DUA Form 1750 field vocabulary.
 * - Edit, delete, and backdate entries; one HTML page per day.
 * - Weekly view (Form-1750 shape) at /week and /week/YYYY-MM-DD, with CSV.
 * - Partial-UI week toggle: "called back this week".
 *
 * Designed for personal use on localhost. No auth, no HTTPS.
 * The legacy server (server_log_work_search_by_day.js) remains in place;
 * point your startup script at this file when you're ready to switch.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const qs = require('node:querystring');
const db = require('./db');
const views = require('./views');

const PORT = Number(process.env.PORT) || 1025;
const REQUIRED_ACTIVITIES_PER_WEEK = 3;
const MAX_BODY_BYTES = 1_000_000;

function todayISO() {
  return toISODate(new Date());
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function weekStartFor(isoDate) {
  // Week starts Sunday — matches MA DUA's benefit week.
  const d = new Date(isoDate + 'T00:00:00');
  const dow = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - dow);
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
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function parseForm(req) {
  const body = await readBody(req);
  return qs.parse(body);
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', ...headers });
  res.end(body);
}

function redirect(res, location) {
  res.writeHead(303, { Location: location });
  res.end();
}

function serveCss(res) {
  fs.readFile(path.join(__dirname, 'style.css'), (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('css missing');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/css; charset=utf-8' });
    res.end(data);
  });
}

function createApp({ database }) {
  return async function handler(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const { pathname } = url;

      if (req.method === 'GET' && pathname === '/style.css') return serveCss(res);

      if (req.method === 'GET' && pathname === '/') {
        const date = todayISO();
        const entries = db.entriesByDate(database, date);
        send(res, 200, views.dayView({
          date,
          entries,
          weekStart: weekStartFor(date),
          formDefault: { date },
        }));
        return;
      }

      let m;
      if (req.method === 'GET' && (m = pathname.match(/^\/entries\/(\d+)\/edit$/))) {
        const entry = db.getEntry(database, m[1]);
        if (!entry) return send(res, 404, 'Not found');
        send(res, 200, views.editView({ entry, weekStart: weekStartFor(entry.date) }));
        return;
      }

      if (req.method === 'POST' && pathname === '/entries') {
        const fields = await parseForm(req);
        if (!fields.date || !fields.employer_name) {
          return send(res, 400, 'date and employer_name are required');
        }
        db.insertEntry(database, fields);
        return redirect(res, '/');
      }

      if (req.method === 'POST' && (m = pathname.match(/^\/entries\/(\d+)$/))) {
        const fields = await parseForm(req);
        if (!fields.date || !fields.employer_name) {
          return send(res, 400, 'date and employer_name are required');
        }
        const changed = db.updateEntry(database, m[1], fields);
        if (!changed) return send(res, 404, 'Not found');
        return redirect(res, `/week/${weekStartFor(fields.date)}`);
      }

      if (req.method === 'POST' && (m = pathname.match(/^\/entries\/(\d+)\/delete$/))) {
        const entry = db.getEntry(database, m[1]);
        if (!entry) return send(res, 404, 'Not found');
        db.deleteEntry(database, m[1]);
        return redirect(res, `/week/${weekStartFor(entry.date)}`);
      }

      if (req.method === 'GET' && pathname === '/week') {
        return redirect(res, `/week/${weekStartFor(todayISO())}`);
      }

      if (req.method === 'GET' && (m = pathname.match(/^\/week\/(\d{4}-\d{2}-\d{2})\.csv$/))) {
        const ws = m[1];
        const we = weekEndFor(ws);
        const entries = db.entriesByWeek(database, ws, we);
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="work-search-${ws}.csv"`,
        });
        res.end(views.entriesToCsv(entries));
        return;
      }

      if (req.method === 'GET' && (m = pathname.match(/^\/week\/(\d{4}-\d{2}-\d{2})$/))) {
        const ws = m[1];
        const we = weekEndFor(ws);
        const entries = db.entriesByWeek(database, ws, we);
        const meta = db.getWeekMeta(database, ws);
        send(res, 200, views.weekView({
          weekStart: ws,
          weekEnd: we,
          entries,
          meta,
          requiredActivities: REQUIRED_ACTIVITIES_PER_WEEK,
          weekNav: {
            prev: shiftWeek(ws, -7),
            next: shiftWeek(ws, 7),
          },
        }));
        return;
      }

      if (req.method === 'POST' && (m = pathname.match(/^\/week\/(\d{4}-\d{2}-\d{2})\/meta$/))) {
        const ws = m[1];
        const fields = await parseForm(req);
        db.setWeekMeta(database, ws, {
          partial_ui: fields.partial_ui === '1',
          notes: fields.notes || null,
        });
        return redirect(res, `/week/${ws}`);
      }

      send(res, 404, 'Not found');
    } catch (err) {
      console.error('handler error:', err);
      if (!res.headersSent) send(res, 500, 'Server error');
    }
  };
}

function start({ port = PORT, dbPath } = {}) {
  const database = db.open(dbPath);
  const server = http.createServer(createApp({ database }));
  server.listen(port);
  server.on('listening', () => console.log(`work_search_log listening on http://localhost:${port}`));
  return { server, database };
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start, weekStartFor, weekEndFor, shiftWeek, toISODate };
