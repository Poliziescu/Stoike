-- =========================================================
-- STOIKE - Aggiunta Colonna 'notified' per Invio Email Uscita
-- =========================================================
-- Esegui questo script nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =========================================================

ALTER TABLE movie_reminders 
ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE;
