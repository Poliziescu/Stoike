-- =============================================
-- STOIKE - Aggiunta colonne per dettaglio film
-- =============================================
-- Esegui nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

ALTER TABLE movies ADD COLUMN IF NOT EXISTS trailer_url TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS synopsis TEXT;
ALTER TABLE movies ADD COLUMN IF NOT EXISTS review TEXT;
