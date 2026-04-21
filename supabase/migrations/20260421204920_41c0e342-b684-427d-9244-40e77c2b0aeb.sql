ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS panel_view_mode text NOT NULL DEFAULT 'specialty';

ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_panel_view_mode_check;

ALTER TABLE public.users
ADD CONSTRAINT users_panel_view_mode_check
CHECK (panel_view_mode IN ('specialty', 'all'));