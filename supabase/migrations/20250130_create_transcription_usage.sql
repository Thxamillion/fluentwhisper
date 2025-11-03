-- Create transcription usage tracking table
create table public.transcription_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,

  -- Transcription details
  provider text not null check (provider in ('openai', 'assemblyai', 'google')),
  model text not null,
  duration_seconds decimal(10, 2) not null,

  -- Cost tracking
  cost_usd decimal(10, 6) not null,

  -- Metadata
  language text,
  audio_size_bytes bigint,
  success boolean not null default true,
  error_message text,

  -- Timestamps
  created_at timestamptz not null default now()
);

-- Indexes for efficient queries
create index idx_transcription_usage_user_id on public.transcription_usage(user_id);
create index idx_transcription_usage_created_at on public.transcription_usage(created_at);
create index idx_transcription_usage_provider on public.transcription_usage(provider);

-- Enable Row Level Security
alter table public.transcription_usage enable row level security;

-- Users can view their own usage
create policy "Users can view their own transcription usage"
  on public.transcription_usage
  for select
  using (auth.uid() = user_id);

-- Service role can insert usage (Edge Function uses service role)
create policy "Service role can insert transcription usage"
  on public.transcription_usage
  for insert
  with check (true);

-- Optional: Create a view for monthly usage summary
create or replace view public.user_monthly_usage as
select
  user_id,
  date_trunc('month', created_at) as month,
  provider,
  count(*) as transcription_count,
  sum(duration_seconds) as total_duration_seconds,
  sum(cost_usd) as total_cost_usd,
  avg(duration_seconds) as avg_duration_seconds
from public.transcription_usage
where success = true
group by user_id, date_trunc('month', created_at), provider;

-- RLS for the view
alter view public.user_monthly_usage set (security_invoker = on);
