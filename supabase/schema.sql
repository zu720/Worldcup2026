-- ═══════════════════════════════════════════════════════════
-- FIFA W杯 2026 予想ゲーム - Supabase Schema
-- ═══════════════════════════════════════════════════════════
-- 使い方: Supabase Dashboard → SQL Editor → このファイルを貼り付けて Run
-- ═══════════════════════════════════════════════════════════

-- ── Predictions テーブル ──
-- 各プレイヤーの予想（名前をキーにする、ログイン無し）
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,                  -- プレイヤー名
  gl jsonb not null default '{}'::jsonb,      -- { A: ["メキシコ","韓国"], B: [...], ... }
  des jsonb not null default '{}'::jsonb,     -- { A: "日本", B: "フランス", C: "スペイン" }
  tp jsonb not null default '{}'::jsonb,      -- 3位通過予想 { "3(A/B/C/D/F)": "韓国", ... }
  locked boolean default false,               -- 編集ロック（投票締切後true）
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 更新日時を自動反映
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_pred_updated on predictions;
create trigger trg_pred_updated before update on predictions
  for each row execute function set_updated_at();

-- ── Tournament テーブル ──
-- 実際の試合結果（1行のみ、id='wc2026'）
create table if not exists tournament (
  id text primary key default 'wc2026',
  phase text default 'pre',                   -- pre|groups|r32|r16|qf|sf|final|done
  groups jsonb not null default '{}'::jsonb,  -- 星取表
  ko jsonb not null default '{
    "r32":[],"r16":[],"qf":[],"sf":[],"final":[],"champ":null,"third":null
  }'::jsonb,
  vote_locked boolean default false,          -- 投票ロック（全員編集不可）
  last_api_update timestamptz,
  updated_at timestamptz default now()
);

drop trigger if exists trg_tour_updated on tournament;
create trigger trg_tour_updated before update on tournament
  for each row execute function set_updated_at();

-- ── 初期行 ──
insert into tournament (id) values ('wc2026') on conflict do nothing;

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- anon keyで誰でも読み書きできるが、簡易で十分（内輪用途）
-- ═══════════════════════════════════════════════════════════

alter table predictions enable row level security;
alter table tournament enable row level security;

-- 全員読める
drop policy if exists "read predictions" on predictions;
create policy "read predictions" on predictions for select using (true);

drop policy if exists "read tournament" on tournament;
create policy "read tournament" on tournament for select using (true);

-- 誰でも書ける（内輪用、ロック中の予想変更はアプリ側でガード）
drop policy if exists "write predictions" on predictions;
create policy "write predictions" on predictions for all using (true) with check (true);

drop policy if exists "write tournament" on tournament;
create policy "write tournament" on tournament for all using (true) with check (true);

-- ═══════════════════════════════════════════════════════════
-- Realtime 配信の有効化
-- （Dashboard → Database → Replication から手動で
--   predictions と tournament を enable してもOK）
-- ═══════════════════════════════════════════════════════════

-- 既に登録済みでもエラーにならないように
do $$
begin
  begin alter publication supabase_realtime add table predictions; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table tournament; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table visits; exception when duplicate_object then null; end;
end $$;

-- ═══════════════════════════════════════════════════════════
-- アクセスログ
-- 管理者画面で総アクセス・今日のアクセス・直近活動を確認するためだけの軽量ログ
-- ═══════════════════════════════════════════════════════════

create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  name text,                                  -- 入った時の表示名（未入力ならnull）
  path text,
  ua text,                                    -- User-Agent（簡易デバイス区別用）
  created_at timestamptz default now()
);

create index if not exists visits_created_at_idx on visits (created_at desc);

alter table visits enable row level security;

drop policy if exists "insert visits" on visits;
create policy "insert visits" on visits for insert with check (true);

drop policy if exists "read visits" on visits;
create policy "read visits" on visits for select using (true);
