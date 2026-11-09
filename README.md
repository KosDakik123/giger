# BEND

**BEND** is a static single-page app for live band rehearsal and gigs. Create a lobby, share a name + PIN, and keep the active song, lyrics scroll, and setlist in sync across phones and laptops — no native install, no account server.

## Features

- **Lobby / room** — create or join with lobby name + PIN; enter with name, role, and a cute SVG stage character
- **Role flavor** — playful titles like “Shred King” and “The Beat Master”
- **Setlist & library** — add/edit songs (title, artist, lyrics, chords, key, tempo, notes); drag-and-drop + arrow reorder; preset gig-ready songs included
- **Live viewer** — high-contrast dark stage lyrics, chord toggle, prev/next, auto-scroll; creator is Leader (others can still control for rehearsal ease)
- **Sync** — PeerJS (free cloud broker) for cross-device sync; localStorage for persistence and solo mode if the broker is unreachable

## Stack

Vite + React + TypeScript + Tailwind CSS + shadcn-style Radix primitives + PeerJS + Framer Motion + dnd-kit

## Run locally

```bash
npm install
npm run dev
```

Dev server defaults to **http://127.0.0.1:4731**

```bash
npm run build
npm run preview
```

Preview also serves on port **4731**.

## How lobby sync works

1. Lobby name + PIN are hashed into a stable PeerJS host id (`bend-…`).
2. The **creator** hosts that peer id and holds authoritative state (songs, setlist order, active song, scroll ratio, chord/auto-scroll toggles, members).
3. **Joiners** connect to the same host id, receive full state, and send control patches (song changes, scroll, edits). The host merges and rebroadcasts.
4. Keep the leader’s tab open while others are connected.
5. **Practice solo** skips PeerJS and stores state in `localStorage`.
6. If PeerJS can’t be reached when hosting, BEND falls back to solo mode so rehearsal still works offline.

> PeerJS quirk: peer ids can stay “taken” briefly if a tab crashed. Close leftover tabs or wait a moment / use a new lobby name.

## Deploy to GitHub Pages

`vite.config.ts` sets `base: './'` so asset paths work under any Pages subpath (project or user site).

1. Build:

   ```bash
   npm run build
   ```

2. Publish the `dist/` folder:
   - **GitHub Actions** (recommended): add a workflow that runs `npm ci && npm run build` and deploys `dist/` with `actions/upload-pages-artifact` + `actions/deploy-pages`, **or**
   - **Manual**: push `dist/` to the `gh-pages` branch (e.g. `npx gh-pages -d dist`).

3. In the repo **Settings → Pages**, select the branch/folder that serves `dist` (or the Pages environment from Actions).

4. Open the site URL on stage phones — add to Home Screen optional; it remains a browser SPA.

Origin / any static host: upload `dist/` the same way; relative `base` keeps links intact.

## Project scripts

| Script    | Purpose                          |
|-----------|----------------------------------|
| `npm run dev`     | Vite dev server (:4731)  |
| `npm run build`   | Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint`    | Oxlint                         |

## License

Built for band practice. Use it, bend it, don’t break the tempo.
