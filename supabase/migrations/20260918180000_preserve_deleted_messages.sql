-- Just Us: preserve messages when hidden/deleted from the frontend
-- Frontend deletion is a soft delete: rows remain in public.messages.

alter table public.messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by chat_sender;
