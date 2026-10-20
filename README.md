# nivereq's website

A bilingual personal website for nivereq, a creator, streamer, developer, photographer, and furry from Krakow. It includes a profile, fursona information and artwork gallery, plus live Last.fm, Discord, and pat-counter widgets.

## Technology

- Static HTML and CSS
- Vanilla JavaScript with shared Polish and English JSON dictionaries
- Cloudflare Pages Functions for the Last.fm status and pat counter
- Cloudflare Pages for hosting

The static website has no build step; its deployable files are in `public/`, and `functions/` contains Pages Functions. The separate local art manager uses Node.js, documented below.

## Local development

Open `public/index.html` with Live Server, or serve `public/` as the web root. The included `.vscode/settings.json` configures Live Server to use `public/`. The page also supports Live Server configurations that serve the repository root and expose the site at `/public/`.

The home page and fursona page each use one HTML file. Their translations are in `public/i18n/pl.json` and `public/i18n/en.json`; `?lang=pl` and `?lang=en` select a language. The live widgets use Cloudflare Pages Functions and need a Pages-compatible local runtime to work locally.

## Project layout

```text
functions/api/       Cloudflare Pages API functions
public/              Static site output
public/data/         Artwork gallery data
public/fursona/      Fursona page
public/i18n/         Polish and English translations
public/js/           Site scripts and widgets
art-manager/         Private Node.js utility for managing gallery artwork
```

The gallery manager uses SQLite outside `public/`. See [art-manager/README.md](art-manager/README.md) for setup, repeatable import, local management, backups, and the explicit export step that updates `public/data/arts.json`.

## Configuration

The Pages Functions read these Cloudflare environment bindings:

- `LASTFM_USER` and `LASTFM_KEY` for the Last.fm widget
- `PAT_COUNTER` as the counter storage binding

Set these in the Cloudflare Pages project settings. Do not commit credentials.

## Deployment

Connect the repository to Cloudflare Pages and set the build output directory to `public` (with the repository root as the project root). Pages deploys files from that output directory; `art-manager/` is outside it and is not part of the published site. Do not set the repository root as the output directory. No build command is required. The production site is [nivereq.com](https://nivereq.com).

## Public profiles and contact

- YouTube: [nivithefurry](https://youtube.com/@nivithefurry)
- Twitch: [nivithefurry](https://twitch.tv/nivithefurry)
- Instagram: [nivithefurry](https://instagram.com/nivithefurry)
- TikTok: [nivithefurry](https://tiktok.com/@nivithefurry)
- Email: [nivereq@aethers.pl](mailto:nivereq@aethers.pl)

## Rights

Copyright © 2025–2026 @nivereq. All rights reserved. Artwork in the gallery is credited to its respective artists.
