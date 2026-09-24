# CLAUDE.md — Mohan Roadmap App Context

Claude Code auto-loads this every session in this repo.

---

## GOAL

Build and maintain a personal command-center web+PWA app that tracks Mohan's full journey from India year → NEU MS → AI Engineer job at big tech / frontier lab.

**App does:**
- Roadmap tracking (7 phases, week-by-week tasks, progress %)
- Daily/weekly/monthly habits + streaks
- Gym program (PPL split, sets/reps/weights logged, full edit support)
- NEU prep checklist (visa, housing, TA/RA, co-op, groceries, networking)
- Live AI feed (news, models, papers, repos, HN), scheduled every 30 min
- Resources library (learning links)
- Full customization (add/edit/delete/reorder everything from UI)

---

## RULES FOR CLAUDE CODE IN THIS PROJECT

**Process, every session:**
1. **Always run, test, and evaluate before calling anything done.** `npm run build` at minimum; start the dev server and check the console for UI changes; run the worker locally (`npm run once` in `worker/`) for anything touching fetch logic. If something genuinely can't be verified in this environment (e.g. a login-gated browser flow with no browser tool available), say so plainly instead of claiming it works.
2. **Commit only in Mohan's name, never as a contributor or co-author.** If a commit in this repo's history was ever made with a co-author trailer or under a different identity, that's a bug — fix the log, don't let it stand. See [[no-claude-coauthor-trailer]].
3. **No AI slop.** No filler prose in commit messages, docs, or UI copy. No generic template chrome (tracked-out ALL-CAPS eyebrow labels on every field, reflexive middle-dot-joined meta strings, identical rounded cards with the same shadow regardless of hierarchy) — see the frontend-design skill's list of tells and check new UI against it before shipping.
4. **No emojis anywhere** — code, commit messages, docs, UI strings.
5. **Keep the code human.** No AI-flavored over-engineering: no abstractions for hypothetical future cases, no comments explaining what the code obviously does, no defensive validation for states that can't occur. Comments only where they carry a non-obvious *why*.
6. **Update the README when behavior changes.** It's the entry point for anyone (including future Mohan) picking the repo back up.
7. **Match existing DB schema exactly** — never suggest table/column renames. See the schema table below.
8. **Ask before assuming schema drift** — don't invent tables/columns.
9. **Never commit `.env`, `.env.local`, or a service_role key.** Double-check `.gitignore` before any commit.
10. **All user-data queries go through the RLS-respecting anon client.** Service role key lives only in `worker/.env` (local testing) and the `SUPABASE_SERVICE_ROLE_KEY` GitHub Actions secret — never in frontend code.
11. **Preserve the single-amber-accent design.** No new colors, no gradients, ever.
12. **Every new list feature wires into `EditableList.jsx`.** If a list item needs more than a rename (multiple fields), follow the pattern already used for Resources and Gym: `renameInline={false}` plus a pencil button in `renderItem` that opens a small modal (see `ResourceModal` / `ExerciseModal` / `DayModal`) — don't invent a third pattern.
13. **Mobile-first** — check 375px width before calling a UI change done.
14. **Explain nontrivial architectural tradeoffs in 1-2 sentences**, not a lecture — Mohan is actively learning MLOps/cloud and reads these as real learning.
15. **Short, direct, no fluff. Bullets/tables over prose. Minimize tokens. Address him as "Mohan."**

---

## DEADLINES

| Milestone | Date |
|---|---|
| App v1 live | Shipped |
| Blog post + LinkedIn | week of 2026-09-24 |
| GitHub repo public + pinned | week of 2026-09-24 |
| Rotate exposed service_role key (dashboard only — never hit git, see below) | week of 2026-09-24 |
| Feature v2 (after 2 weeks of daily use) | ~2026-10-08 |
| India year phase 4 (MLOps + Cloud) | roadmap weeks 29-38 |
| F1 visa re-application (Chennai consulate) | Mar-May 2027 |
| NEU MS start (Khoury, MS AI, admitted, deferred) | Fall 2027 |
| Summer 2028 internship | May-Aug 2028 |
| Full-time offer signed | Spring 2029 |
| Start AI Engineer role | Jun 2029 |

## TARGET ROLE / PROGRAM

**Immediate (India year):** AI/ML/NLP roles in India

**Grad program:** Northeastern University, Khoury College — MS AI (Fall 2027, admitted, deferred)

**End-state role:** AI Engineer at MAANG / frontier lab (Anthropic, OpenAI, Cohere) or top AI startup

