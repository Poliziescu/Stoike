-- =========================================================
-- STOIKE - Aggiunta Colonna 'email' alla Tabella Utenti
-- =========================================================
-- Esegui questo script nel SQL Editor di Supabase:
-- Dashboard > SQL Editor > New query > Incolla > Run
-- =========================================================

-- 1. Aggiunta colonna email alla tabella users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Aggiornamento della funzione RPC di registrazione per accettare l'email
CREATE OR REPLACE FUNCTION register_user(p_username TEXT, p_password TEXT, p_email TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    new_user_record RECORD;
BEGIN
    -- Controlla se l'username/nickname esiste già (case-insensitive)
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username) OR LOWER(nickname) = LOWER(p_username)) THEN
        RETURN json_build_object('success', false, 'message', 'Username o Nickname già in uso');
    END IF;

    -- Inserisci il nuovo utente generando l'hash SHA-512 e popolando sia username che nickname
    INSERT INTO users (username, nickname, password_hash, role, email)
    VALUES (p_username, p_username, encode(digest(p_password, 'sha512'), 'hex'), 'user', p_email)
    RETURNING id, username, role INTO new_user_record;
    
    RETURN json_build_object('success', true, 'username', new_user_record.username, 'role', new_user_record.role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Aggiornamento della funzione RPC per recuperare il profilo utente (include email)
--    DROP necessario perché PostgreSQL non consente di cambiare il return type con CREATE OR REPLACE
DROP FUNCTION IF EXISTS get_user_profile(TEXT);
CREATE OR REPLACE FUNCTION get_user_profile(p_username TEXT)
RETURNS TABLE (
    username TEXT,
    role TEXT,
    nickname TEXT,
    avatar_url TEXT,
    email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.username, u.role, u.nickname, u.avatar_url, u.email
    FROM users u
    WHERE LOWER(u.username) = LOWER(p_username);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Aggiornamento della funzione RPC per salvare il profilo utente (include email)
CREATE OR REPLACE FUNCTION update_user_profile(
    p_username TEXT,
    p_nickname TEXT,
    p_avatar_url TEXT,
    p_email TEXT DEFAULT NULL
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
        avatar_url = COALESCE(p_avatar_url, avatar_url),
        email = COALESCE(p_email, email)
    WHERE LOWER(username) = LOWER(p_username);

    IF FOUND THEN
        RETURN json_build_object('success', true, 'message', 'Profilo salvato con successo!');
    END IF;

    RETURN json_build_object('success', false, 'message', 'Utente non trovato.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
