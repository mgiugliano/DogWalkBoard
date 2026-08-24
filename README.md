# DogWalkBoard

A small, self-hosted board for a group of neighbors who each walk a dog and
want to know — in something close to real time — whether the others are out
right now, roughly where, and where they're headed, so everyone can route
around each other (or perhaps join each other to play together).

No accounts, no database, no build step. Static HTML/JS plus a couple of
small PHP endpoints, deployable to any ordinary shared PHP hosting over plain
FTP. No shell access needed. 

## Features

- **Live status board** — see who's out right now, their live position and
  direction of travel on a map, updated by polling every 10 seconds.
- **50m proximity alert** — a visible + audible warning when two active
  participants are close to each other.
- **Walk started/stopped alert** — a heads-up the moment anyone's status
  flips, even with no proximity risk yet.
- **Stale-position warning** — if someone's position hasn't actually updated
  in 30+ seconds, their marker blinks and their "last updated" time turns
  red; if it's *your* page that was backgrounded, you get an unmissable
  modal when you come back explaining how long you were away.
- **Planned routes** — draw the route you intend to walk; it stays visible to
  everyone (including yourself, after saving) until it expires or you clear
  it.
- **Recurring schedules** — a simple read-only page listing everyone's
  typical daily walk windows, for when nobody's out right now.
- **Bilingual UI** (Italian/English) — a toggle in the header, next to the
  dark/light theme toggle, remembers your choice.
- **Any number of participants** — configure 2 or more.

## Architecture

Static HTML/CSS/vanilla JS frontend (Leaflet.js + OpenStreetMap tiles for the
map), a handful of PHP endpoints that only ever *write* flat JSON files under
`webroot/data/` (all reads are plain cache-busted `fetch()` of those files —
no PHP involved), and file-locked read-modify-write so concurrent writes
never corrupt a record. No database, no build tooling, no framework: this
whole app is exactly what you upload.

Auth is intentionally minimal: each participant gets a private link
(`control.html?u=<id>`) with no secret token. This is meant for a small,
trusted group who don't publish their own links — see
[DEPLOYMENT.md](DEPLOYMENT.md) for the reasoning and its limits.

## Quick start

```sh
git clone <this-repo> DogWalkBoard
cd DogWalkBoard
php bin/setup.php
```

The wizard asks for your neighborhood's map center, timezone, and the list
of participants, then generates the config and starting data files. Upload
the entire contents of `webroot/` to your hosting via FTP and you're done.

See [DEPLOYMENT.md](DEPLOYMENT.md) for prerequisites, step-by-step
deployment, and troubleshooting.

## License

MIT — see [LICENSE](LICENSE).
