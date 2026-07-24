-- 0003_mlb_players.sql
-- Canonical MLB players, roster memberships (temporal by observed_date), and
-- recent player game logs. Provider ids stay separate from canonical UUIDs.

alter table mlb_games
  add column away_probable_pitcher_mlb_id integer,
  add column home_probable_pitcher_mlb_id integer;

create table mlb_players (
  id                  uuid primary key default gen_random_uuid(),
  mlb_player_id       integer not null unique,
  full_name           text not null,
  first_name          text,
  last_name           text,
  primary_position    text,           -- abbreviation, e.g. RF / P / TWP
  position_type       text,           -- Pitcher / Outfielder / Two-Way Player / ...
  role                text not null default 'unknown',
  bats                text,           -- L / R / S
  throws              text,           -- L / R
  birth_date          date,
  current_team_id     uuid references mlb_teams(id),
  active              boolean,
  provider_updated_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint mlb_players_role_check
    check (role in ('hitter', 'pitcher', 'two_way', 'unknown'))
);
create trigger mlb_players_set_updated_at
  before update on mlb_players for each row execute function set_updated_at();

-- Roster membership as an observation on a date (never overwrite history for a
-- different date -> no backtesting leakage).
create table mlb_roster_memberships (
  id                  uuid primary key default gen_random_uuid(),
  team_id             uuid not null references mlb_teams(id) on delete cascade,
  player_id           uuid not null references mlb_players(id) on delete cascade,
  roster_type         text not null,
  status_code         text,
  status_description  text,
  observed_date       date not null,
  created_at          timestamptz not null default now(),
  constraint mlb_roster_memberships_unique
    unique (team_id, player_id, roster_type, observed_date)
);
create index mlb_roster_memberships_team_idx on mlb_roster_memberships (team_id, observed_date);
create index mlb_roster_memberships_player_idx on mlb_roster_memberships (player_id);

-- Recent player game logs. `stat` is the real, validated stat object (jsonb) for
-- the group, so hitter/pitcher fields are never forced onto each other.
create table mlb_player_game_logs (
  id            uuid primary key default gen_random_uuid(),
  player_id     uuid not null references mlb_players(id) on delete cascade,
  stat_group    text not null,        -- hitting | pitching
  game_date     date not null,
  mlb_game_pk   integer,
  opponent_name text,
  is_home       boolean,
  season        integer,
  stat          jsonb not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint mlb_player_game_logs_group_check
    check (stat_group in ('hitting', 'pitching')),
  constraint mlb_player_game_logs_unique
    unique (player_id, stat_group, game_date, mlb_game_pk)
);
create index mlb_player_game_logs_player_idx
  on mlb_player_game_logs (player_id, stat_group, game_date desc);
create trigger mlb_player_game_logs_set_updated_at
  before update on mlb_player_game_logs for each row execute function set_updated_at();