**Long-term (~10 yr abroad):** Max savings → house in India → return to Coimbatore

The roadmap's 7 phases already track this timeline — Phase 4 (MLOps + Cloud) lines up with Mohan's self-identified weak area at weeks 29-38. Don't restructure phases without a specific new request; see [[mohan-roadmap-goal-timeline]].

---

## USER PROFILE (relevant to app)

- Mohan, Coimbatore, India
- B.Tech AI & Data Science, 8.2 CGPA
- Stack: Python, PyTorch, TensorFlow, NLP, Qiskit, PennyLane
- Niche: LLM hallucination detection + eval (2 IEEE papers)
- Family runs precision/lathe manufacturing (potential flagship project)
- Weak area being addressed: MLOps + Cloud (Phase 4 of roadmap)

---

## STACK

```
Frontend    React 18 + Vite + Tailwind (CDN, no PostCSS — deliberate, see plan.md)
UI Libs     lucide-react, @dnd-kit/core
Auth        Supabase Google OAuth
Database    Supabase Postgres + Row Level Security
Deploy      Vercel (auto-deploy from git push)
Worker      Node 22 in worker/, scheduled by GitHub Actions every 30 min
            (.github/workflows/news-fetch.yml) — no server to maintain
PWA         vite-plugin-pwa (installable on iOS/Android/desktop)
```

All free tier. $0 running cost.

---

## LIVE DB SCHEMA (source of truth — matches the deployed app)

| Table | Notes |
|---|---|
| `phases` | id, user_id, order_idx, code, name, weeks, tag, created_at |
| `task_groups` | id, phase_id, user_id, order_idx, title |
| `tasks` | id, group_id, user_id, order_idx, **label** (not title), done, done_at, notes |
| `habits` | id, user_id, type (daily/weekly/monthly), order_idx, label |
| `habit_log` | id, user_id, habit_id, log_date, done |
| `gym_days` | id, user_id, order_idx, name, focus — **prefix present** |
| `exercises` | id, day_id, user_id, order_idx, name, sets, reps, rest_seconds, notes — **no gym_ prefix** |
| `gym_logs` | id, user_id, exercise_id, log_date, weight_kg, reps_completed, set_number |
| `resources` | id, user_id, category, name, url, order_idx |
| `neu_sections` | id, user_id, order_idx, title |
| `neu_items` | id, section_id, user_id, order_idx, text, done |
| `rules` | id, user_id, order_idx, text |
| `news_articles` | id, title, link, source, summary, published, category, metadata (jsonb), fetched_at — shared, public read |
| `user_settings` | user_id, seeded_at, edit_mode, preferences (jsonb) |

Naming is inconsistent (`gym_days` prefix but `exercises` no prefix) and that's final — code conforms to the DB, not the other way round. `supabase/schema.sql` is historical/wrong; do not run it, do not treat it as source of truth. RLS: every user table has an `own_data` policy (`auth.uid() = user_id`); `news_articles` is public read, written only by the worker's service role key.

No unique constraint on `habit_log(habit_id, log_date)` or `gym_logs(exercise_id, log_date, set_number)` — writes are delete-then-insert, not upsert.

---

## ENV VARS

### Frontend (Vercel, `.env.local` for local dev)

Must be type **Config** not **Secret** in Vercel — Vite bundles `VITE_*` at build time, Secrets are excluded.

```
VITE_SUPABASE_URL=https://wctsgrjnymrllneccpmy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`VITE_SUPABASE_URL` is the base URL only — no `/rest/v1/`, no trailing slash.

### Worker (local `.env`, or GitHub Actions repo secrets — same two names)

```
SUPABASE_URL=https://wctsgrjnymrllneccpmy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

The key that was pasted into an earlier chat session is considered exposed and needs rotating in the Supabase dashboard (Settings → API → Reset), then updating in the GitHub Actions secret. Verified 2026-09-24: it was never committed to git, so this is a dashboard-only action Mohan has to do himself.

---

## LIVE DATA SOURCES (worker fetches every 30 min via GitHub Actions)

| Source | Category | Endpoint |
|---|---|---|
| TLDR AI | news | https://tldr.tech/api/rss/ai |
| Latent Space | news | https://www.latent.space/feed |
| Import AI | news | https://jack-clark.net/feed/ |
| Ahead of AI | news | https://magazine.sebastianraschka.com/feed |
| The Batch | news | RSS is dead, ignore its error line |
| HuggingFace | models | /api/models?sort=downloads&limit=20&filter=text-generation |
| arXiv | papers | cs.CL + cs.LG, sortBy submittedDate — fetched via native `fetch`, not axios (see worker/README.md) |
| GitHub | repos | /search/repositories?q=topic:llm+created:>{last30days} |
| HN Algolia | hn | optionalWords=AI,LLM (NOT `AI OR LLM` — no OR operator) |

