# Architecture

How the code actually works, for anyone (including future Mohan) picking this repo back up cold. `CLAUDE.md` has the schema reference and working rules; `process.md` has done/next-steps; this is the "how" in depth.

## Shape of the system

Two independent pieces, deployed independently, sharing one Postgres database:

```
                    ┌─────────────────────┐
   Google OAuth ──▶  │   React SPA          │ ──▶  Supabase Postgres + RLS
                    │  (Vercel, static)     │      (auth, all user tables)
                    └─────────────────────┘
                              ▲
                              │ reads news_articles
                              │
                    ┌─────────────────────┐
   GitHub Actions ──▶│  worker/ (Node)      │ ──▶  writes news_articles
   (cron, every 30m) │  9 fetchers          │      (service role key)
                    └─────────────────────┘
```

The frontend never has write access to `news_articles` beyond reading it — that table is filled entirely by the worker, which runs outside the app on its own schedule. Everything else the user owns is read/written directly from the browser through Supabase's client, protected by row-level security, not by any server-side code of ours.

## Frontend

### Auth and first login

`src/App.jsx` wraps every route in `Protected`, which reads `useAuth()` (`src/lib/hooks.js`). Not signed in → `Auth.jsx` (Google OAuth button). Signed in → `SeedGate`, which calls `useSeedGate(user.id)` → `ensureSeeded()` in `src/lib/seed.js`.

`ensureSeeded` checks `user_settings.seeded_at`. Unset means either a genuinely new user or a seed that died partway through last time — either way it calls `wipeUserData()` (delete-by-`user_id` across every owned table, children cascade) then `seedUser()` (inserts the template from `seed.json`), then writes `seeded_at` last. Writing the marker last is the whole safety mechanism: a crash mid-seed just means the next login retries from a clean wipe, never a half-seeded account silently treated as done.

"Settings → Reset to defaults" calls the same `wipeUserData` + `seedUser` pair directly.

### Data layer: one hook per domain

Every page's data comes from a hook in `hooks.js` — `useRoadmap`, `useHabits`, `useGym`, `useResources`, `useNews`, etc. — built on a shared `useQuery(fetcher, deps, options)` helper (not React Query, a ~40-line hand-rolled version) that tracks `loading`/`error`/`data` and exposes `refresh()`. It guards against two real bugs: a result arriving after the component unmounted, and a stale result from an earlier run arriving after a newer one already landed (tracked via an incrementing `runId`).

Pages call the hook, render `loading`/`error`/data states, and call the hook's action functions (`toggleTask`, `logSet`, `saveNotes`, ...) which write to Supabase directly and either patch local state optimistically (`useRoadmap.toggleTask` flips the checkbox immediately, reverts on error) or just call `refresh()` after the write.

**Current phase** (`useRoadmap`) is derived, not stored: the first phase whose task-completion ratio is under 1.0, falling back to the last phase if everything is done. There is no `phases.is_current` flag or date-based logic — this is why editing phase content directly changes what "current" means, and why nothing about phase order needs a manual "set current phase" action.

