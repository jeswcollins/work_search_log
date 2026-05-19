'use strict';

/*
 * One-shot migration: parse legacy daily HTML logs from
 * work_search_logs_by_day/ and import them into the SQLite database.
 *
 * Usage:
 *   node migrate.js                        # use ./work_search_logs_by_day
 *   node migrate.js <source-dir>           # use a custom source directory
 *   node migrate.js <source-dir> <db-path> # also override the database path
 *
 * Legacy row schema (2018-09 onward, the dominant format):
 *   <td>Job Title<td>Organization<td>Person<td>Contact Info<td>Description<td>Link
 *
 * Older rows may have 5 cells with a checkbox in cell 4 — handled tolerantly.
 * Rows are migrated with legacy=1; new Form-1750 fields stay NULL.
 */

const fs = require('node:fs');
const path = require('node:path');
const db = require('./db');

const DATE_RE = /^(\d{4})-(\d{2})-(\d{1,2})\.html$/;

function main() {
  const srcDir = path.resolve(process.argv[2] || path.join(__dirname, 'work_search_logs_by_day'));
  const dbPath = process.argv[3];

  if (!fs.existsSync(srcDir)) {
    console.error(`Source directory not found: ${srcDir}`);
    process.exit(1);
  }

  const database = db.open(dbPath);
  const files = fs.readdirSync(srcDir).filter(f => DATE_RE.test(f)).sort();
  console.log(`Found ${files.length} legacy files in ${srcDir}`);

  let totalRows = 0;
  let totalFiles = 0;

  database.exec('BEGIN');
  try {
    for (const file of files) {
      const date = isoDateFromFilename(file);
      const raw = fs.readFileSync(path.join(srcDir, file), 'utf8');
      const rows = parseLegacyHtml(raw);
      for (const row of rows) {
        db.insertEntry(database, { ...row, date, legacy: 1 });
        totalRows++;
      }
      totalFiles++;
    }
    database.exec('COMMIT');
  } catch (err) {
    database.exec('ROLLBACK');
    throw err;
  }

  console.log(`Imported ${totalRows} rows from ${totalFiles} files.`);
  database.close();
}

function isoDateFromFilename(file) {
  const m = file.match(DATE_RE);
  const [, yyyy, mm, dd] = m;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function parseLegacyHtml(html) {
  const body = html.replace(/<\/?table>/gi, '').replace(/<\/?tbody>/gi, '');
  const rawRows = body.split(/<tr\b[^>]*>/i).map(s => s.trim()).filter(Boolean);
  const out = [];
  for (const r of rawRows) {
    if (/<th\b/i.test(r)) continue;
    const cells = splitCells(r);
    if (cells.length === 0) continue;
    const row = mapCellsToFields(cells);
    if (isEmptyEntry(row)) continue;
    out.push(row);
  }
  return out;
}

function splitCells(rowHtml) {
  return rowHtml
    .split(/<td\b[^>]*>/i)
    .map(s => s.replace(/<\/td>/gi, '').replace(/<\/tr>/gi, '').trim())
    .filter((_, idx, arr) => idx > 0 || arr.length === 1)
    .map(cleanCell);
}

function cleanCell(cell) {
  let s = cell;
  s = s.replace(/<input\b[^>]*>/gi, '');
  const linkMatch = s.match(/<a\b[^>]*href\s*=\s*([^\s>]+)[^>]*>([^<]*)<\/a>/i);
  if (linkMatch) {
    const href = linkMatch[1].replace(/^['"]|['"]$/g, '');
    const text = linkMatch[2].trim();
    s = href || text;
  }
  s = s.replace(/<[^>]+>/g, '');
  return s.trim();
}

function mapCellsToFields(cells) {
  // Modern (6-col): title, org, person, contact_info, description, link
  // Older (5-col):  title, org, person, contact_info-or-checkbox, link
  let title, org, person, contact_info, description, link;
  if (cells.length >= 6) {
    [title, org, person, contact_info, description, link] = cells;
  } else if (cells.length === 5) {
    [title, org, person, contact_info, link] = cells;
    description = null;
  } else {
    [title, org, person, contact_info, description, link] = [
      cells[0], cells[1], cells[2], cells[3], cells[4], cells[5]
    ];
  }
  return {
    type_of_work: nullable(title),
    employer_name: nullable(org),
    person: nullable(person),
    contact_info: nullable(contact_info),
    description: nullable(description),
    link: nullable(link),
    type: null,
    contact_method: null,
    results: null,
  };
}

function nullable(s) {
  if (s == null) return null;
  const t = String(s).trim();
  return t.length === 0 ? null : t;
}

function isEmptyEntry(row) {
  return !row.employer_name && !row.person && !row.type_of_work && !row.contact_info && !row.description && !row.link;
}

if (require.main === module) {
  main();
}

module.exports = { parseLegacyHtml, isoDateFromFilename };
