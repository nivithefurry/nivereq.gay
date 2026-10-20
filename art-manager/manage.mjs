import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes } from 'node:crypto';
import { createReadStream, constants as fsConstants } from 'node:fs';
import { mkdir, readFile, writeFile, copyFile, stat, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(process.env.ART_MANAGER_PROJECT_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const MANAGER = path.resolve(process.env.ART_MANAGER_HOME || path.dirname(fileURLToPath(import.meta.url)));
const DATA = path.join(MANAGER, 'data');
const BACKUPS = path.join(MANAGER, 'backups');
const TRASH = path.join(MANAGER, 'trash');
const DB_FILE = path.join(DATA, 'artworks.sqlite3');
const JSON_FILE = path.join(ROOT, 'public', 'data', 'arts.json');
const ASSET_DIR = path.join(ROOT, 'public', 'assets', 'arts');
const DEFAULT_AUTHOR = process.env.ART_MANAGER_DEFAULT_AUTHOR?.trim() || 'nivereq';
const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const SIGNATURES = {
  '.png': b => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
  '.jpg': b => b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255,
  '.jpeg': b => b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255,
  '.gif': b => b.length >= 6 && (b.subarray(0, 6).toString() === 'GIF87a' || b.subarray(0, 6).toString() === 'GIF89a'),
  '.webp': b => b.length >= 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP'
};
const MIME = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp' };

async function ensureDirs() {
  await Promise.all([DATA, BACKUPS, TRASH, ASSET_DIR, path.dirname(JSON_FILE)].map(p => mkdir(p, { recursive: true })));
}

function openDb(file = DB_FILE) {
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS artworks (
      id TEXT PRIMARY KEY,
      src TEXT NOT NULL UNIQUE,
      author TEXT NOT NULL,
      timestamp_added INTEGER NOT NULL CHECK(timestamp_added >= 0),
      created_at TEXT,
      managed INTEGER NOT NULL DEFAULT 0 CHECK(managed IN (0, 1))
    ) STRICT;
    CREATE INDEX IF NOT EXISTS artworks_added ON artworks(timestamp_added DESC);`);
  return db;
}

function safeId(value) { return typeof value === 'string' && /^[A-Za-z0-9]{10}$/.test(value); }
function getExt(filename) { return path.extname(filename).toLowerCase(); }
function detectMime(buffer) {
  for (const [ext, matches] of Object.entries(SIGNATURES)) if (matches(buffer)) return MIME[ext];
  return null;
}
function validateImage(buffer, ext) {
  if (!EXTENSIONS.has(ext) || !SIGNATURES[ext]?.(buffer)) throw new Error('Use a supported extension and matching PNG, JPEG, GIF, or WebP content.');
}
function parseRecord(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid JSON record.');
  if (typeof item.src !== 'string' || !item.src.startsWith('/assets/arts/')) throw new Error('Invalid src URL.');
  const filename = item.src.slice('/assets/arts/'.length);
  if (!filename || filename !== path.basename(filename) || filename.includes('..')) throw new Error('Unsafe src path.');
  const ext = getExt(filename);
  const id = filename.slice(0, -ext.length);
  if (!safeId(id)) throw new Error(`Nazwa pliku nie pasuje do konwencji ID: ${filename}`);
  if (typeof item.author !== 'string' || !item.author.trim() || item.author.length > 120) throw new Error('Author must be 1–120 characters.');
  if (!Number.isSafeInteger(item.timestamp_added) || item.timestamp_added < 0) throw new Error('Invalid timestamp_added.');
  return { id, src: item.src, author: item.author.trim(), timestamp_added: item.timestamp_added, created_at: null, managed: 0, filename, ext };
}

async function importJson() {
  await ensureDirs();
  const raw = JSON.parse(await readFile(JSON_FILE, 'utf8'));
  if (!Array.isArray(raw)) throw new Error('arts.json must contain an array.');
  const db = openDb();
  const insert = db.prepare('INSERT OR IGNORE INTO artworks (id,src,author,timestamp_added,created_at,managed) VALUES (?,?,?,?,?,?)');
  const findExisting = db.prepare('SELECT id,src,author,timestamp_added FROM artworks WHERE id = ? OR src = ?');
  const report = { source: raw.length, imported: 0, alreadyPresent: 0, invalid: [] };
  const seen = new Set();
  db.exec('BEGIN IMMEDIATE');
  try {
    for (let i = 0; i < raw.length; i++) {
      try {
        const row = parseRecord(raw[i]);
        if (seen.has(row.id) || seen.has(row.src)) throw new Error('Duplicate ID or src in the JSON file.');
        seen.add(row.id); seen.add(row.src);
        const assetPath = path.join(ASSET_DIR, row.filename);
        const resolved = path.resolve(assetPath);
        if (!resolved.startsWith(`${ASSET_DIR}${path.sep}`)) throw new Error('Path is outside the artwork directory.');
        const info = await stat(resolved);
        if (!info.isFile() || info.size > MAX_IMAGE_SIZE) throw new Error('File is missing or exceeds the 25 MB limit.');
        // Keep valid legacy references even if a historical extension is wrong.
        if (!detectMime(await readFile(resolved))) throw new Error('File has no recognized PNG, JPEG, GIF, or WebP signature.');
        const existing = findExisting.get(row.id, row.src);
        if (existing && (existing.id !== row.id || existing.src !== row.src || existing.author !== row.author || existing.timestamp_added !== row.timestamp_added)) {
          throw new Error('Entry conflicts with an existing database record (ID, src, or metadata differs).');
        }
        if (existing) { report.alreadyPresent++; continue; }
        const result = insert.run(row.id, row.src, row.author, row.timestamp_added, row.created_at, row.managed);
        if (result.changes) report.imported++; else report.alreadyPresent++;
      } catch (error) { report.invalid.push({ index: i, src: raw[i]?.src ?? null, reason: error.message }); }
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; } finally { db.close(); }
  return report;
}

function records(db) { return db.prepare('SELECT id,src,author,timestamp_added,created_at,managed FROM artworks ORDER BY timestamp_added DESC, rowid DESC').all(); }

function backupStamp() { return new Date().toISOString().replaceAll(':', '-'); }
async function createCopy(source, stem, extension) {
  const timestamp = backupStamp();
  for (let attempt = 0; attempt < 100; attempt++) {
    const suffix = attempt ? `-${process.pid}-${attempt}` : '';
    const target = path.join(BACKUPS, `${stem}.${timestamp}${suffix}${extension}`);
    try { await copyFile(source, target, fsConstants.COPYFILE_EXCL); return target; }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  }
  throw new Error('Could not create a unique backup filename.');
}

async function backupJson() {
  await ensureDirs();
  const info = await stat(JSON_FILE);
  if (!info.isFile()) throw new Error('public/data/arts.json is not a file.');
  return createCopy(JSON_FILE, 'arts.json', '.bak');
}

async function exportJson() {
  await ensureDirs();
  const db = openDb();
  let rows;
  try { rows = records(db); } finally { db.close(); }
  const output = rows.map(({ src, author, timestamp_added }) => ({ src, author, timestamp_added }));
  let jsonBackup = null;
  try { await stat(JSON_FILE); jsonBackup = await backupJson(); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const temp = `${JSON_FILE}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(output, null, 2)}\n`, { flag: 'wx' });
  try { await rename(temp, JSON_FILE); } catch (error) { await unlink(temp).catch(() => {}); throw error; }
  return { count:output.length, jsonBackup };
}

async function backupDatabase() {
  await ensureDirs();
  const db = openDb();
  try {
    const target = path.join(BACKUPS, `artworks.${backupStamp()}.sqlite3`);
    const { backup } = await import('node:sqlite');
    await backup(db, target);
    return target;
  } finally { db.close(); }
}

async function makeBackup() {
  const database = await backupDatabase();
  const json = await backupJson();
  return { database, json };
}

async function restoreBackup(name) {
  await ensureDirs();
  if (typeof name !== 'string' || path.basename(name) !== name || !/^artworks\.[A-Za-z0-9T.-]+\.sqlite3$/.test(name)) throw new Error('Provide only the backup filename from art-manager/backups.');
  const source = path.join(BACKUPS, name);
  const check = new DatabaseSync(source, { readOnly: true });
  try {
    const result = check.prepare('PRAGMA integrity_check').get();
    if (result.integrity_check !== 'ok') throw new Error('SQLite backup failed the integrity check.');
    check.prepare('SELECT id,src,author,timestamp_added FROM artworks LIMIT 1').get();
  } finally { check.close(); }
  const current = openDb();
  current.close();
  await copyFile(DB_FILE, path.join(BACKUPS, `before-restore-${Date.now()}.sqlite3`)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  await copyFile(source, `${DB_FILE}.restore`);
  await rename(`${DB_FILE}.restore`, DB_FILE);
}

function newId(db) {
  const has = db.prepare('SELECT 1 FROM artworks WHERE id = ? OR src = ?');
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = randomBytes(8).toString('base64url').replace(/[^A-Za-z0-9]/g, '').slice(0, 10).padEnd(10, '0');
    if (!has.get(id, `/assets/arts/${id}`)) return id;
  }
  throw new Error('Could not generate an available ID.');
}

async function addArtwork({ sourcePath, author, createdAt }) {
  if (typeof sourcePath !== 'string' || !path.isAbsolute(sourcePath)) throw new Error('Enter an absolute file path.');
  if (typeof author !== 'string' || !author.trim() || author.trim().length > 120) throw new Error('Author must be 1–120 characters.');
  if (createdAt) {
    const date = new Date(`${createdAt}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAt) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== createdAt) throw new Error('Creation date must be a valid date in YYYY-MM-DD format.');
  }
  const source = path.resolve(sourcePath);
  const sourceStat = await stat(source);
  if (!sourceStat.isFile() || sourceStat.size <= 0 || sourceStat.size > MAX_IMAGE_SIZE) throw new Error('Plik jest pusty, nie jest plikiem lub przekracza 25 MB.');
  const ext = getExt(source);
  validateImage(await readFile(source), ext);
  await ensureDirs();
  const db = openDb();
  const id = newId(db);
  const filename = `${id}${ext}`;
  const target = path.join(ASSET_DIR, filename);
  const src = `/assets/arts/${filename}`;
  try {
    await copyFile(source, target, fsConstants.COPYFILE_EXCL);
    db.prepare('INSERT INTO artworks (id,src,author,timestamp_added,created_at,managed) VALUES (?,?,?,?,?,1)')
      .run(id, src, author.trim(), Date.now(), createdAt || null);
  } catch (error) { await unlink(target).catch(() => {}); throw error; }
  finally { db.close(); }
  return { id, src, author: author.trim(), created_at: createdAt || null };
}

