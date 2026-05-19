-- =============================================
-- STOIKE - Aggiunta Campi Profilo Utente
-- =============================================
-- Esegui questo script nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

-- Aggiunta della colonna nickname (univoca per tutti gli utenti)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT UNIQUE;

-- Aggiunta della colonna avatar_url (per l'immagine profilo personalizzata)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
