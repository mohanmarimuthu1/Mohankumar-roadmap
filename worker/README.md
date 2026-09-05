# News worker

Background process that fills the `news_articles` table the **Live** tab reads.
Fetches nine sources every six hours, upserts them into Supabase, and prunes
stale rows once a day.

```
worker/
├── index.js              main: source registry, cron schedules, run summary
├── db.js                 supabase client, upsert, prune
├── env.js                loads worker/.env from the worker directory
├── util.js               logger, axios + retry, text/date helpers
├── fetchers/
│   ├── rss.js            5 newsletters   -> category "news"
│   ├── huggingface.js    top models      -> category "models"
│   ├── arxiv.js          cs.CL / cs.LG   -> category "papers"
│   ├── github.js         new llm repos   -> category "repos"
│   └── hn.js             HN stories      -> category "hn"
├── migration.sql         optional: metadata column + prune indexes
├── ecosystem.config.cjs  PM2
└── .env.example
```

## Sources

| Source | Category | Metadata stored |
| --- | --- | --- |
| TLDR AI, The Batch, Latent Space, Import AI, Ahead of AI | `news` | feed, author, tags |
| Hugging Face (top text-generation by downloads) | `models` | downloads, likes, pipeline tag |
| arXiv (newest cs.CL / cs.LG) | `papers` | authors, categories, PDF link |
| GitHub (`topic:llm`, created in the last 30 days, by stars) | `repos` | stars, forks, language, topics |
| Hacker News via Algolia (AI/LLM stories, >100 points) | `hn` | points, comments, author, thread link |

Each source is fetched independently. A source that fails logs one line and the
run continues, so a dead feed never costs you the other eight.

> The Batch's RSS endpoint currently answers 404 and deeplearning.ai publishes
> no replacement, so expect one `fetch failed` line per run from it. It is left
> in `fetchers/rss.js` so it recovers by itself if they bring the feed back.

## Schema compatibility

Two `news_articles` layouts exist for this project:

| | `supabase/schema.sql` | the currently deployed database |
| --- | --- | --- |
| id | `uuid` | `bigint` |
| link column | `url` | `link` |
| date column | `published_at` | `published` |
| unique on | `(category, url)` | `(link)` |

The worker does not pick one. On startup it reads the column list from
PostgREST's OpenAPI document, maps onto whatever it finds, and confirms the
conflict target by trying it — so it keeps working whichever schema you settle
on. The resolved layout is logged on the first line of every run:

```
INFO  resolved news_articles shape link=link published=published metadata=true
```

Category values are always the plural `news` / `models` / `papers` / `repos` /
`hn`, because that is what `LIVE_CATEGORIES` in `src/lib/hooks.js` filters on
and what `schema.sql` pins with a CHECK constraint.

## Local setup

```bash
cd worker
npm install
cp .env.example .env      # then fill in the two required values
```

`.env` needs:

- `SUPABASE_URL` — Dashboard → Project Settings → API → Project URL
- `SUPABASE_SERVICE_ROLE_KEY` — same page, **service_role** / secret key

The service role key is required, not a preference: `news_articles` has RLS on
with a select-only policy for signed-in users and no insert policy, so the anon
/ publishable key cannot write to it. Keep the key on the server only — never in
the Vite bundle, never committed.

[`migration.sql`](migration.sql) is optional: it adds the `metadata` column if
your table predates it, and indexes the columns the nightly prune scans. Run it
in the Supabase SQL editor if either applies.

```bash
npm run once     # single fetch pass, prints a per-source report, exits
npm run prune    # single prune pass
npm start        # long-running: fetch on startup, then on the cron schedule
```

A healthy run looks like this (`written` counts rows upserted, so a second run
over the same feed reports the same number and creates nothing new):

```
INFO  resolved news_articles shape link=link published=published metadata=true
INFO  run started trigger=startup sources=9
ERROR fetch failed source="The Batch" category=news ms=379 error="HTTP 404 from https://www.deeplearning.ai/the-batch/feed/"
INFO  fetch ok source=GitHub category=repos fetched=20 written=20 ms=606
INFO  fetch ok source="Hugging Face" category=models fetched=20 written=20 ms=695
INFO  fetch ok source=arXiv category=papers fetched=20 written=20 ms=893
...
INFO  run finished trigger=startup ok=8 failed=1 written=150 ms=908
```

### What the prune deletes

`RETENTION_DAYS` is applied two ways:

- **Articles** (`news`, `papers`, `repos`, `hn`) are deleted once their
  published date passes the cutoff.
- **Models** are deleted once their *fetched* date passes it. The Hub is sorted
  by all-time downloads, so the top 20 are long-lived releases whose
  `lastModified` is often more than a year old; pruning them by publish date
  would empty the Models tab every night. Instead a model survives as long as
  the worker keeps seeing it on the leaderboard, and ages out 30 days after it
  drops off.

