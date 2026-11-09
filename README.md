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
2. The **creator** hosts that peer id and holds authoritative state: songs, **setlist order**, **active index/slot**, active song, scroll ratio, chord/auto-scroll toggles, members — each change bumps a monotonic **revision**.
3. **Joiners** open a reliable PeerJS connection to the host, receive full state, and send patches for song jumps, exact slot placement, drag reorder, and scroll. The host merges and **full-state broadcasts** to everyone.
4. Host also **re-pushes full state every ~2.5s**; guests heartbeat / request-state every ~4s so late packets still lockstep.
5. Keep the leader’s tab open while others are connected.
6. **Practice solo** skips PeerJS and stores state in `localStorage`.
7. If PeerJS can’t be reached when hosting, BEND falls back to solo mode so rehearsal still works offline.

### Exact placement

- **Drag-and-drop** and **up/down arrows** reorder the shared setlist.
- Each row has a **Slot #** select to move that song to an exact position.
- Live view and setlist both have a **Jump live to** / **Exact slot** picker so any member can select a specific setlist index — synced lobby-wide.

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
