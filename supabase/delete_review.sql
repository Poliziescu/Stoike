-- =============================================
-- STOIKE - Eliminazione Recensioni (Solo Admin)
-- =============================================
-- Esegui questo file nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

CREATE OR REPLACE FUNCTION delete_review(
    p_review_id TEXT, 
    p_username TEXT
)
RETURNS JSON AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Recupera il ruolo dell'utente che richiede la cancellazione
    SELECT role INTO user_role 
    FROM users 
    WHERE username = p_username;
    
    -- Verifica se l'utente è amministratore
    IF user_role IS NULL OR user_role != 'admin' THEN
        RETURN json_build_object('success', false, 'message', 'Permesso negato. Solo gli admin possono cancellare le recensioni.');
    END IF;

    -- Cancella la recensione
    DELETE FROM reviews 
    WHERE id = p_review_id::UUID;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

