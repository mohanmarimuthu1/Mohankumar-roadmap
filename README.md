# Mohan Roadmap

Personal roadmap, habits, training and pre-arrival tracker. React + Vite on the
front, Supabase for auth and data, no backend of its own.

## Stack

| Piece    | Choice                                                   |
| -------- | -------------------------------------------------------- |
| UI       | React 18 + Vite 5, React Router                           |
| Styling  | Tailwind via the Play CDN (configured inline in `index.html`) |
| Data     | Supabase (Postgres + RLS, Google OAuth, Realtime, Edge Functions) |
| Icons    | lucide-react                                             |
| Drag     | @dnd-kit                                                 |
| Offline  | vite-plugin-pwa (autoUpdate service worker)              |
| Hosting  | Vercel                                                   |

## First run

```bash
npm install
cp .env.example .env.local     # then fill in the two values
npm run dev
```

`.env.local` needs:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon / publishable key>
```

### Supabase setup

1. **Schema** — open the SQL editor in the Supabase dashboard, paste
   [`supabase/schema.sql`](supabase/schema.sql) and run it. It creates every
   table, index and RLS policy, and is safe to re-run.
2. **Google auth** — Authentication → Providers → Google. Add your site URL and
   `http://localhost:5173` to the redirect allow-list.
3. **Feeds (optional)** — deploy the Live tab's fetcher:
   ```bash
   npx supabase functions deploy refresh-feeds --project-ref <project-ref>
   ```
   Everything else works without it; the Live tab just stays empty.

On first login the app seeds the signed-in user's account from
`src/lib/seed.json` and records the fact in `user_settings.seeded_at`. Editing
that JSON only affects accounts that have not been seeded yet — use
**Settings → Reset to defaults** to re-apply it to an existing account.

## Layout

```
src/
├── App.jsx              router, auth gate, seed gate
├── lib/
│   ├── supabase.js      client init
│   ├── hooks.js         useAuth + one hook per data domain
│   ├── seed.js          first-login seeding, reset
│   ├── backup.js        JSON export / import with id remapping
│   ├── dates.js         period keys, streaks (local timezone, never UTC)
│   └── seed.json        the default template
├── components/
│   ├── Auth.jsx         login screen
│   ├── Layout.jsx       header + top/bottom nav
│   ├── EditableList.jsx drag / rename / delete / add, gated on edit mode
│   ├── Ring.jsx         progress ring
│   ├── Toast.jsx        toast provider
│   └── ui.jsx           cards, checkbox, modals, skeletons, buttons
└── pages/               Today, Roadmap, Live, Gym, Habits, NEU, Resources, Settings

worker/                  standalone Node service that fills the Live tab
├── index.js             source registry + cron (fetch every 6h, prune daily)
├── db.js                supabase writes (service role key)
└── fetchers/            rss, huggingface, arxiv, github, hn
```

The worker is deployed separately from the app — see
[worker/README.md](worker/README.md) for setup and the Oracle Cloud + PM2
instructions.

## Data model notes

- Every user-owned table carries `user_id` and a single RLS policy: full access
  to your own rows, none to anyone else's.
- `news_articles` is shared, readable by any signed-in user, and written only by
  the edge function (service role).
- `habit_log.log_date` is a **period key**, not a timestamp: the day itself for
  daily habits, the Monday of the ISO week for weekly, the 1st of the month for
  monthly. That is what makes `unique (habit_id, log_date)` mean "done for this
  period".
- Ordering everywhere is an integer `order_idx`, rewritten on drop.
- Gym history is one row per set (`exercise_id`, `log_date`, `set_idx`), so
  "last session" is just the most recent earlier `log_date`.

## Deploying to Vercel

```bash
npm i -g vercel     # if you don't have it
vercel              # first run: link the project
vercel --prod
```

Or import the repo at [vercel.com/new](https://vercel.com/new) — the settings in
`vercel.json` (Vite preset, `dist`, SPA rewrite) are picked up automatically.

**Set the environment variables** in Project → Settings → Environment Variables,
for Production, Preview and Development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

They are inlined at build time, so redeploy after changing them.

Finally, add the deployed origin to Supabase → Authentication → URL
Configuration (Site URL, plus `https://<your-app>.vercel.app/**` under redirect
URLs), otherwise Google sign-in bounces back to localhost.

## Scripts

```bash
npm run dev       # dev server
npm run build     # production build into dist/
npm run preview   # serve the built output
node scripts/generate-icons.mjs   # regenerate the PWA icons
```
