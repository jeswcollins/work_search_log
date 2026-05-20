'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_DB_PATH = path.join(__dirname, 'data', 'work_search.db');

function open(dbPath = DEFAULT_DB_PATH) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  init(db);
  return db;
}

function init(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS entries (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT    NOT NULL,
      kind            TEXT    NOT NULL DEFAULT 'job',
      type            TEXT,
      employer_name   TEXT,
      person          TEXT,
      contact_method  TEXT,
      contact_info    TEXT,
      type_of_work    TEXT,
      results         TEXT,
      link            TEXT,
      description     TEXT,
      legacy          INTEGER NOT NULL DEFAULT 0,
      is_dream        INTEGER NOT NULL DEFAULT 0,
      applied         INTEGER NOT NULL DEFAULT 0,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS entries_date_idx ON entries(date);

    CREATE TABLE IF NOT EXISTS week_meta (
      week_start  TEXT PRIMARY KEY,
      partial_ui  INTEGER NOT NULL DEFAULT 0,
      notes       TEXT,
      updated_at  INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entry_links (
      job_id      INTEGER NOT NULL,
      network_id  INTEGER NOT NULL,
      created_at  INTEGER NOT NULL,
      PRIMARY KEY (job_id, network_id),
      FOREIGN KEY (job_id)     REFERENCES entries(id) ON DELETE CASCADE,
      FOREIGN KEY (network_id) REFERENCES entries(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS entry_links_network_idx ON entry_links(network_id);
  `);

  // Defensive migrations for databases created on earlier branches.
  const cols = db.prepare(`PRAGMA table_info(entries)`).all().map(r => r.name);
  if (!cols.includes('is_dream')) {
    db.exec(`ALTER TABLE entries ADD COLUMN is_dream INTEGER NOT NULL DEFAULT 0`);
  }
  if (!cols.includes('kind')) {
    db.exec(`ALTER TABLE entries ADD COLUMN kind TEXT NOT NULL DEFAULT 'job'`);
  }
  if (!cols.includes('applied')) {
    db.exec(`ALTER TABLE entries ADD COLUMN applied INTEGER NOT NULL DEFAULT 0`);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS entries_dream_idx ON entries(is_dream)`);
  db.exec(`CREATE INDEX IF NOT EXISTS entries_kind_idx  ON entries(kind)`);
}

const FIELDS = [
  'date', 'type', 'employer_name', 'person', 'contact_method',
  'contact_info', 'type_of_work', 'results', 'link', 'description'
];

function insertEntry(db, fields) {
  const now = Date.now();
  const row = pick(fields, FIELDS);
  const legacy = fields.legacy ? 1 : 0;
  const is_dream = fields.is_dream ? 1 : 0;
  const applied = fields.applied ? 1 : 0;
  const kind = (fields.kind === 'network') ? 'network' : 'job';
  const stmt = db.prepare(`
    INSERT INTO entries
      (date, kind, type, employer_name, person, contact_method, contact_info,
       type_of_work, results, link, description, legacy, is_dream, applied,
       created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(
    row.date, kind, row.type, row.employer_name, row.person, row.contact_method,
    row.contact_info, row.type_of_work, row.results, row.link, row.description,
    legacy, is_dream, applied, now, now
  );
  return Number(info.lastInsertRowid);
}

function patchEntry(db, id, patch) {
  const cur = getEntry(db, id);
  if (!cur) return 0;
  const next = { ...cur, ...patch };
  const is_dream = next.is_dream ? 1 : 0;
  const applied = next.applied ? 1 : 0;
  const kind = (next.kind === 'network') ? 'network' : 'job';
  const stmt = db.prepare(`
    UPDATE entries SET
      kind = ?, is_dream = ?, applied = ?, updated_at = ?
    WHERE id = ?
  `);
  return stmt.run(kind, is_dream, applied, Date.now(), Number(id)).changes;
}

function updateEntry(db, id, fields) {
  const row = pick(fields, FIELDS);
  const stmt = db.prepare(`
    UPDATE entries SET
      date = ?, type = ?, employer_name = ?, person = ?, contact_method = ?,
      contact_info = ?, type_of_work = ?, results = ?, link = ?, description = ?,
      updated_at = ?
    WHERE id = ?
  `);
  const info = stmt.run(
    row.date, row.type, row.employer_name, row.person, row.contact_method,
    row.contact_info, row.type_of_work, row.results, row.link, row.description,
    Date.now(), Number(id)
  );
  return info.changes;
}

function promoteDream(db, id, newDate) {
  const stmt = db.prepare(`
    UPDATE entries SET is_dream = 0, date = ?, updated_at = ?
    WHERE id = ? AND is_dream = 1
  `);
  const info = stmt.run(newDate, Date.now(), Number(id));
  return info.changes;
}

function deleteEntry(db, id) {
  const info = db.prepare('DELETE FROM entries WHERE id = ?').run(Number(id));
  return info.changes;
}

function getEntry(db, id) {
  return db.prepare('SELECT * FROM entries WHERE id = ?').get(Number(id));
}

function entriesByDate(db, date) {
  return db.prepare(
    `SELECT * FROM entries
     WHERE date = ? AND kind = 'job' AND is_dream = 0
     ORDER BY created_at ASC`
  ).all(date);
}

function entriesByWeek(db, weekStartISO, weekEndISO) {
  return db.prepare(
    `SELECT * FROM entries
     WHERE date >= ? AND date <= ? AND kind = 'job' AND is_dream = 0
     ORDER BY date ASC, created_at ASC`
  ).all(weekStartISO, weekEndISO);
}

function allJobs(db) {
  return db.prepare(
    `SELECT * FROM entries WHERE kind = 'job'
     ORDER BY is_dream ASC, applied ASC, date DESC, created_at DESC`
  ).all();
}

function allNetwork(db) {
  return db.prepare(
    `SELECT * FROM entries WHERE kind = 'network'
     ORDER BY date DESC, created_at DESC`
  ).all();
}

/*
 * Link management.
 *
 * Given two entry ids (any order), normalize to (job_id, network_id) by
 * inspecting each entry's kind, then insert. Returns:
 *   { ok: true,  link: <row> }       on success
 *   { ok: false, reason: 'same' }    if both entries are the same
 *   { ok: false, reason: 'kind' }    if not exactly one job + one network
 *   { ok: false, reason: 'missing' } if either id doesn't exist
 *   { ok: true,  link: <row>, existed: true } if the link already existed
 */
function linkEntries(db, idA, idB) {
  if (idA === idB) return { ok: false, reason: 'same' };
  const a = getEntry(db, idA);
  const b = getEntry(db, idB);
  if (!a || !b) return { ok: false, reason: 'missing' };
  const job     = a.kind === 'job'     ? a : b.kind === 'job'     ? b : null;
  const network = a.kind === 'network' ? a : b.kind === 'network' ? b : null;
  if (!job || !network) return { ok: false, reason: 'kind' };

  const existing = db.prepare(
    'SELECT * FROM entry_links WHERE job_id = ? AND network_id = ?'
  ).get(job.id, network.id);
  if (existing) return { ok: true, link: existing, existed: true };

  const now = Date.now();
  db.prepare(
    'INSERT INTO entry_links (job_id, network_id, created_at) VALUES (?, ?, ?)'
  ).run(job.id, network.id, now);
  return { ok: true, link: { job_id: job.id, network_id: network.id, created_at: now } };
}

function unlinkEntries(db, idA, idB) {
  const info = db.prepare(
    `DELETE FROM entry_links
     WHERE (job_id = ? AND network_id = ?)
        OR (job_id = ? AND network_id = ?)`
  ).run(idA, idB, idB, idA);
  return info.changes;
}

/* Return the entries linked to a given entry id, regardless of side. */
function linksFor(db, id) {
  return db.prepare(
    `SELECT e.* FROM entries e
     JOIN entry_links l ON l.network_id = e.id
     WHERE l.job_id = ?
     UNION ALL
     SELECT e.* FROM entries e
     JOIN entry_links l ON l.job_id = e.id
     WHERE l.network_id = ?
     ORDER BY date DESC, created_at DESC`
  ).all(id, id);
}

/* For a set of entry ids, return a map { id => linked_entries[] }. */
function linksForMany(db, ids) {
  const out = {};
  for (const id of ids) out[id] = linksFor(db, id);
  return out;
}

function getWeekMeta(db, weekStart) {
  return db.prepare('SELECT * FROM week_meta WHERE week_start = ?').get(weekStart);
}

function setWeekMeta(db, weekStart, { partial_ui, notes }) {
  const now = Date.now();
  const stmt = db.prepare(`
    INSERT INTO week_meta (week_start, partial_ui, notes, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(week_start) DO UPDATE SET
      partial_ui = excluded.partial_ui,
      notes      = excluded.notes,
      updated_at = excluded.updated_at
  `);
  stmt.run(weekStart, partial_ui ? 1 : 0, notes ?? null, now);
}

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k] ?? null;
  return out;
}

module.exports = {
  open,
  init,
  insertEntry,
  updateEntry,
  patchEntry,
  promoteDream,
  deleteEntry,
  getEntry,
  entriesByDate,
  entriesByWeek,
  allJobs,
  allNetwork,
  linkEntries,
  unlinkEntries,
  linksFor,
  linksForMany,
  getWeekMeta,
  setWeekMeta,
  FIELDS,
};
