-- Optional, and safe to re-run. Run it in the Supabase SQL editor
-- (Dashboard -> SQL Editor -> New query).
--
-- The worker adapts to whichever `news_articles` layout it finds, so this is
-- only needed to (a) add the metadata column if your table predates it and
-- (b) index the column the nightly prune scans.
--
-- metadata carries the per-category details:
--   models  {"downloads": 1234567, "likes": 890, "pipeline_tag": "text-generation"}
--   papers  {"authors": ["..."], "categories": ["cs.CL"], "pdf_url": "..."}
--   repos   {"stars": 421, "forks": 33, "language": "Python"}
--   hn      {"points": 512, "comments": 210, "discussion_url": "..."}
--   news    {"feed": "TLDR AI", "author": null, "categories": []}

alter table public.news_articles
  add column if not exists metadata jsonb not null default '{}'::jsonb;

-- The date column is called published_at under supabase/schema.sql and
-- published on the currently deployed database, so index whichever is there.
do $$
declare
  date_column text;
begin
  select column_name into date_column
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'news_articles'
    and column_name in ('published_at', 'published')
  order by column_name = 'published_at' desc
  limit 1;

  if date_column is not null then
    execute format(
      'create index if not exists news_published_idx on public.news_articles (%I desc)',
      date_column
    );
  end if;
end $$;

-- The prune also scans fetched_at (for the models leaderboard).
create index if not exists news_fetched_idx
  on public.news_articles (fetched_at desc);

-- PostgREST serves from a cached introspection of the schema.
notify pgrst, 'reload schema';
