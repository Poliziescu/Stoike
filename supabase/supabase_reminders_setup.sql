-- =============================================
-- STOIKE - Creazione Tabella Avvisi / Promemoria Uscita Film
-- =============================================
-- Esegui questo script nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

-- Creazione della tabella per i promemoria di uscita dei film
CREATE TABLE IF NOT EXISTS movie_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT NOT NULL,
    tmdb_movie_id INT NOT NULL,
    title TEXT NOT NULL,
    poster_url TEXT,
    release_date TEXT, -- memorizziamo la data in formato testo (es. YYYY-MM-DD)
    email TEXT, -- email dell'utente a cui inviare l'avviso
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(username, tmdb_movie_id)
);

-- Abilita Row Level Security (RLS)
ALTER TABLE movie_reminders ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può leggere e scrivere per semplicità di integrazione API del server
CREATE POLICY "Allow public access on movie_reminders"
    ON movie_reminders
    FOR ALL
    USING (true)
    WITH CHECK (true);
