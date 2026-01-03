--------------------------------------------------------
--- projection_tables(pcaの基底とモデル写真の変換後の座標を保持する)
--------------------------------------------------------

create table if not exists contest_projection_basis (
  id bigserial primary key,
  contest_id bigint not null,
  model_version varchar(64) not null,
  method varchar(16) not null,          -- 'PCA'
  dim int not null,                     -- 2 or 3
  mean float4[] not null,               -- length=512
  components float4[] not null,         -- length=512*dim (column-major or row-major is fixed by app)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(contest_id, model_version, method, dim)
);

create table if not exists contest_model_photo_projection (
  contest_id bigint not null,
  model_version varchar(64) not null,
  model_photo_id bigint not null,
  x float4 not null,
  y float4 not null,
  z float4,                             -- null when dim=2
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(contest_id, model_version, model_photo_id)
);

create index if not exists idx_cmp_contest
  on contest_model_photo_projection(contest_id);