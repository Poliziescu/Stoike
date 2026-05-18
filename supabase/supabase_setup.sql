-- =============================================
-- STOIKE - Schema Database Supabase
-- =============================================
-- Esegui questo file nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

-- Tabella MOVIES (catalogo film)
CREATE TABLE IF NOT EXISTS movies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    poster_url TEXT,
    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    release_year INT4,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Abilita Row Level Security
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può leggere i film (accesso pubblico in lettura)
CREATE POLICY "Allow public read access on movies"
    ON movies
    FOR SELECT
    USING (true);

-- =============================================
-- FATTO! Ora puoi aggiungere film dalla dashboard
-- e il tuo sito li mostrerà automaticamente.
-- =============================================