async function deleteArtwork(id) {
  if (!safeId(id)) throw new Error('Invalid ID.');
  await ensureDirs();
  const db = openDb();
  const row = db.prepare('SELECT * FROM artworks WHERE id = ?').get(id);
  if (!row) { db.close(); throw new Error('Artwork entry not found.'); }
  const filename = row.src.startsWith('/assets/arts/') ? row.src.slice('/assets/arts/'.length) : '';
  const asset = filename && filename === path.basename(filename) ? path.resolve(ASSET_DIR, filename) : '';
  const canManage = row.managed === 1 && asset.startsWith(`${ASSET_DIR}${path.sep}`);
  const shared = canManage && db.prepare('SELECT COUNT(*) AS count FROM artworks WHERE src = ? AND id <> ?').get(row.src, id).count > 0;
  const trashPath = canManage && !shared ? path.join(TRASH, `${Date.now()}-${filename}`) : null;
  try {
    if (trashPath) await rename(asset, trashPath).catch(error => { if (error.code !== 'ENOENT') throw error; });
    db.exec('BEGIN IMMEDIATE');
    db.prepare('DELETE FROM artworks WHERE id = ?').run(id);
    db.exec('COMMIT');
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    if (trashPath) await rename(trashPath, asset).catch(() => {});
    throw error;
  } finally { db.close(); }
  return { id, movedToTrash: Boolean(trashPath), shared };
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'cache-control':'no-store', 'x-content-type-options':'nosniff' });
  res.end(JSON.stringify(data));
}
async function bodyJson(req) {
  let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 16_384) throw new Error('Request exceeds the size limit.'); }
  try { return JSON.parse(body || '{}'); } catch { throw new Error('Invalid JSON request.'); }
}

