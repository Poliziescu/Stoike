-- =============================================
-- STOIKE - Creazione Sistema Utenze e SHA-512
-- =============================================
-- Esegui questo file nel SQL Editor di Supabase
-- =============================================

-- 1. Rimozione della vecchia tabella movies (non più in uso)
DROP TABLE IF EXISTS movies;

-- 2. Abilita l'estensione pgcrypto per l'hashing SHA-512
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Creazione della tabella users
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, -- Memorizziamo l'hash SHA-512 in formato esadecimale (TEXT)
    role TEXT DEFAULT 'user',
    nickname TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Assicura che le colonne nickname e avatar_url esistano (in caso di aggiornamento da tabella esistente)
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Abilita RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Inserimento Utenti Admin Iniziali (Mike e Stoi)
-- Generiamo l'hash SHA-512 della password e lo convertiamo in formato testuale HEX
INSERT INTO users (username, password_hash, role)
VALUES 
    ('Mike', encode(digest('mike123', 'sha512'), 'hex'), 'admin'),
    ('Stoi', encode(digest('stoi123', 'sha512'), 'hex'), 'admin')
ON CONFLICT (username) DO NOTHING;

-- =============================================
-- 5. Creazione Funzioni RPC (Remote Procedure Call)
-- Queste funzioni permetteranno al frontend di fare
-- login e registrazione in modo SICURO, senza 
-- esporre le password o permettere download della tabella.
-- =============================================

-- RPC per il Login (con ricerca case-insensitive su username o nickname)
CREATE OR REPLACE FUNCTION login_user(p_username TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
    user_record RECORD;
    input_hash TEXT;
BEGIN
    -- Calcola l'hash SHA-512 della password fornita in input
    input_hash := encode(digest(p_password, 'sha512'), 'hex');
    
    -- Cerca l'utente con quell'username o nickname (case-insensitive) e quell'hash esatto
    SELECT id, username, role INTO user_record 
    FROM users 
    WHERE (LOWER(username) = LOWER(p_username) OR LOWER(nickname) = LOWER(p_username)) AND password_hash = input_hash;
    
    IF FOUND THEN
        RETURN json_build_object('success', true, 'username', user_record.username, 'role', user_record.role);
    ELSE
        RETURN json_build_object('success', false, 'message', 'Username o password errati');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC per la Registrazione (con controllo case-insensitive dell'unicità su username e nickname)
CREATE OR REPLACE FUNCTION register_user(p_username TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
    new_user_record RECORD;
BEGIN
    -- Controlla se l'username/nickname esiste già (case-insensitive)
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(username) = LOWER(p_username) OR LOWER(nickname) = LOWER(p_username)) THEN
        RETURN json_build_object('success', false, 'message', 'Username o Nickname già in uso');
    END IF;

    -- Inserisci il nuovo utente generando l'hash SHA-512 e popolando sia username che nickname
    INSERT INTO users (username, nickname, password_hash, role)
    VALUES (p_username, p_username, encode(digest(p_password, 'sha512'), 'hex'), 'user')
    RETURNING id, username, role INTO new_user_record;
    
    RETURN json_build_object('success', true, 'username', new_user_record.username, 'role', new_user_record.role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
