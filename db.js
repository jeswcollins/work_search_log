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
  `);

  // Defensive migration for databases created before is_dream existed.
  const cols = db.prepare(`PRAGMA table_info(entries)`).all().map(r => r.name);
  if (!cols.includes('is_dream')) {
    db.exec(`ALTER TABLE entries ADD COLUMN is_dream INTEGER NOT NULL DEFAULT 0`);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS entries_dream_idx ON entries(is_dream)`);
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
  const stmt = db.prepare(`
    INSERT INTO entries
      (date, type, employer_name, person, contact_method, contact_info,
       type_of_work, results, link, description, legacy, is_dream,
       created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const info = stmt.run(
    row.date, row.type, row.employer_name, row.person, row.contact_method,
    row.contact_info, row.type_of_work, row.results, row.link, row.description,
    legacy, is_dream, now, now
  );
  return Number(info.lastInsertRowid);
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
    'SELECT * FROM entries WHERE date = ? AND is_dream = 0 ORDER BY created_at ASC'
  ).all(date);
}

function entriesByWeek(db, weekStartISO, weekEndISO) {
  return db.prepare(
    `SELECT * FROM entries
     WHERE date >= ? AND date <= ? AND is_dream = 0
     ORDER BY date ASC, created_at ASC`
  ).all(weekStartISO, weekEndISO);
}

function dreams(db) {
  return db.prepare(
    `SELECT * FROM entries WHERE is_dream = 1
     ORDER BY created_at DESC`
  ).all();
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
  promoteDream,
  deleteEntry,
  getEntry,
  entriesByDate,
  entriesByWeek,
  dreams,
  getWeekMeta,
  setWeekMeta,
  FIELDS,
};
