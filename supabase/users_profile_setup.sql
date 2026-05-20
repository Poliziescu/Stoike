-- =============================================
-- STOIKE - Sistema di Gestione Profilo via RPC
-- =============================================
-- Esegui questo script nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =============================================

-- 1. Funzione RPC per recuperare in modo sicuro il profilo utente
-- Questo evita di esporre la tabella 'users' ed il 'password_hash' a letture pubbliche dirette.
CREATE OR REPLACE FUNCTION get_user_profile(p_username TEXT)
RETURNS TABLE (
    username TEXT,
    role TEXT,
    nickname TEXT,
    avatar_url TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.username, u.role, u.nickname, u.avatar_url
    FROM users u
    WHERE LOWER(u.username) = LOWER(p_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Funzione RPC per salvare/aggiornare in modo sicuro il profilo utente
-- Permette al backend di aggiornare nickname e avatar senza allentare la sicurezza di RLS su 'users'.
CREATE OR REPLACE FUNCTION update_user_profile(
    p_username TEXT,
    p_nickname TEXT,
    p_avatar_url TEXT
)
RETURNS JSON AS $$
BEGIN
    -- Controlla se il nickname è già in uso da un ALTRO utente (case-insensitive)
    IF p_nickname IS NOT NULL AND p_nickname <> '' AND EXISTS (
        SELECT 1 FROM users 
        WHERE LOWER(nickname) = LOWER(p_nickname) AND LOWER(username) <> LOWER(p_username)
    ) THEN
        RETURN json_build_object('success', false, 'message', 'Questo nickname è già in uso da un altro utente.');
    END IF;

    -- Esegue l'aggiornamento
    UPDATE users
    SET 
        nickname = COALESCE(p_nickname, nickname),
        avatar_url = COALESCE(p_avatar_url, avatar_url)
    WHERE LOWER(username) = LOWER(p_username);

    IF FOUND THEN
        RETURN json_build_object('success', true, 'message', 'Profilo salvato con successo!');
    END IF;

    RETURN json_build_object('success', false, 'message', 'Utente non trovato.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
