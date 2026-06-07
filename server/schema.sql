-- Run this in the Supabase SQL editor to create the workflows table.

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  description text,
  definition jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Phòng trường hợp bảng đã tồn tại từ phiên bản schema cũ (chưa có cột "code"):
alter table public.workflows add column if not exists code text;

create index if not exists workflows_updated_at_idx on public.workflows (updated_at desc);
create unique index if not exists workflows_code_key on public.workflows (code) where code is not null;

-- ── Row Level Security ──────────────────────────────────────────────────────
-- BẮT BUỘC khi gọi PostgREST trực tiếp từ trình duyệt bằng anon/public key:
-- nếu không bật RLS, anon key (lộ trong mã nguồn client) có toàn quyền đọc/ghi/xoá bảng này.
-- Policy dưới đây cho phép client (role "anon") đọc và tạo mới quy trình,
-- nhưng KHÔNG cho phép sửa/xoá từ trình duyệt (chỉ server với service_role mới làm được).
alter table public.workflows enable row level security;

create policy "Anon can read workflows"
  on public.workflows for select
  to anon
  using (true);

create policy "Anon can insert workflows"
  on public.workflows for insert
  to anon
  with check (true);

-- ── Workflow instances (trạng thái chạy của một quy trình đã lưu) ───────────
-- Lưu instance đang chạy: node hiện tại / node đang chờ người dùng thao tác
-- (form, đính kèm tệp, ký) / biến ngữ cảnh / log các bước đã thực hiện.
-- Chỉ backend (service_role, bỏ qua RLS) mới đọc/ghi bảng này — không thêm
-- policy nào cho "anon" vì instance không cần (và không nên) lộ ra trình duyệt
-- qua PostgREST trực tiếp.
create table if not exists public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  status text not null default 'running',       -- running | waiting | completed | failed
  current_node_id text,
  pending_node_id text,                          -- node đang chờ người dùng thao tác (status = 'waiting')
  variables jsonb not null default '{}'::jsonb,
  steps jsonb not null default '[]'::jsonb,      -- log các bước đã chạy (ExecutionStep[])
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workflow_instances_workflow_id_idx on public.workflow_instances (workflow_id);
create index if not exists workflow_instances_status_idx on public.workflow_instances (status);

alter table public.workflow_instances enable row level security;
