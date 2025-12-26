--------------------------------------------------------
--- photo_embeddings(モデル写真、投稿写真の特徴量を保存する)
--------------------------------------------------------

-- pgvector 拡張
create extension if not exists vector;

create table photo_embeddings (
  id bigserial primary key,
  contest_id bigint not null,
  photo_type varchar(16) not null,      -- 'MODEL' | 'USER'
  photo_id bigint not null,             -- contest_model_photos.id or user_photos.id
  storage_key varchar(1024) not null,   -- S3 key もしくは local key
  model_version varchar(64) not null,
  status varchar(16) not null,          -- 'PENDING' | 'READY' | 'FAILED'
  embedding vector(512),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(photo_type, photo_id, model_version)
);

create index idx_photo_embeddings_contest on photo_embeddings(contest_id);
create index idx_photo_embeddings_status on photo_embeddings(status);

create index if not exists idx_pe_model_hnsw_cosine
on photo_embeddings using hnsw (embedding vector_cosine_ops)
where photo_type = 'MODEL' and status = 'READY';