Full detail, including why arXiv uses a different HTTP client than everything else: `worker/README.md`.

---

## FILE STRUCTURE

```
Neu_roadmap/
├── src/
│   ├── App.jsx                   router, auth gate, seed gate (inline, not a separate file)
│   ├── main.jsx
│   ├── index.css
│   ├── lib/
│   │   ├── supabase.js           client init
│   │   ├── hooks.js              useAuth, useEditMode, one hook per data domain
│   │   ├── seed.js               first-login seeding, reset
│   │   ├── backup.js             JSON export / import with id remapping
│   │   ├── dates.js              period keys, streaks (local timezone, never UTC)
│   │   ├── nav.js                nav item config (routes, labels, icons)
│   │   ├── theme.jsx             ThemeProvider, light/dark/system
│   │   └── seed.json             the default template
│   ├── components/
│   │   ├── Auth.jsx              login screen
│   │   ├── Layout.jsx            page shell
│   │   ├── NavBar.jsx            desktop top nav
│   │   ├── TabBar.jsx            mobile bottom nav
│   │   ├── ThemeToggle.jsx
│   │   ├── EditableList.jsx      drag / rename / delete / add, gated on edit mode
│   │   ├── Ring.jsx              progress ring
│   │   ├── Toast.jsx             toast provider
│   │   └── ui.jsx                cards, checkbox, modals, skeletons, buttons
│   └── pages/
│       ├── Today.jsx
│       ├── Roadmap.jsx
│       ├── Live.jsx
│       ├── Gym.jsx
│       ├── Habits.jsx
│       ├── NEU.jsx
│       ├── Resources.jsx
│       └── Settings.jsx
├── supabase/
│   └── schema.sql                historical, does not match live DB
├── worker/                        news fetcher, run by GitHub Actions
│   ├── index.js
│   ├── db.js
│   └── fetchers/
├── .github/workflows/
│   └── news-fetch.yml
└── package.json
```

---

## KNOWN ISSUES / BACKLOG

**Done this session (2026-09-24):**
- Fixed arXiv fetch (was 406ing whenever it ran concurrently with the other 8 sources — root cause and fix in `worker/README.md`)
- Moved the news worker from documented-but-unprovisioned Oracle Cloud to GitHub Actions (`.github/workflows/news-fetch.yml`, every 30 min)
- Removed the Live tab's dependency on the broken/undeployed `refresh-feeds` edge function
- Added a real edit feature to Gym (sets/reps/rest/notes for exercises, name/focus for training days) via `ExerciseModal`/`DayModal`
- Softened the modal form-field labels (Gym, Resources) from shouting tracked-uppercase to sentence case — the one real generic-template tell found in a full UI audit; everything else (amber accent, ink ramp, `SectionTitle` caps) was judged deliberate and left alone
- Removed two literal emoji from `seed.json`'s phase tags (affects future seeds/resets only — see backlog for the one-line SQL fix for the already-seeded account)

**Still open, needs Mohan:**
- Rotate `SUPABASE_SERVICE_ROLE_KEY` in the Supabase dashboard, then update the GitHub Actions secret of the same name
- Add the two repo secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) if not already added, so `news-fetch.yml` can run
- Already-seeded phases 03/04 still carry the old emoji tags in the live DB — one-line SQL fix in `process.md`

**Nice to have, not scheduled:**
- Replace the dead "The Batch" RSS feed with an alternate source
- PWA install-prompt UI on first visit
- Push notifications for daily habit reminders
- Gym progression graphs (weight over time per exercise)
- Calendar view for task deadlines
- Move Tailwind from CDN to PostCSS (ask first — bigger structural change than it looks)

**Deferred indefinitely:** a Capacitor app-store wrapper.

---

## COMMANDS QUICK REF

```bash
npm run dev              # local at localhost:5173
npm run build             # production build
git commit --allow-empty -m "trigger rebuild" && git push   # force Vercel rebuild

cd worker && npm run once   # test the news fetch locally
cd worker && npm run prune  # test the prune locally
```

**Supabase (SQL editor):**
```sql
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema='public' ORDER BY table_name, ordinal_position;
```
