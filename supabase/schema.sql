-- Mycelium database schema. Run this in the Supabase SQL editor on a fresh project.
-- Enables pgvector, creates the 4 tables, the cosine-similarity search RPC, and realtime.

create extension if not exists vector;

create table skills (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null default 'other',
  framework text,
  content text not null,
  success_check text not null,
  embedding vector(384),                          -- Supabase/gte-small, 384 dims (local model)
  trust_score double precision not null default 0.5,
  success_count int not null default 0,
  failure_count int not null default 0,
  tokens_to_create int not null default 10000,
  proven_envs jsonb not null default '[]'::jsonb,
  visibility text not null default 'public',      -- 'public' | 'private'
  owner_id text,                                  -- publisher; null for seeded/public-origin skills
  created_at timestamptz not null default now()
);
create index on skills (visibility);
create index on skills (owner_id);

-- per-owner sharing toggle (the /mycelium on|off state)
create table settings (
  owner_id text primary key,
  sharing_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table trails (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  task_type text,
  approach text,
  success boolean not null,
  environment jsonb not null default '{}'::jsonb,
  tokens_used int not null default 0,
  tokens_saved int not null default 0,
  timestamp timestamptz not null default now()
);

create table stats (
  id int primary key default 1,
  total_tokens_saved bigint not null default 0,
  total_energy_wh double precision not null default 0,
  total_water_ml double precision not null default 0,
  total_co2_g double precision not null default 0,
  total_reuses int not null default 0,
  updated_at timestamptz not null default now()
);
insert into stats (id) values (1) on conflict do nothing;

-- pgvector cosine-similarity search RPC used by search_skills + /api/search.
-- Privacy rule: returns PUBLIC skills + the requester's OWN private skills. Never another owner's private skill.
-- requester_id = null (e.g. the public dashboard) => public skills only.
create or replace function match_skills(query_embedding vector(384), requester_id text default null, match_count int default 8)
returns table (id uuid, name text, description text, category text, trust_score double precision,
               proven_envs jsonb, tokens_to_create int, visibility text, owner_id text, similarity double precision)
language sql stable as $$
  select s.id, s.name, s.description, s.category, s.trust_score, s.proven_envs, s.tokens_to_create,
         s.visibility, s.owner_id,
         1 - (s.embedding <=> query_embedding) as similarity
  from skills s
  where s.embedding is not null
    and (s.visibility = 'public' or s.owner_id = requester_id)
  order by s.embedding <=> query_embedding
  limit match_count;
$$;

-- enable realtime (the browser dashboard subscribes). settings optional (toggle indicator).
alter publication supabase_realtime add table skills, trails, stats, settings;