async function startServer(port = 8765) {
  await ensureDirs();
  const db = openDb(); db.close();
  const html = await readFile(path.join(MANAGER, 'manager.html'));
  const server = createServer(async (req, res) => {
    const host = req.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return sendJson(res, 403, { error:'Only local connections are allowed.' });
    const origin = req.headers.origin;
    if (origin) {
      try { const parsed = new URL(origin); if (!['127.0.0.1','localhost'].includes(parsed.hostname) || parsed.port !== String(port)) return sendJson(res, 403, { error:'Invalid request origin.' }); }
      catch { return sendJson(res, 403, { error:'Invalid request origin.' }); }
    }
    const url = new URL(req.url || '/', `http://${host}`);
    try {
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/manager.html')) {
        res.writeHead(200, { 'content-type':'text/html; charset=utf-8', 'cache-control':'no-store', 'content-security-policy':"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'", 'x-content-type-options':'nosniff' }); return res.end(html);
      }
      if (req.method === 'GET' && url.pathname === '/api/artworks') {
        const db = openDb(); try { return sendJson(res, 200, { artworks:records(db).map(({ id, src, author, timestamp_added, created_at }) => ({ id, src, author, timestamp_added, created_at, thumbnail:`/thumbnail/${id}` })), defaultAuthor:DEFAULT_AUTHOR }); } finally { db.close(); }
      }
      if (req.method === 'GET' && url.pathname.startsWith('/thumbnail/')) {
        const id = url.pathname.slice('/thumbnail/'.length); if (!safeId(id)) return sendJson(res, 404, { error:'Artwork image not found.' });
        const db = openDb(); let row; try { row = db.prepare('SELECT src FROM artworks WHERE id=?').get(id); } finally { db.close(); }
        if (!row || !row.src.startsWith('/assets/arts/')) return sendJson(res, 404, { error:'Artwork image not found.' });
        const file = path.resolve(ASSET_DIR, row.src.slice('/assets/arts/'.length));
        if (!file.startsWith(`${ASSET_DIR}${path.sep}`)) return sendJson(res, 404, { error:'Artwork image not found.' });
        try { const info = await stat(file); if (!info.isFile()) throw new Error('missing'); const mime = detectMime(await readFile(file)); if (!mime) throw new Error('unsupported'); res.writeHead(200, { 'content-type':mime, 'content-length':info.size, 'cache-control':'no-store', 'x-content-type-options':'nosniff' }); const image = createReadStream(file); image.on('error', () => res.destroy()); return image.pipe(res); }
        catch { return sendJson(res, 404, { error:'Artwork image file is missing.' }); }
      }
      if (req.method === 'POST' && url.pathname === '/api/add') return sendJson(res, 201, { artwork:await addArtwork(await bodyJson(req)) });
      if (req.method === 'POST' && url.pathname === '/api/delete') return sendJson(res, 200, { result:await deleteArtwork((await bodyJson(req)).id) });
      if (req.method === 'POST' && url.pathname === '/api/import') return sendJson(res, 200, { report:await importJson() });
      if (req.method === 'POST' && url.pathname === '/api/export') return sendJson(res, 200, await exportJson());
      if (req.method === 'POST' && url.pathname === '/api/backup') return sendJson(res, 200, { backups:await makeBackup() });
      return sendJson(res, 404, { error:'Resource not found.' });
    } catch (error) { return sendJson(res, 400, { error:error.message || 'The operation failed.' }); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  console.log(`Art manager: http://127.0.0.1:${port}/`);
  return server;
}

async function main(args) {
  const command = args[0] || 'help';
  if (command === 'init') { await ensureDirs(); const db = openDb(); db.close(); console.log(`Database ready: ${DB_FILE}`); }
  else if (command === 'import') console.log(JSON.stringify(await importJson(), null, 2));
  else if (command === 'export') { const result = await exportJson(); console.log(`Exported ${result.count} entries to public/data/arts.json${result.jsonBackup ? ` (JSON backup: ${path.basename(result.jsonBackup)})` : ' (no previous JSON file to back up)'}`); }
  else if (command === 'backup') { const result = await makeBackup(); console.log(`Backups created:\n  Database: ${path.basename(result.database)}\n  JSON: ${path.basename(result.json)}`); }
  else if (command === 'restore') { await restoreBackup(args[1]); console.log('Database restored from backup.'); }
  else if (command === 'serve') {
    let port = 8765; const pos = args.indexOf('--port'); if (pos >= 0) port = Number(args[pos + 1]);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be a number from 1024 to 65535.');
    await startServer(port);
  } else console.log('Commands: init, import, export, backup, restore <backup-filename>, serve [--port 8765]');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}

export { addArtwork, backupJson, deleteArtwork, exportJson, importJson, makeBackup, openDb, parseRecord, validateImage, detectMime };
