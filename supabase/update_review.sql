-- =============================================
-- STOIKE - Modifica Recensioni (Solo Admin)
-- =============================================
-- Esegui questo file nel SQL Editor di Supabase
-- =============================================

CREATE OR REPLACE FUNCTION update_review(
    p_review_id UUID, 
    p_username TEXT, 
    p_new_text TEXT, 
    p_new_rating NUMERIC
)
RETURNS JSON AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role 
    FROM users 
    WHERE username = p_username;
    
    IF user_role IS NULL OR user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Permesso negato. Solo gli admin possono modificare le recensioni.');
    END IF;

    UPDATE reviews 
    SET review_text = p_new_text, 
        rating = p_new_rating
    WHERE id = p_review_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================
-- RPC per INSERIRE una nuova recensione (Solo Admin)
-- =============================================
CREATE OR REPLACE FUNCTION insert_review(
    p_username TEXT,
    p_tmdb_movie_id INT,
    p_author TEXT,
    p_review_text TEXT,
    p_rating NUMERIC
)
RETURNS JSON AS $$
DECLARE
    user_role TEXT;
    new_id UUID;
BEGIN
    SELECT role INTO user_role 
    FROM users 
    WHERE username = p_username;
    
    IF user_role IS NULL OR user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Permesso negato. Solo gli admin possono inserire recensioni.');
    END IF;

    INSERT INTO reviews (tmdb_movie_id, author, review_text, rating)
    VALUES (p_tmdb_movie_id, p_author, p_review_text, p_rating)
    RETURNING id INTO new_id;

    RETURN json_build_object('success', true, 'id', new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