**Gym** (`useGym`) loads `gym_days` with nested `exercises`, plus a window of `gym_logs`, and exposes `setsFor(exerciseId)` (today's logged sets) and `lastSessionFor(exerciseId)` (most recent earlier `log_date` for that exercise) as memoized lookups over the log rows — "last session" is genuinely just "the most recent date before today that has any rows for this exercise," nothing fancier.

**Habits** streaks are computed client-side in `dates.js`'s `computeStreak`: walks backward one day at a time from today, counting a day as satisfying the streak if every daily habit has a log row for that day, and stops at the first day that doesn't — except today itself, which is allowed to still be in progress.

### Edit mode

One `EditModeProvider` (`hooks.js`), backed by `localStorage` via `useLocalState`, toggled from Settings. Every list-rendering page passes its items to `EditableList.jsx`, which:

- renders nothing but the caller's `renderItem(item)` when edit mode is off (zero overhead, no drag machinery mounted)
- when on: wraps each item in a sortable row with a drag handle (`@dnd-kit`) that PATCHes `order_idx` for every row whose position changed, a delete button behind a confirm modal, and — if `renameInline` (default true) — a pencil that turns the row into a single text input bound to `labelField`
- an "add" row at the end that inserts `{ ...newRow, user_id, [labelField]: value, order_idx: items.length }`

**When a row needs more than one editable field** (Resources' name+url+category; Gym's exercise name+sets+reps+rest+notes; Gym's day name+focus), the page passes `renameInline={false}` and supplies its own pencil button inside `renderItem`, wired to open a small `Modal` (see `ResourceModal` in `Resources.jsx`, `ExerciseModal`/`DayModal` in `Gym.jsx`) that PATCHes every field at once and calls the list's `onMutate` to refetch. This is the established pattern — any future multi-field list should follow it rather than extending `EditableList` itself with a generic form system it doesn't need.

### Live tab

`useNews(category)` reads `news_articles` filtered by category, polls every 5 minutes while the tab is visible (`document.visibilityState`), and exposes `refresh()`. The visible "reload" button in `Live.jsx` just calls that `refresh()` — there is no on-demand fetch path from the browser, because triggering a real fetch needs the service role key, which must never reach client code. New data actually appears because the worker (below) writes it on its own schedule; the button only re-reads.

### Theming

`ThemeProvider` (`src/lib/theme.jsx`) manages `light` / `dark` / `system`, persisted to `localStorage` and applied before first paint (an inline script in `index.html`, so there's no flash of the wrong theme). The palette itself is CSS custom properties (RGB triples) on `:root`/`.light`, consumed through Tailwind's arbitrary-value / alpha syntax (`bg-ink-800/60`, etc.) — switching themes is swapping variable values, never a markup change. `ink-900` is always "the background," `ink-50` is always "the strongest text," in both themes — the ramp inverts, the semantics don't.

### PWA

`vite-plugin-pwa` in `autoUpdate` mode generates the manifest and service worker at build time; `scripts/generate-icons.mjs` renders the actual PNG icon set from a single source without any image-processing dependency.

## Worker (`worker/`)

A plain Node script, not a long-running service in production (see below). `index.js --once` runs every source's `fetch()` concurrently via `Promise.all`, upserts whatever each one returns into `news_articles` (via `db.js`, which resolves actual column names from PostgREST's OpenAPI document at startup rather than hard-coding them — defensive against the schema having drifted since this was written), and logs one line per source plus a run summary.

**Why arXiv is fetched differently from the other eight sources.** `worker/fetchers/arxiv.js` uses `getText()` (native `fetch`/undici) while every other fetcher uses the shared `get()` (axios). This was diagnosed, not guessed: running arXiv's request alongside any of the other 8 sources via `Promise.all` reproduced an HTTP 406 from arXiv's front end on every single run; running it alone succeeded every time, with the same URL, same headers, same query. Retrying after a backoff didn't help — the failure isn't about timing, it's about sharing axios's connection pool with concurrent requests to other hosts. Moving just that one fetch to a client with an entirely separate connection pool (Node's built-in `fetch`) made the 406 disappear across repeated test runs. If a future Node/axios version changes this behavior, it's fine to revisit — but don't "simplify" it back without re-testing under full concurrency first, or the papers tab silently goes empty again.

**Scheduling.** In production this is triggered by `.github/workflows/news-fetch.yml` — GitHub's cron, not `node-cron` inside a long-lived process. `index.js`'s own `node-cron` scheduling (`CRON_SCHEDULE`/`PRUNE_SCHEDULE` env vars, `npm start`) only matters if someone chooses to run it as a persistent process instead (the Oracle Cloud path documented in `worker/README.md` as an alternative, not the live setup).

## Deployment

Frontend: Vercel, auto-deploy on push to `main`, static build (`vite build` → `dist/`), env vars set in the Vercel dashboard as build-time "Config" (not "Secret" — Vite needs to inline `VITE_*` values at build time, and Vercel excludes Secret-type vars from the build environment).

Worker: no deployment step at all — it's stateless, checked out fresh by each GitHub Actions run, and writes only to Supabase. The only setup is two repo secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

Database: Supabase, schema changes applied by hand through the SQL editor. `supabase/schema.sql` is historical — see `CLAUDE.md` for the live schema and exactly how it diverges.
