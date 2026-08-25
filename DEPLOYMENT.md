# Deployment

## Prerequisites

- **PHP 7.4+** on your hosting (no database, no special extensions — this is
  what nearly every shared hosting plan already runs). Nothing PHP-related is
  needed on your own machine — the setup wizard is plain bash.
- **bash locally** to run the one-time setup wizard. Already present on macOS
  and Linux; on Windows, use Git Bash (comes with Git for Windows) or WSL.
- **HTTPS** on your hosting. Most shared hosts offer a free Let's Encrypt/
  AutoSSL certificate, enabled with one click from the control panel (e.g.
  cPanel) — no SSH needed. **Without HTTPS, GPS sharing doesn't work at
  all**: browsers only allow `navigator.geolocation` in a secure context, so
  on a plain-HTTP domain the request always fails, silently. Tapping the map
  by hand to set your position still always works regardless of HTTPS — but
  to actually use GPS, enable HTTPS before sharing links with anyone.
- No SSH access is required to deploy or operate the app day-to-day — regular
  FTP/file manager access is enough.

## 1. Run the setup wizard

```sh
bash bin/setup.sh
```

It asks for your neighborhood's map center (with a hint on finding
coordinates via OpenStreetMap), zoom level, pan radius, GPS privacy radius,
timezone, and the list of participants (id, display name, and a color picked
by number from a palette — at least 2 participants). It then writes:

- `webroot/assets/js/config.js`
- `webroot/api/lib/config.php`
- `webroot/data/public_users.json`
- `webroot/data/live_<id>.json` and `webroot/data/schedule_<id>.json` for
  each participant, starting empty/inactive.

Re-running it later refuses to overwrite an existing `config.js` unless you
pass `--force` — a safety net so you don't accidentally wipe a live
deployment's configuration.

## 2. Upload via FTP

Everything the app needs lives in one folder: `webroot/`. Its **contents**
(not the folder itself) go into your hosting's public folder (often called
`public_html`, `htdocs`, or `www`) — nothing should be uploaded above or
outside it. `bin/setup.sh` and the project's other top-level files
(README, this file, `.gitignore`) never need to be uploaded.

## 3. Confirm `data/` is writable

The PHP write endpoints (`api/update_live.php`, `api/update_schedule.php`)
need to create/modify files under `webroot/data/`. On most shared hosts,
files uploaded via FTP are writable by the PHP process by default; if you
see "Richiesta fallita"/"Request failed" errors when toggling status on
`control.html`, check that folder's permissions first.

## 4. How the private links work

There's no secret token: each participant's private control link is simply

```
https://yourdomain/control.html?u=<id>
```

(e.g. `?u=anna`). There's no real access control behind it — anyone who
knows or guesses this link can update that participant's status — so **don't
share it publicly** (no social media, large groups, indexed pages). For a
small, fixed group who exchange the link privately, this is a deliberate
simplification; if you ever open the board to a larger or less-trusted
group, it's worth reintroducing real access control.

## 5. Adding, renaming, or removing a participant later

There's no admin UI — this matches the "small fixed group, no database"
design. To change the roster after the initial setup:

- **Add**: append an entry to `webroot/data/public_users.json` (`id`,
  `name`, `color`), then create `webroot/data/live_<id>.json` and
  `webroot/data/schedule_<id>.json` by copying the empty/inactive shape of
  an existing participant's files.
- **Rename or recolor**: edit their entry in `public_users.json` directly —
  their `id` (used in their private link and their data filenames) should
  stay the same unless you also rename their `live_<id>.json`/
  `schedule_<id>.json` files to match.
- **Remove**: delete their entry from `public_users.json` (their data files
  can stay, they just stop being read).

## 6. Adjusting the map area or planned-route lifetime later

Map center/zoom/pan radius/GPS privacy radius live in
`webroot/assets/js/config.js` (regenerate with `bash bin/setup.sh --force`,
or edit the file directly — it's plain JS constants). How long a saved
route stays drawn on the board before it's treated as stale
(`MCA_ROUTE_TTL_MS`, default 30 minutes) is a constant near the top of
`webroot/assets/js/common.js`.

## 7. After every future code change: bump the cache-busting version

Every `<script src="assets/js/...">` and `<link href="assets/css/...">` tag
in the HTML pages ends with a string like `?v=1`. This tells browsers "this
is a new file, don't use what you already cached" — without it, a phone that
already opened the app once could keep using an old version of a JS file
even after you've uploaded a new one, causing mismatched-version errors like
*"Can't find variable: ..."*.

**Every time you edit a file under `webroot/assets/js/` or
`webroot/assets/css/`**, find the current `?v=...` string across all `.html`
files (they're always identical) and replace it everywhere with a new value
— the date is a simple, sortable choice. Forgetting isn't fatal — the file
still eventually gets picked up once any cache expires — but bumping the
version guarantees everyone sees the update immediately instead of after an
unpredictable caching delay.

## Troubleshooting

- **Blank page / PHP error after upload**: check your host's PHP error log;
  the most common cause is `webroot/api/lib/config.php` missing (re-run
  `bin/setup.sh` and re-upload) or a PHP version below 7.4.
- **"Richiesta fallita"/"Request failed" when toggling status**: `webroot/data/`
  isn't writable by PHP — check permissions.
- **GPS toggle does nothing / no browser permission prompt**: the site isn't
  served over HTTPS (see prerequisites above), or the browser denied the
  permission previously — check the site's permission settings in the
  browser.
- **A page shows old behavior after you fixed a bug**: you forgot to bump
  the cache-busting `?v=...` string (see §7) or didn't re-upload every
  changed file — re-check both.
