# Process

What `plan.md` asked for, what actually got built, how it works, and what's left. Read `plan.md` first for the original brief — this file tracks reality against it.

## Status: all 8 tabs shipped and live

| Tab | Status | Notes |
|---|---|---|
| Today | Done | progress ring, streak, current phase card, daily habits, top-5 news, weekly habits |
| Roadmap | Done | 7 collapsible phases, task groups, tasks, per-phase progress, notes per task |
| Live | Done | News/Models/Papers/Repos/HN sub-tabs, filled every 30 min by `worker/` via GitHub Actions |
| Gym | Done | day cards, exercises, set-by-set logging, week view, **full edit (this session)** |
| Habits | Done | daily/weekly/monthly sections, Rules list |
| NEU | Done | sections as cards, per-section checklists and progress |
| Resources | Done | grouped by category, modal-based add/edit |
| Settings | Done | edit mode toggle, export/import JSON, reset to defaults, sign out |

Also done, beyond the tab list: Google OAuth + protected routes, first-login seeding from `seed.json`, edit mode (drag/rename/delete/add on every list), PWA manifest + service worker, light/dark/system theming, desktop nav bar + mobile tab bar, per-page headers.

## Deviations from `plan.md`

- **`index.css` has no Tailwind imports.** The spec asked for both Tailwind imports in `index.css` *and* the CDN build with no PostCSS — those conflict. The CDN won; `index.css` holds base styles, safe-area helpers, skeleton/toast keyframes, focus rings.
- **Resources uses a modal, not inline rename.** A resource needs name + URL + category; inline text editing can't express three fields. `EditableList` is passed `renameInline={false}` there, same pattern now used for Gym exercises and training days.
- **Export format is raw table rows, not seed-shaped JSON.** Import regenerates ids and rewrites foreign keys through a mapping, so completion state, notes, and gym history survive a round trip.
- **Habit/gym-log period keys, not timestamps.** `habit_log.log_date` is the day / Monday-of-week / 1st-of-month depending on cadence — see `src/lib/dates.js`. No unique DB constraint backs this, so writes are delete-then-insert.
- **The live database schema differs from `supabase/schema.sql`.** `tasks.label` not `title`, `gym_logs.weight_kg`/`reps_completed`/`set_number` not `weight`/`reps`/`set_idx`, every id is `bigint` not `uuid`, and more — see `CLAUDE.md`'s schema table. Code was conformed to the live DB; `schema.sql` is left as historical, not a target to re-apply.

## How it's done

**Data access.** Every page calls a hook in `src/lib/hooks.js` (`useRoadmap`, `useGym`, `useHabits`, etc.). Each hook owns its Supabase queries, RLS means every query is implicitly scoped to `auth.uid()`, and a `refresh()` function is handed back to pages so mutations can trigger a refetch rather than guessing at optimistic state.

**Edit mode.** A single `EditModeProvider`/`useEditMode()` toggle (Settings tab) gates all editing app-wide. `EditableList.jsx` renders drag-handle + delete + (optionally) an inline rename pencil when edit mode is on, and nothing but the plain read view when it's off. For anything needing more than a single-field rename — Resources, Gym exercises, Gym training days — the list passes `renameInline={false}` and the page supplies its own pencil button plus a small modal (`ResourceModal`, `ExerciseModal`, `DayModal`) that PATCHes the full row.

**Gym edit (added this session).** Previously only an exercise's *name* was editable (via the same inline rename every other list gets); sets, reps, rest seconds, and form notes had no edit path once created. `ExerciseModal` and `DayModal` in `src/pages/Gym.jsx` now cover the full row for exercises (name/sets/reps/rest_seconds/notes) and training days (name/focus), following the modal-edit pattern already established by Resources rather than inventing a new one.

**News feed.** `worker/` is a plain Node script (`index.js --once`), not a service. `.github/workflows/news-fetch.yml` checks it out and runs it every 30 minutes on GitHub's own runners, using two repo secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) — no server to keep alive. It fetches 9 sources in parallel (`Promise.all`), upserts into `news_articles`, and a separate daily cron entry runs the prune pass. `worker/README.md` has the full source table, and the reasoning behind the one non-obvious fix from this session (below).

