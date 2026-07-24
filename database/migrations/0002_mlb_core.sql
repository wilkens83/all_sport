-- 0002_mlb_core.sql
-- Minimal canonical MLB entities for Slice 1 (real games on /mlb).
-- Provider external IDs (mlb_team_id, mlb_venue_id, mlb_game_pk) are stored as
-- unique keys but are NOT the canonical internal IDs (which stay UUID).
-- set_updated_at() is defined in 0001.

create table venues (
  id            uuid primary key default gen_random_uuid(),
  mlb_venue_id  integer not null unique,
  name          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger venues_set_updated_at
  before update on venues for each row execute function set_updated_at();

create table mlb_teams (
  id            uuid primary key default gen_random_uuid(),
  mlb_team_id   integer not null unique,
  name          text not null,
  abbreviation  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger mlb_teams_set_updated_at
  before update on mlb_teams for each row execute function set_updated_at();

create table mlb_games (
  id                  uuid primary key default gen_random_uuid(),
  mlb_game_pk         integer not null unique,
  season              integer,
  game_date           date not null,            -- officialDate (source local date)
  game_datetime       timestamptz,              -- gameDate (UTC start)
  abstract_game_state text,                     -- Preview / Live / Final
  detailed_state      text,                     -- Scheduled / In Progress / Final / ...
  coded_game_state    text,
  away_team_id        uuid not null references mlb_teams(id),
  home_team_id        uuid not null references mlb_teams(id),
  venue_id            uuid references venues(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index mlb_games_date_idx on mlb_games (game_date);
create index mlb_games_datetime_idx on mlb_games (game_datetime);
create trigger mlb_games_set_updated_at
  before update on mlb_games for each row execute function set_updated_at();
