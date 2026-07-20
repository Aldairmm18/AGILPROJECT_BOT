-- ================================================================
-- SCHEMA SEMILLERO AGIL PROJECT — Ejecutar en Supabase SQL Editor
-- ================================================================

-- 1. Tabla principal de conocimiento (Bot + Web leen de aquí)
create table if not exists knowledge (
  id          bigserial primary key,
  content     text not null,
  tag         text,
  added_by    text,
  modulo      text,                           -- Frontend | Backend | Ágil | Git
  created_at  timestamptz default now(),
  search      tsvector generated always as (to_tsvector('spanish', content)) stored
);

create index if not exists knowledge_search_idx on knowledge using gin(search);

-- Política RLS: lectura pública (la web y el bot pueden leer sin auth)
alter table knowledge enable row level security;
create policy "lectura_publica" on knowledge for select using (true);
create policy "escritura_service_role" on knowledge for insert with check (true);
create policy "borrado_service_role" on knowledge for delete using (true);

-- ----------------------------------------------------------------

-- 2. Tabla de propuestas enviadas desde la web (Proponer.jsx)
create table if not exists proposals (
  id          bigserial primary key,
  nombre      text not null,
  tipo        text not null,                  -- Resumen | Quiz | Fecha | Proyecto
  modulo      text not null,                  -- Frontend | Backend | Ágil | Git
  contenido   text not null,
  estado      text not null default 'pendiente', -- pendiente | aprobado | rechazado
  aprobado_by text,                           -- username del monitor que aprobó por Telegram
  created_at  timestamptz default now()
);

-- Política RLS: inserción pública + lectura pública
alter table proposals enable row level security;
create policy "insercion_publica_proposals" on proposals for insert with check (true);
create policy "lectura_publica_proposals"   on proposals for select using (true);
create policy "update_proposals"            on proposals for update using (true);
