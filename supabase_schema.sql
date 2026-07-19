-- Ejecutar esto en el SQL Editor de tu proyecto de Supabase

create table if not exists knowledge (
  id bigserial primary key,
  content text not null,
  tag text,
  added_by text,
  created_at timestamptz default now(),
  search tsvector generated always as (to_tsvector('spanish', content)) stored
);

create index if not exists knowledge_search_idx on knowledge using gin(search);