## Configuration

Everything below is optional and has a sane default.

| Variable | Default | Meaning |
| --- | --- | --- |
| `GITHUB_TOKEN` | – | Raises GitHub search rate limit from 10 to 30 req/min |
| `CRON_SCHEDULE` | `0 */6 * * *` | When to fetch |
| `PRUNE_SCHEDULE` | `15 3 * * *` | When to prune |
| `TZ` | `Asia/Kolkata` | Timezone both schedules are evaluated in |
| `RETENTION_DAYS` | `30` | Prune cutoff, in days (see below) |
| `RUN_ON_STARTUP` | `true` | Fetch immediately on boot |
| `PER_SOURCE_LIMIT` | `20` | Items kept per source per run |
| `HTTP_TIMEOUT_MS` | `20000` | Per-request timeout |
| `LOG_LEVEL` | `info` | `debug` \| `info` \| `warn` \| `error` |

## Deploying to Oracle Cloud (always-on)

Oracle's Always Free tier covers this comfortably — the worker is idle for
almost all of every six-hour window.

### 1. Create the instance

Oracle Cloud console → **Compute → Instances → Create instance**:

- **Image**: Canonical Ubuntu 24.04
- **Shape**: `VM.Standard.A1.Flex` (Ampere ARM, Always Free — 1 OCPU / 6 GB is
  plenty), or `VM.Standard.E2.1.Micro` if A1 capacity is unavailable
- **Networking**: default VCP with a public IPv4 address
- **SSH keys**: upload your public key (or let Oracle generate and download one)

No ingress rules are needed. The worker only makes outbound HTTPS calls — do
not open any ports.

> Always Free A1 instances can be reclaimed if they stay *idle* (low CPU,
> network and memory for 7 days). A worker that wakes four times a day plus a
> monitoring agent is normally enough to avoid this; if you want certainty, use
> a paid-eligible account or keep `pm2 monit`-level activity on the box.

### 2. Connect and install Node 20

```bash
ssh -i ~/.ssh/your_key ubuntu@<public-ip>

sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v          # v20.x

sudo npm install -g pm2
```

Set the machine clock to the timezone your cron expressions assume:

```bash
sudo timedatectl set-timezone Asia/Kolkata
```

### 3. Get the code onto the box

```bash
cd ~
git clone https://github.com/<you>/NEU_ROADMAP.git app
cd app/worker
npm ci --omit=dev
```

(No repo access from the server? `scp -r worker ubuntu@<public-ip>:~/worker`
from your laptop instead, minus `node_modules`.)

### 4. Add credentials

```bash
cp .env.example .env
nano .env        # paste SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
chmod 600 .env   # readable only by your user
```

Verify before daemonising — this does one full pass and exits:

```bash
npm run once
```

### 5. Start under PM2 and survive reboots

```bash
pm2 start ecosystem.config.cjs
pm2 save                       # snapshot the process list
pm2 startup systemd            # prints a `sudo env PATH=... pm2 startup` line
# paste and run the command it printed, then:
pm2 save
```

`pm2 startup` installs a systemd unit, so the worker comes back after a reboot
or an Oracle host migration. Confirm with `sudo systemctl status pm2-ubuntu`.

### 6. Keep the logs from filling the disk

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 7. Day-to-day

```bash
pm2 status                  # is it up, how many restarts
pm2 logs news-worker        # tail live output
pm2 logs news-worker --lines 200 | grep "run finished"
pm2 restart news-worker     # after an .env change
pm2 reload news-worker
pm2 describe news-worker    # uptime, memory, restart count
```

Deploying a change:

```bash
cd ~/app && git pull
cd worker && npm ci --omit=dev
pm2 restart news-worker
```

### Troubleshooting

| Symptom | Cause |
| --- | --- |
| `cannot reach news_articles: ...` on startup | Wrong `SUPABASE_URL`, or the schema was never applied — run `supabase/schema.sql` |
| `new row violates row-level security policy` | You used the anon/publishable key; the worker needs `service_role` |
| `is missing a link column ... found: ...` | The table exists but has neither `url`/`link` nor `published_at`/`published` — see *Schema compatibility* |
| `HTTP 403 from api.github.com` | Search rate limit hit; set `GITHUB_TOKEN` |
| Process restarting in a loop | `pm2 logs news-worker --err` — bad `.env` is the usual cause |

## Relationship to the edge function

`supabase/functions/refresh-feeds` covers the same sources and backs the manual
**Refresh** button in the Live tab; this worker is the scheduled path. Both
upsert rather than insert, so running both is safe.

Note that the edge function writes hard-coded `url` / `published_at` columns.
Against the currently deployed database (which uses `link` / `published`) it
will fail — only the worker adapts. Worth aligning when you decide which schema
is authoritative.
