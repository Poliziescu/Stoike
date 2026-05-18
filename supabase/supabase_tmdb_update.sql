-- =============================================
-- STOIKE - Aggiornamento Schema per Integrazione TMDb
-- =============================================
-- Esegui questo file nel SQL Editor di Supabase
-- =============================================

-- 1. Creazione della tabella REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_movie_id INT NOT NULL,  -- L'ID univoco del film fornito da TMDb
    author TEXT NOT NULL,
    review_text TEXT NOT NULL,
    rating NUMERIC(2,1) CHECK (rating >= 0 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Abilita Row Level Security
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Policy: chiunque può leggere le recensioni (accesso pubblico in lettura)
CREATE POLICY "Allow public read access on reviews"
    ON reviews
    FOR SELECT
    USING (true);

-- =============================================
-- Inserimento di alcune recensioni di test
-- Usa l'ID di TMDb del film per collegarlo
-- =============================================

-- Alien: Romulus (TMDb ID: 945961)
INSERT INTO reviews (tmdb_movie_id, author, review_text, rating)
VALUES (
    945961, 
    'Cinematic Noir', 
    'Un ritorno mozzafiato alle origini del franchise. Fede Álvarez riesce a catturare l''essenza claustrofobica del primo Alien, arricchendola con effetti visivi straordinari e una tensione palpabile. Il cast giovane brilla in questo survival horror nello spazio profondo.', 
    4.5
);

-- Dune: Part Two (TMDb ID: 693134)
INSERT INTO reviews (tmdb_movie_id, author, review_text, rating)
VALUES (
    693134, 
    'Cinematic Noir', 
    'Denis Villeneuve firma un''opera colossale che ridefinisce il cinema sci-fi moderno. Visivamente superbo, narrativamente denso e supportato da interpretazioni magistrali. Una delle migliori esperienze cinematografiche del decennio.', 
    5.0
);

-- Oppenheimer (TMDb ID: 872585)
INSERT INTO reviews (tmdb_movie_id, author, review_text, rating)
VALUES (
    872585, 
    'Cinematic Noir', 
    'Nolan costruisce un biopic atipico, esplosivo e tesissimo. Il montaggio serrato e la colonna sonora onnipresente trasformano la fisica teorica in un thriller politico inarrestabile.', 
    4.8
);
