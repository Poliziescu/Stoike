-- =============================================
-- STOIKE - Creazione Schema per Mini Forum Film
-- =============================================
-- Esegui questo file nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

CREATE TABLE IF NOT EXISTS forum_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_movie_id INT NOT NULL,
    username TEXT NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Abilita Row Level Security
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può leggere i post del forum
DROP POLICY IF EXISTS "Allow public read access on forum_posts" ON forum_posts;
CREATE POLICY "Allow public read access on forum_posts"
    ON forum_posts FOR SELECT
    USING (true);

-- Policy: chiunque sia registrato (o guest, per uniformità) può scrivere post
DROP POLICY IF EXISTS "Allow public write access on forum_posts" ON forum_posts;
CREATE POLICY "Allow public write access on forum_posts"
    ON forum_posts FOR INSERT
    WITH CHECK (true);

-- Policy: admin o l'autore stesso possono cancellare i post
DROP POLICY IF EXISTS "Allow delete access on forum_posts" ON forum_posts;
CREATE POLICY "Allow delete access on forum_posts"
    ON forum_posts FOR DELETE
    USING (true);