**Root cause found and fixed this session: the Papers tab (arXiv) was silently failing every run.** Reproduced consistently: arXiv's API answered `406 Not Acceptable` whenever fetched concurrently with the worker's other 8 sources via `Promise.all` — always, every time — and succeeded every time when fetched alone. This pointed to axios's shared Node `http`/`https` connection pool, not arXiv itself or the query. Confirmed by switching just the arXiv fetch to Node's native `fetch` (undici, a separate connection pool from axios): the 406 stopped, reproducibly, across repeated runs. `worker/fetchers/arxiv.js` now uses a small `getText()` helper (native `fetch` + the same retry/backoff behavior as the shared `get()`) instead of the axios instance every other fetcher uses. See `worker/util.js` and `worker/README.md` for the full note — don't move it back to axios without re-testing under full concurrency.

**Manual refresh button (Live tab).** Previously called a Supabase edge function (`refresh-feeds`) that writes the wrong column names against the live schema and was never deployed — every click quietly failed and showed an error toast. It now just re-reads `news_articles` from the DB (the actual fetching is the scheduled worker's job, not something the browser can trigger on demand without exposing the service role key).

**Frontend polish pass.** Audited every page and `components/ui.jsx` against generic "AI-template" tells (tracked-out uppercase eyebrow labels used as a default, reflexive middle-dot meta strings, samey cards). Most of what's here is Mohan's own deliberate, previously-shipped design (the amber accent, the ink ramp, `SectionTitle`'s tracked caps as a consistent structural signal for "this is a label, not content") — left alone on purpose, not missed. The one real, low-risk fix: every modal form field (`Field` in `Gym.jsx` and `Resources.jsx`) had its label shouting in tracked uppercase — "NAME", "URL", "CATEGORY" — for no reason; switched to a quiet sentence-case label. No color, font, or layout changes. Also removed two literal emoji (⭐, 🔥) baked into `seed.json`'s phase tags — see below, this only fixes future seeds/resets, not Mohan's already-seeded account.

## Verification done this session

- `worker`: ran `node index.js --once` repeatedly, before and after the arXiv fix, confirmed 8/9 sources succeed consistently (9th, "The Batch," is a dead feed with no replacement — expected, logged, harmless).
- `npm run build` (frontend): passes clean after the Live.jsx and Gym.jsx changes.
- `npm run dev`: boots without console errors (checked via HTTP request; no in-browser interactive check was possible this session — no browser tool was available, and the app is auth-gated behind Google OAuth, so the Gym edit modals were verified by reading the code paths and confirming the build succeeds, not by clicking through them in a browser. Mohan should click through Gym → open a day → edit an exercise, and Live → hit reload, before trusting this fully).
- Checked full git history for any committed `.env` or service-role key: clean, confirming the exposed-key concern is a chat-history issue, not a repo issue.

## Next steps

**Needs Mohan (can't be done from here):**
1. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as repo secrets (Settings → Secrets and variables → Actions) so `news-fetch.yml` can actually run — it will fail every run until these exist.
2. Rotate `SUPABASE_SERVICE_ROLE_KEY` in the Supabase dashboard (it was shared in an earlier chat session), then update the GitHub Actions secret to match.
3. Click through the new Gym edit feature and the Live reload button in a real browser at least once.
4. Confirm the GitHub Actions "News feed" workflow actually ran (Actions tab) within 30 minutes of secrets being added, or trigger it manually via "Run workflow."
5. Your already-seeded phases 03 and 04 still have the ⭐/🔥 tags in the live database (`seed.json` only affects new logins and "Reset to defaults"). One-line fix if you want them gone now: `update phases set tag = '' where code in ('03','04') and user_id = auth.uid();` in the Supabase SQL editor.

**Backlog, not yet started (see `CLAUDE.md` for the full list):** replace the dead "The Batch" feed, PWA install prompt, push notifications for habits, gym progression graphs, calendar view for task deadlines, Tailwind CDN → PostCSS migration (bigger change, ask first).
