import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, mkdir, rm, stat, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const fixture = await mkdtemp(path.join(os.tmpdir(), 'nivereq-art-manager-suite-'));
const fixtureRoot = path.join(fixture, 'site');
const fixtureHome = path.join(fixture, 'private-manager');
const assets = path.join(fixtureRoot, 'public/assets/arts');
await mkdir(assets, { recursive:true });
await mkdir(path.join(fixtureRoot, 'public/data'), { recursive:true });
const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]);
await writeFile(path.join(assets, 'abcdefghij.png'), png);
await writeFile(path.join(fixtureRoot, 'public/data/arts.json'), JSON.stringify([
  { src:'/assets/arts/abcdefghij.png', author:'Existing Artist', timestamp_added:1767222000000 }
]));
process.env.ART_MANAGER_PROJECT_ROOT = fixtureRoot;
process.env.ART_MANAGER_HOME = fixtureHome;
const { openDb, parseRecord, validateImage, detectMime, importJson, exportJson, makeBackup, addArtwork, deleteArtwork } = await import(new URL('./manage.mjs', import.meta.url));

test('parses current website record and preserves its ID from src', () => {
  const row = parseRecord({ src:'/assets/arts/l64G1R3URS.png', author:'wiqusia', timestamp_added:1767222000000 });
  assert.equal(row.id, 'l64G1R3URS');
  assert.equal(row.created_at, null);
  assert.equal(row.managed, 0);
});

test('rejects path traversal, malformed metadata and unsupported image signatures', () => {
  assert.throws(() => parseRecord({ src:'/assets/arts/../secret.png', author:'x', timestamp_added:1 }));
  assert.throws(() => parseRecord({ src:'/assets/arts/abcdefghij.png', author:'', timestamp_added:1 }));
  assert.throws(() => validateImage(Buffer.from('not image'), '.png'));
});

test('recognizes legacy JPEG content even when the existing filename ends in .png', () => {
  assert.equal(detectMime(Buffer.from([255,216,255,224,0,16,74,70,73,70,0])), 'image/jpeg');
});

test('SQLite constraints prevent duplicate IDs and source URLs', () => {
  const db = openDb(path.join(fixture, 'constraints.sqlite3'));
  try {
    db.prepare('INSERT INTO artworks(id,src,author,timestamp_added) VALUES(?,?,?,?)').run('abcdefghij','/assets/arts/abcdefghij.png','a',1);
    assert.throws(() => db.prepare('INSERT INTO artworks(id,src,author,timestamp_added) VALUES(?,?,?,?)').run('abcdefghij','/assets/arts/other12345.png','a',1));
    assert.throws(() => db.prepare('INSERT INTO artworks(id,src,author,timestamp_added) VALUES(?,?,?,?)').run('other12345','/assets/arts/abcdefghij.png','a',1));
  } finally { db.close(); }
});

test('import is repeatable, export preserves the public schema, and add/delete manage only copied assets', async t => {
  t.after(() => rm(fixture, { recursive:true, force:true }));
  const first = await importJson();
  const second = await importJson();
  assert.deepEqual({ imported:first.imported, existing:first.alreadyPresent }, { imported:1, existing:0 });
  assert.deepEqual({ imported:second.imported, existing:second.alreadyPresent }, { imported:0, existing:1 });

  const source = path.join(fixture, 'incoming.png');
  await writeFile(source, png);
  const invalidSource = path.join(fixture, 'not-an-image.png');
  await writeFile(invalidSource, 'not an image');
  await assert.rejects(addArtwork({ sourcePath:invalidSource, author:'New Artist' }));
  const added = await addArtwork({ sourcePath:source, author:'New Artist', createdAt:'2024-02-29' });
  assert.match(added.id, /^[A-Za-z0-9]{10}$/);
  assert.equal(added.created_at, '2024-02-29');
  const originalJson = await readFile(path.join(fixtureRoot, 'public/data/arts.json'));
  const exportedResult = await exportJson();
  assert.equal(exportedResult.count, 2);
  assert.ok(exportedResult.jsonBackup);
  const exportJsonBackup = (await readdir(path.join(fixtureHome, 'backups'))).find(name => name.startsWith('arts.json.') && name.endsWith('.bak'));
  assert.ok(exportJsonBackup);
  assert.deepEqual(await readFile(path.join(fixtureHome, 'backups', exportJsonBackup)), originalJson);
  const exported = JSON.parse(await readFile(path.join(fixtureRoot, 'public/data/arts.json'), 'utf8'));
  assert.equal(exported.length, 2);
  assert.deepEqual(Object.keys(exported[0]), ['src','author','timestamp_added']);
  assert.equal(exported[0].author, 'New Artist');

  const backupResult = await makeBackup();
  assert.match(path.basename(backupResult.json), /^arts\.json\..+\.bak$/);
  assert.match(path.basename(backupResult.database), /^artworks\..+\.sqlite3$/);

  const removed = await deleteArtwork(added.id);
  assert.equal(removed.movedToTrash, true);
  await assert.rejects(stat(path.join(assets, path.basename(added.src))));
  assert.equal((await readFile(source)).equals(png), true);
  const db = openDb();
  try { assert.equal(db.prepare('SELECT COUNT(*) AS n FROM artworks WHERE id=?').get(added.id).n, 0); }
  finally { db.close(); }
  const removedLegacy = await deleteArtwork('abcdefghij');
  assert.equal(removedLegacy.movedToTrash, false);
  assert.equal((await readFile(path.join(assets, 'abcdefghij.png'))).equals(png), true);
});

test('existing gallery JSON is a valid array with direct managed asset references', async () => {
  const jsonPath = new URL('../public/data/arts.json', import.meta.url);
  const rows = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(rows.length, 19);
  for (const row of rows) assert.doesNotThrow(() => parseRecord(row));
});
