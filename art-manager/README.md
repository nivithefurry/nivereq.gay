# Art Manager

A local Node.js utility for managing the nivereq website gallery. It lives outside `public/` and listens only on `127.0.0.1`.

## Requirements

- Node.js 22.16 or newer, which includes `node:sqlite`.
- npm, used to install the local Nodemon development dependency.
- Run the manager as a regular user, not as root.

## First run

From this `art-manager/` directory:

```sh
npm install
npm run init
npm run import
npm run dev
```

Open `http://127.0.0.1:8765/`. `npm run dev` uses the project's local Nodemon installation and restarts the server when `manage.mjs` or `manager.html` changes. Use `npm start` to run without Nodemon. Import can be repeated: it preserves IDs, authors, and `timestamp_added`, skips records already in the database, validates image files, and reports invalid entries. It does not modify the JSON file. Set an optional default author with `ART_MANAGER_DEFAULT_AUTHOR=name`.

## Adding and removing artwork

Enter an absolute image path in the form. The manager checks the extension and PNG/JPEG/GIF/WebP signature, copies the image into `public/assets/arts/`, and generates a 10-character alphanumeric ID following the existing filename convention. “Creation date” is optional; `timestamp_added` always records when the entry was added. Deletion requires confirmation. Managed images are moved to the private `art-manager/trash/` directory. Shared files and files outside the managed asset folder are preserved.

Click “Back up now” to save both the SQLite database and the current JSON. Export also backs up the old JSON automatically. To publish database changes, click “Export to website” or run:

```sh
npm run export
```

Export writes the gallery-compatible `public/data/arts.json` format (`src`, `author`, `timestamp_added`) and archives the previous JSON in `art-manager/backups/`. In Cloudflare Pages, keep the repository root as the project root and set the build output directory to `public`. Pages deploys only that output directory, so the `art-manager/` utility, its SQLite database, backups, and trash are outside the published site. Never use the repository root as the output directory.

## Backups

```sh
npm run backup
npm run restore -- artworks.2026-10-20T12-00-00.000Z.sqlite3
```

Database backups, JSON backups, and trashed files stay under the private `art-manager/` directory. Stop the manager before restoring a database backup. Restore saves the current database before replacing it.

## Commands

- `npm run init` — create the database and private directories.
- `npm run import` — repeatably import the current gallery JSON.
- `npm run dev` — run the local server with Nodemon watching the server and UI files.
- `npm start` — run the local server without Nodemon; choose another port with `npm start -- --port 9000`.
- `npm run export` — write public gallery data.
- `npm run backup` — back up both SQLite and the current gallery JSON.
- `npm run restore -- <filename>` — restore a SQLite backup.
- `npm test` — run automated tests.

The database is `art-manager/data/artworks.sqlite3`; website images are stored in `public/assets/arts/`. Do not expose the manager on a public network interface.
