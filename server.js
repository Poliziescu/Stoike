/**
 * STOIKE — Backend Server (Node.js Express)
 * Gestisce le API routes per TMDb, autenticazione e recensioni.
 * Le chiavi API sono nascoste lato server in .env.
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Carica le variabili d'ambiente dal file .env
dotenv.config();
if (fs.existsSync(path.join(__dirname, 'backend/.env'))) {
    dotenv.config({ path: path.join(__dirname, 'backend/.env') });
}

const app = express();
const PORT = process.env.PORT || 5001;

// Configura CORS
app.use(cors());

// Selettore del body parser: Raw Buffer per Webhook (per validare la firma HMAC), JSON per tutto il resto
app.use((req, res, next) => {
    if (req.originalUrl === '/api/webhook/github') {
        next();
    } else {
        express.json({ limit: '15mb' })(req, res, next);
    }
});

// Configurazione variabili d'ambiente
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Headers di utility per le richieste Supabase RPC/REST
function supabaseHeaders() {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

// =========================================
// MAPPATURA DI TUTTE LE PAGINE FRONTEND (ROUTING CLEAN)
// Evita qualsiasi errore 404 durante la navigazione
// =========================================

// Home / Index
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Genres
app.get('/genres', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'genres.html'));
});
app.get('/genres.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'genres.html'));
});

// Movie Details
app.get('/movie', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'movie.html'));
});
app.get('/movie.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'movie.html'));
});

// Search & Catalog Lists
app.get('/list', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'list.html'));
});
app.get('/list.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

// Reminders
app.get('/reminders', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reminders.html'));
});
app.get('/reminders.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reminders.html'));
});
// Gestione Profilo / Account
app.get('/account', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'account.html'));
});
app.get('/account.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'account.html'));
});

// Serve le risorse statiche (JS, CSS, immagini) della cartella public
app.use(express.static(path.join(__dirname, 'public')));

// =========================================
// PROXY TMDb API
// =========================================

// Caching per i film rilasciati in Italia
const cachePath = path.join(__dirname, 'italy_movies_cache.json');
let italyMoviesCache = {};

try {
    if (fs.existsSync(cachePath)) {
        italyMoviesCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        console.log(`📁 [Cache] Caricato cache dei film in Italia: ${Object.keys(italyMoviesCache).length} elementi.`);
    }
} catch (err) {
    console.error('❌ Errore nel caricamento della cache:', err.message);
}

function saveCache() {
    try {
        fs.writeFile(cachePath, JSON.stringify(italyMoviesCache, null, 2), 'utf8', (err) => {
            if (err) {
                console.error('❌ Errore nel salvataggio asincrono della cache:', err.message);
            }
        });
    } catch (err) {
        console.error('❌ Errore nel salvataggio della cache:', err.message);
    }
}

async function isMovieInItaly(movieId, originalLanguage) {
    if (!movieId) return false;
    if (originalLanguage === 'it') return true;

    const key = String(movieId);
    if (italyMoviesCache[key] !== undefined) {
        return italyMoviesCache[key];
    }

    try {
        const url = `${TMDB_BASE_URL}/movie/${movieId}/release_dates`;
        const res = await axios.get(url, {
            params: { api_key: TMDB_API_KEY },
            timeout: 5000
        });

        const results = res.data && res.data.results;
        let inItaly = false;
        if (Array.isArray(results)) {
            inItaly = results.some(r => r.iso_3166_1 === 'IT');
        }

        italyMoviesCache[key] = inItaly;
        saveCache();
        return inItaly;
    } catch (err) {
        console.error(`❌ Errore nel recupero release_dates per film ID ${movieId}:`, err.message);
        return false;
    }
}

function isValidTitle(title, originalTitle) {
    // Regex per escludere caratteri non latini (Cinese, Giapponese, Coreano, Arabo, Ebraico, Cirillico, Indiano, Tailandese, Greco)
    const nonLatinRegex = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\u1100-\u11ff\u3000-\u303f\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff\u0590-\u05ff\u0400-\u04ff\u0500-\u052f\u0900-\u097f\u0980-\u09ff\u0b80-\u0bff\u0c00-\u0c7f\u0c80-\u0cff\u0d00-\u0d7f\u0e00-\u0e7f\u0370-\u03ff]/;

    if (nonLatinRegex.test(title || '')) return false;
    if (nonLatinRegex.test(originalTitle || '')) return false;
    return true;
}

function isMovieObject(m) {
    return m && (m.title !== undefined || m.original_title !== undefined);
}

function isValidActor(m) {
    if (!m) return false;
    const name = m.name || '';
    const originalName = m.original_name || '';
    // Regex per escludere caratteri non latini (Cinese, Giapponese, Coreano, Arabo, Ebraico, Cirillico, Indiano, Tailandese, Greco)
    const nonLatinRegex = /[\u4e00-\u9fa5\u3040-\u30ff\uac00-\ud7af\u1100-\u11ff\u3000-\u303f\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff\u0590-\u05ff\u0400-\u04ff\u0500-\u052f\u0900-\u097f\u0980-\u09ff\u0b80-\u0bff\u0c00-\u0c7f\u0c80-\u0cff\u0d00-\u0d7f\u0e00-\u0e7f\u0370-\u03ff]/;
    if (nonLatinRegex.test(name) || nonLatinRegex.test(originalName)) {
        return false;
    }
    
    // Filtra anche il suo array known_for se presente per evitare di mostrare titoli non validi come sottotitoli
    if (Array.isArray(m.known_for)) {
        m.known_for = m.known_for.filter(k => {
            const title = k.title || k.name || '';
            const originalTitle = k.original_title || k.original_name || '';
            return !nonLatinRegex.test(title) && !nonLatinRegex.test(originalTitle);
        });
    }
    
    return true;
}

app.get('/api/tmdb/*', async (req, res) => {
    const endpoint = req.params[0];
    const params = { ...req.query };
    params.api_key = TMDB_API_KEY;
    // Language is now sent by the frontend based on user i18n selection
    // Rimuove cache buster parametro _t
    if (params._t) {
        delete params._t;
    }

    const targetUrl = `${TMDB_BASE_URL}/${endpoint}`;
    console.log(`🔍 [TMDb Proxy] Chiamata a: ${targetUrl} con parametri:`, params);

    try {
        const response = await axios.get(targetUrl, {
            params,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            timeout: 10000
        });
        console.log(`✅ [TMDb Proxy] Risposta ricevuta: Stato ${response.status}`);

        let data = response.data;
        if (data) {
            // Caso 1: Array di risultati (liste di film / persone)
            if (Array.isArray(data.results)) {
                const filterPromises = data.results.map(async (m) => {
                    if (m && m.id) {
                        if (!isMovieObject(m)) {
                            return isValidActor(m) ? m : null;
                        }
                        const inItaly = await isMovieInItaly(m.id, m.original_language);
                        if (inItaly && isValidTitle(m.title, m.original_title)) {
                            return m;
                        }
                    }
                    return null;
                });
                const resolved = await Promise.all(filterPromises);
                data.results = resolved.filter(Boolean);
            }
            // Caso 2: Parti di una collezione
            else if (Array.isArray(data.parts)) {
                const filterPromises = data.parts.map(async (m) => {
                    if (m && m.id) {
                        if (!isMovieObject(m)) {
                            return isValidActor(m) ? m : null;
                        }
                        const inItaly = await isMovieInItaly(m.id, m.original_language);
                        if (inItaly && isValidTitle(m.title, m.original_title)) {
                            return m;
                        }
                    }
                    return null;
                });
                const resolved = await Promise.all(filterPromises);
                data.parts = resolved.filter(Boolean);
            }
            // Caso 3: Crediti cast/crew di un attore / film
            else if (Array.isArray(data.cast) || Array.isArray(data.crew)) {
                if (Array.isArray(data.cast)) {
                    const filterPromises = data.cast.map(async (m) => {
                        if (m && m.id) {
                            if (!isMovieObject(m)) {
                                return isValidActor(m) ? m : null;
                            }
                            const inItaly = await isMovieInItaly(m.id, m.original_language);
                            if (inItaly && isValidTitle(m.title, m.original_title)) {
                                return m;
                            }
                        }
                        return null;
                    });
                    const resolved = await Promise.all(filterPromises);
                    data.cast = resolved.filter(Boolean);
                }
                if (Array.isArray(data.crew)) {
                    const filterPromises = data.crew.map(async (m) => {
                        if (m && m.id) {
                            if (!isMovieObject(m)) {
                                return isValidActor(m) ? m : null;
                            }
                            const inItaly = await isMovieInItaly(m.id, m.original_language);
                            if (inItaly && isValidTitle(m.title, m.original_title)) {
                                return m;
                            }
                        }
                        return null;
                    });
                    const resolved = await Promise.all(filterPromises);
                    data.crew = resolved.filter(Boolean);
                }
            }
            // Caso 4: Dettaglio singolo film
            else if (/^movie\/\d+$/.test(endpoint)) {
                if (data.id && isMovieObject(data)) {
                    const inItaly = await isMovieInItaly(data.id, data.original_language);
                    if (!inItaly || !isValidTitle(data.title, data.original_title)) {
                        console.log(`🚫 [TMDb Proxy] Film ID ${data.id} filtrato (non in Italia o titolo non valido).`);
                        return res.status(404).json({ success: false, message: 'Film non disponibile in Italia o lingua non supportata.' });
                    }
                }
            }
            // Caso 5: Dettaglio singolo attore
            else if (/^person\/\d+$/.test(endpoint)) {
                if (data.id && !isValidActor(data)) {
                    console.log(`🚫 [TMDb Proxy] Attore ID ${data.id} filtrato (nome con caratteri non latini).`);
                    return res.status(404).json({ success: false, message: 'Attore non supportato a sistema.' });
                }
            }
        }

        return res.status(response.status).json(data);
    } catch (error) {
        console.error(`❌ [TMDb Proxy] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});


// =========================================
// AUTENTICAZIONE (via Supabase RPC)
// =========================================
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body || {};
    console.log(`🔑 [Auth Login] Richiesta login per: '${username}'`);

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/login_user`, {
            p_username: username,
            p_password: password
        }, {
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🔑 [Auth Login] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Auth Login] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});

app.post('/api/auth/register', async (req, res) => {
    const { username, password, email } = req.body || {};
    console.log(`🔑 [Auth Register] Richiesta registrazione per: '${username}' (email: ${email || 'non fornita'})`);

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/register_user`, {
            p_username: username,
            p_password: password,
            p_email: email || null
        }, {
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🔑 [Auth Register] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Auth Register] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});


// =========================================
// GESTIONE PROFILO UTENTE (con fallback locale)
// =========================================

// Assicura che la directory degli upload per gli avatar esista
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const localProfilesPath = path.join(__dirname, 'user_profiles.json');

function getLocalProfiles() {
    try {
        if (fs.existsSync(localProfilesPath)) {
            const data = fs.readFileSync(localProfilesPath, 'utf8');
            return JSON.parse(data) || {};
        }
    } catch (err) {
        console.error("❌ Errore nella lettura dei profili locali:", err.message);
    }
    return {};
}

function getLocalProfileCaseInsensitive(username) {
    const profiles = getLocalProfiles();
    if (!username) return {};
    const key = Object.keys(profiles).find(k => k.toLowerCase() === username.toLowerCase());
    return key ? profiles[key] : {};
}

function saveLocalProfile(username, profileData) {
    try {
        const profiles = getLocalProfiles();
        const key = Object.keys(profiles).find(k => k.toLowerCase() === username.toLowerCase()) || username;
        profiles[key] = {
            ...profiles[key],
            ...profileData
        };
        fs.writeFileSync(localProfilesPath, JSON.stringify(profiles, null, 2), 'utf8');
        return true;
    } catch (err) {
        console.error("❌ Errore nel salvataggio del profilo locale:", err.message);
        return false;
    }
}

// GET: Recupera profilo utente
app.get('/api/user/profile', async (req, res) => {
    const { username } = req.query;
    console.log(`👤 [Profile Get] Richiesta profilo per: '${username}'`);
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username obbligatorio' });
    }

    try {
        // 1. Tenta prima tramite la RPC get_user_profile per bypassare RLS in modo sicuro
        try {
            const rpcResponse = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/get_user_profile`, {
                p_username: username
            }, {
                headers: supabaseHeaders(),
                timeout: 5000
            });

            if (rpcResponse.data && rpcResponse.data.length > 0) {
                const user = rpcResponse.data[0];
                const localUser = getLocalProfileCaseInsensitive(username);
                console.log(`👤 [Profile Get] Trovato profilo tramite RPC per '${username}'`);
                return res.json({
                    success: true,
                    username: user.username,
                    role: user.role || 'user',
                    nickname: user.nickname || localUser.nickname || '',
                    avatar_url: user.avatar_url || localUser.avatar_url || '',
                    email: user.email || localUser.email || ''
                });
            }
        } catch (rpcError) {
            console.log(`⚠️ [Profile Get] RPC get_user_profile non disponibile o errore: ${rpcError.message}. Provo query diretta REST...`);
        }

        // 2. Tenta query Supabase REST diretta (fallback)
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
            params: {
                username: `eq.${username}`,
                select: 'username,role,nickname,avatar_url,email'
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });

        if (response.data && response.data.length > 0) {
            const user = response.data[0];
            const localUser = getLocalProfileCaseInsensitive(username);
            
            return res.json({
                success: true,
                username: user.username,
                role: user.role,
                nickname: user.nickname || localUser.nickname || '',
                avatar_url: user.avatar_url || localUser.avatar_url || '',
                email: user.email || localUser.email || ''
            });
        } else {
            console.log(`👤 [Profile Get] Utente '${username}' non trovato in Supabase. Fallback locale.`);
            const localUser = getLocalProfileCaseInsensitive(username);
            
            return res.json({
                success: true,
                username: username,
                role: 'user',
                nickname: localUser.nickname || '',
                avatar_url: localUser.avatar_url || '',
                email: localUser.email || ''
            });
        }

    } catch (error) {
        // Fallback locale in caso di colonne mancanti o database offline
        console.warn(`⚠️ [Profile Get] Errore Supabase o colonne mancanti. Fallback locale per '${username}':`, error.message);
        
        const localUser = getLocalProfileCaseInsensitive(username);
        
        return res.json({
            success: true,
            username: username,
            role: 'user',
            nickname: localUser.nickname || '',
            avatar_url: localUser.avatar_url || '',
            email: localUser.email || ''
        });
    }
});

// POST: Salva / Aggiorna profilo utente
app.post('/api/user/profile', async (req, res) => {
    const { username, nickname, avatar_data, email } = req.body || {};
    console.log(`👤 [Profile Update] Richiesta aggiornamento profilo per: '${username}', nickname: '${nickname}'`);

    if (!username) {
        return res.status(400).json({ success: false, message: 'Username obbligatorio.' });
    }

    let finalNickname = nickname ? nickname.trim() : '';

    // 1. Verifica dell'unicità del nickname (sia contro altri nickname che contro altri username)
    if (finalNickname) {
        try {
            // Controlla su Supabase REST se il nickname è già in uso come username o come nickname da qualcun altro
            const response = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
                params: {
                    or: `(username.ilike."${finalNickname}",nickname.ilike."${finalNickname}")`,
                    username: `neq.${username}`,
                    select: 'username'
                },
                headers: supabaseHeaders(),
                timeout: 5000
            });
            if (response.data && response.data.length > 0) {
                return res.status(400).json({ success: false, message: 'Questo nickname è già in uso da un altro utente.' });
            }
        } catch (error) {
            console.warn(`⚠️ [Profile Update] Errore unicità nickname Supabase. Fallback locale:`, error.message);
            // Fallback locale per verificare l'unicità su sia nickname che username
            const localProfiles = getLocalProfiles();
            const exists = Object.keys(localProfiles).some(u => {
                const isDifferentUser = u.toLowerCase() !== username.toLowerCase();
                const matchesUsername = u.toLowerCase() === finalNickname.toLowerCase();
                const matchesNickname = localProfiles[u].nickname && localProfiles[u].nickname.toLowerCase() === finalNickname.toLowerCase();
                return isDifferentUser && (matchesUsername || matchesNickname);
            });
            if (exists) {
                return res.status(400).json({ success: false, message: 'Questo nickname è già in uso da un altro utente.' });
            }
        }
    }
    let avatarUrl = null;

    // 2. Salvataggio dell'immagine profilo (salviamo in Base64 direttamente nel DB per visibilità cross-device)
    if (avatar_data) {
        if (avatar_data.startsWith('data:image/')) {
            avatarUrl = avatar_data;
            console.log(`💾 [Profile Update] Avatar configurato direttamente come stringa Base64`);
            
            // Creiamo comunque una copia locale di backup su disco
            try {
                const matches = avatar_data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
                if (matches && matches.length === 3) {
                    const ext = matches[1];
                    const base64Data = matches[2];
                    const buffer = Buffer.from(base64Data, 'base64');
                    const filename = `avatar_${username.toLowerCase()}_${Date.now()}.${ext}`;
                    const filepath = path.join(uploadsDir, filename);
                    fs.writeFileSync(filepath, buffer);
                    console.log(`💾 [Profile Update Backup] Copia di backup salvata localmente: /uploads/${filename}`);
                }
            } catch (err) {
                console.warn("⚠️ [Profile Update Backup] Errore salvataggio backup locale (non bloccante):", err.message);
            }
        } else {
            return res.status(400).json({ success: false, message: 'Formato immagine non valido.' });
        }
    }

    // 3. Esegui aggiornamento
    const updateDataDB = {};
    if (finalNickname !== undefined) updateDataDB.nickname = finalNickname;
    // Salviamo il percorso relativo dell'immagine (URL) su Supabase per caricarlo correttamente dal server
    if (avatarUrl) {
        updateDataDB.avatar_url = avatarUrl;
    }
    const finalEmail = (email !== undefined && email !== null) ? email.trim() : undefined;
    if (finalEmail !== undefined) updateDataDB.email = finalEmail;

    // Per il file JSON locale salviamo solo il percorso relativo per non appesantirlo
    const updateDataLocal = {};
    if (finalNickname !== undefined) updateDataLocal.nickname = finalNickname;
    if (avatarUrl) updateDataLocal.avatar_url = avatarUrl;
    if (finalEmail !== undefined) updateDataLocal.email = finalEmail;

    try {
        let savedInSupabase = false;

        // 3.1 Tenta prima tramite la RPC update_user_profile per bypassare RLS in modo sicuro
        try {
            const rpcResponse = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/update_user_profile`, {
                p_username: username,
                p_nickname: finalNickname || null,
                p_avatar_url: avatarUrl || null,
                p_email: finalEmail !== undefined ? finalEmail : null
            }, {
                headers: supabaseHeaders(),
                timeout: 5000
            });

            if (rpcResponse.data) {
                const result = rpcResponse.data;
                if (result.success === false) {
                    return res.status(400).json({ success: false, message: result.message || 'Errore durante il salvataggio.' });
                }
                console.log(`👤 [Profile Update] Supabase salvato con successo tramite RPC per '${username}' (Foto salvata nel DB!)`);
                savedInSupabase = true;
            }
        } catch (rpcError) {
            console.log(`⚠️ [Profile Update] RPC update_user_profile non disponibile o errore: ${rpcError.message}. Provo patch diretta REST...`);
        }

        if (!savedInSupabase) {
            // 3.2 Tenta salvataggio su Supabase REST diretto (fallback)
            await axios.patch(`${SUPABASE_URL}/rest/v1/users`, updateDataDB, {
                params: {
                    username: `eq.${username}`
                },
                headers: supabaseHeaders(),
                timeout: 10000
            });
            console.log(`👤 [Profile Update] Supabase salvato con successo tramite PATCH per '${username}' (Foto salvata nel DB!)`);
        }
    } catch (error) {
        console.warn(`⚠️ [Profile Update] Impossibile salvare in Supabase (colonne mancanti o errore). Fallback locale per '${username}':`, error.message);
    }

    // Salviamo SEMPRE anche in locale per garantire massima consistenza e funzionamento immediato
    saveLocalProfile(username, updateDataLocal);

    // Recuperiamo il profilo aggiornato per restituire i dati definitivi completi
    const finalProfile = getLocalProfileCaseInsensitive(username);

    return res.json({
        success: true,
        message: 'Profilo salvato con successo!',
        nickname: finalProfile.nickname || finalNickname,
        avatar_url: avatarUrl || finalProfile.avatar_url || undefined,
        email: finalProfile.email || finalEmail || undefined
    });
});


// DELETE: Elimina account utente (con pulizia local/remote)
app.delete('/api/user/account', async (req, res) => {
    const username = (req.body && req.body.username) || req.query.username;
    console.log(`🗑️ [Account Delete] Richiesta cancellazione account per: '${username}'`);
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username obbligatorio.' });
    }

    try {
        // 1. Tenta la cancellazione su Supabase REST
        const response = await axios.delete(`${SUPABASE_URL}/rest/v1/users`, {
            params: {
                username: `eq.${username}`
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🗑️ [Account Delete] Supabase eliminato con successo per '${username}'`);
    } catch (error) {
        console.warn(`⚠️ [Account Delete] Impossibile eliminare da Supabase (o offline):`, error.message);
    }

    // 2. Cancella anche da user_profiles.json
    try {
        const profiles = getLocalProfiles();
        const key = Object.keys(profiles).find(k => k.toLowerCase() === username.toLowerCase());
        if (key) {
            delete profiles[key];
            fs.writeFileSync(localProfilesPath, JSON.stringify(profiles, null, 2), 'utf8');
            console.log(`🗑️ [Account Delete] Profilo locale eliminato per: '${username}'`);
        }
    } catch (err) {
        console.error("❌ Errore nella cancellazione del profilo locale:", err.message);
    }

    // 3. Cancella anche i promemoria locali/remoti
    try {
        await axios.delete(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
            params: {
                username: `eq.${username}`
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🗑️ [Account Delete] Promemoria rimossi da Supabase per '${username}'`);
    } catch (err) {
        console.warn(`⚠️ [Account Delete] Impossibile eliminare promemoria da Supabase:`, err.message);
    }

    return res.json({ success: true, message: 'Account eliminato con successo!' });
});

// =========================================
// RECENSIONI (Supabase integration)
// =========================================
app.get('/api/reviews/:movie_id', async (req, res) => {
    const movie_id = req.params.movie_id;
    console.log(`💬 [Reviews Get] Chiamata per film ID: ${movie_id}`);

    try {
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/reviews`, {
            params: {
                tmdb_movie_id: `eq.${movie_id}`,
                order: 'created_at.desc',
                select: '*'
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`💬 [Reviews Get] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Reviews Get] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});

app.post('/api/reviews', async (req, res) => {
    const { username, tmdb_movie_id, author, review_text, rating } = req.body || {};
    console.log(`💬 [Review Insert] Utente '${username}' inserisce per film ID ${tmdb_movie_id}`);

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/insert_review`, {
            p_username: username,
            p_tmdb_movie_id: tmdb_movie_id,
            p_author: author,
            p_review_text: review_text,
            p_rating: rating
        }, {
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`💬 [Review Insert] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Review Insert] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});

app.put('/api/reviews/:review_id', async (req, res) => {
    const review_id = req.params.review_id;
    const { username, review_text, rating } = req.body || {};
    console.log(`💬 [Review Update] Utente '${username}' modifica recensione ID ${review_id}`);

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/update_review`, {
            p_review_id: review_id,
            p_username: username,
            p_new_text: review_text,
            p_new_rating: rating
        }, {
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`💬 [Review Update] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Review Update] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});

app.delete('/api/reviews/:review_id', async (req, res) => {
    const review_id = req.params.review_id;
    const { username } = req.body || {};
    console.log(`🗑️ [Review Delete] Utente '${username}' richiede cancellazione recensione ID ${review_id}`);

    if (!username) {
        return res.status(400).json({ error: 'Username obbligatorio' });
    }

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/delete_review`, {
            p_review_id: review_id,
            p_username: username
        }, {
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🗑️ [Review Delete] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Review Delete] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});


// =========================================
// MINI FORUM API (Supabase integration)
// =========================================

// Recupera tutti i post del forum per un determinato film
app.get('/api/forum/:movie_id', async (req, res) => {
    const movie_id = req.params.movie_id;
    console.log(`💬 [Forum Get] Richiesta post per film ID: ${movie_id}`);

    try {
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/forum_posts`, {
            params: {
                tmdb_movie_id: `eq.${movie_id}`,
                order: 'created_at.asc',
                select: '*'
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`💬 [Forum Get] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Forum Get] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});

// Aggiunge un nuovo post (o risposta) al forum
app.post('/api/forum', async (req, res) => {
    const { username, tmdb_movie_id, content, parent_id } = req.body || {};
    console.log(`💬 [Forum Insert] Utente '${username}' scrive nel forum per film ID ${tmdb_movie_id}`);

    if (!username || !tmdb_movie_id || !content) {
        return res.status(400).json({ success: false, message: 'Dati incompleti.' });
    }

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/forum_posts`, {
            username: username,
            tmdb_movie_id: parseInt(tmdb_movie_id),
            content: content,
            parent_id: parent_id || null
        }, {
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`💬 [Forum Insert] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json({ success: true, data: response.data[0] });
    } catch (error) {
        console.error(`❌ [Forum Insert] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json({ success: false, error: error.message });
    }
});

// Cancella un post dal forum (per admin o proprietario)
app.delete('/api/forum/:post_id', async (req, res) => {
    const post_id = req.params.post_id;
    const { username } = req.body || {};
    console.log(`🗑️ [Forum Delete] Richiesta cancellazione post ID ${post_id} da parte di '${username}'`);

    if (!username) {
        return res.status(400).json({ success: false, error: 'Username obbligatorio.' });
    }

    try {
        // 1. Recupera il post dal database per capire chi lo ha scritto
        const postRes = await axios.get(`${SUPABASE_URL}/rest/v1/forum_posts`, {
            params: { id: `eq.${post_id}` },
            headers: supabaseHeaders(),
            timeout: 5000
        });
        const post = postRes.data && postRes.data[0];
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post non trovato.' });
        }

        // 2. Recupera il ruolo dell'utente che richiede la cancellazione
        const userRes = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
            params: { username: `eq.${username}` },
            headers: supabaseHeaders(),
            timeout: 5000
        });
        const userObj = userRes.data && userRes.data[0];
        const userRole = userObj ? userObj.role : null;

        // 3. Verifica i permessi: solo admin o l'autore stesso possono procedere
        const isAdmin = userRole === 'admin';
        const isOwner = post.username === username;

        if (!isAdmin && !isOwner) {
            return res.status(403).json({ success: false, error: 'Non hai i permessi per eliminare questo messaggio.' });
        }

        // 4. Esegui la cancellazione effettiva
        const response = await axios.delete(`${SUPABASE_URL}/rest/v1/forum_posts`, {
            params: {
                id: `eq.${post_id}`
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🗑️ [Forum Delete] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json({ success: true });
    } catch (error) {
        console.error(`❌ [Forum Delete] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ success: false, error: error.message });
    }
});


// =========================================
// NOTIFICATIONS API (Supabase integration)
// =========================================

// Recupera le notifiche per un determinato utente (promemoria usciti e menzioni nel forum)
app.get('/api/notifications/:username', async (req, res) => {
    const username = req.params.username;
    console.log(`🔔 [Notifications Get] Recupero notifiche per: ${username}`);

    try {
        let notifications = [];

        // 1. Recupera il profilo dell'utente per conoscere il nickname personalizzato
        let nickname = '';
        try {
            const profileResponse = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
                params: {
                    username: `eq.${username}`,
                    select: 'nickname'
                },
                headers: supabaseHeaders(),
                timeout: 5000
            });
            if (profileResponse.data && profileResponse.data.length > 0) {
                nickname = profileResponse.data[0].nickname || '';
            }
        } catch (profileErr) {
            console.warn(`⚠️ [Notifications Get] Impossibile recuperare il profilo per il nickname: ${profileErr.message}`);
        }

        // 2. Recupera i post del forum per trovare menzioni (@username o @nickname)
        try {
            const forumResponse = await axios.get(`${SUPABASE_URL}/rest/v1/forum_posts`, {
                params: {
                    select: '*'
                },
                headers: supabaseHeaders(),
                timeout: 10000
            });

            if (forumResponse.data && Array.isArray(forumResponse.data)) {
                const userTag = `@${username.toLowerCase()}`;
                const nickTag = nickname ? `@${nickname.toLowerCase().replace(/\s+/g, '')}` : null;

                forumResponse.data.forEach(post => {
                    if (post.username && post.username.toLowerCase() === username.toLowerCase()) return; // Non autotaggarsi
                    
                    if (post.content) {
                        const contentLower = post.content.toLowerCase();
                        const hasUserTag = contentLower.includes(userTag);
                        const hasNickTag = nickTag ? contentLower.includes(nickTag) : false;

                        if (hasUserTag || hasNickTag) {
                            notifications.push({
                                id: `mention_${post.id}`,
                                type: 'mention',
                                title: 'Menzione nel Forum',
                                content: `${post.username} ti ha menzionato: "${post.content.slice(0, 60)}${post.content.length > 60 ? '...' : ''}"`,
                                movie_id: post.tmdb_movie_id,
                                created_at: post.created_at
                            });
                        }
                    }
                });
            }
        } catch (forumErr) {
            console.error(`❌ [Notifications Get] Errore recupero post forum:`, forumErr.message);
        }

        // 3. Recupera i promemoria di uscita salvati per determinare se sono già usciti
        try {
            const remindersResponse = await axios.get(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                params: {
                    username: `eq.${username}`,
                    select: '*'
                },
                headers: supabaseHeaders(),
                timeout: 10000
            });

            if (remindersResponse.data && Array.isArray(remindersResponse.data)) {
                remindersResponse.data.forEach(reminder => {
                    const releaseDateStr = reminder.release_date;
                    if (releaseDateStr) {
                        const releaseDate = new Date(releaseDateStr);
                        const now = new Date();
                        // Se la data di uscita è trascorsa o è oggi
                        if (releaseDate <= now) {
                            notifications.push({
                                id: `reminder_${reminder.tmdb_movie_id || reminder.id}`,
                                type: 'reminder',
                                title: 'Film Uscito!',
                                content: `Il film "${reminder.movie_title || reminder.title}" è uscito al cinema! (${releaseDate.toLocaleDateString()})`,
                                movie_id: reminder.tmdb_movie_id || reminder.id,
                                created_at: releaseDateStr
                            });
                        }
                    }
                });
            }
        } catch (remindersErr) {
            console.error(`❌ [Notifications Get] Errore recupero promemoria:`, remindersErr.message);
        }

        // Ordina le notifiche per data decrescente
        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return res.json(notifications);
    } catch (error) {
        console.error(`❌ [Notifications Get] ERRORE GENERALE:`, error.message);
        return res.status(500).json({ error: error.message });
    }
});


// =========================================
// MOVIE REMINDERS API (Supabase integration)
// =========================================

// Recupera tutti i promemoria di uscita salvati per un utente
app.get('/api/reminders/:username', async (req, res) => {
    const username = req.params.username;
    console.log(`📅 [Reminders Get] Richiesta promemoria per utente: ${username}`);

    try {
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
            params: {
                username: `eq.${username}`,
                order: 'created_at.desc',
                select: '*'
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`📅 [Reminders Get] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json(response.data);
    } catch (error) {
        console.error(`❌ [Reminders Get] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { error: error.message };
        return res.status(status).json(data);
    }
});

// Aggiunge un nuovo promemoria di uscita per un film
app.post('/api/reminders', async (req, res) => {
    const { username, tmdb_movie_id, title, poster_url, release_date, email } = req.body || {};
    console.log(`📅 [Reminder Insert] Utente '${username}' salva avviso per film '${title}' (ID: ${tmdb_movie_id})`);

    if (!username || !tmdb_movie_id) {
        return res.status(400).json({ success: false, message: 'Dati incompleti.' });
    }

    // Recupera l'email dal profilo utente nel DB (priorità rispetto a quella fornita dal client)
    let finalEmail = email || null;
    try {
        const userProfileRes = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
            params: {
                username: `eq.${username}`,
                select: 'email'
            },
            headers: supabaseHeaders(),
            timeout: 5000
        });
        if (userProfileRes.data && userProfileRes.data.length > 0 && userProfileRes.data[0].email) {
            finalEmail = userProfileRes.data[0].email;
            console.log(`📅 [Reminder Insert] Email recuperata dal profilo DB per '${username}': ${finalEmail}`);
        }
    } catch (profileErr) {
        console.warn(`⚠️ [Reminder Insert] Impossibile recuperare email dal profilo DB per '${username}':`, profileErr.message);
    }

    // Fallback: se non c'è email valida, prova dal profilo locale
    if (!finalEmail) {
        const localUser = getLocalProfileCaseInsensitive(username);
        if (localUser && localUser.email) {
            finalEmail = localUser.email;
            console.log(`📅 [Reminder Insert] Email recuperata dal profilo locale per '${username}': ${finalEmail}`);
        }
    }

    if (!finalEmail) {
        finalEmail = `${username}@stoike.cinema`;
        console.warn(`⚠️ [Reminder Insert] Nessuna email trovata per '${username}'. Utilizzo placeholder: ${finalEmail}`);
    }

    let finalTitle = title;
    let finalPosterUrl = poster_url;
    let finalReleaseDate = release_date;

    // Recupera informazioni mancanti o incomplete da TMDb
    try {
        console.log(`🔍 [TMDb Lookup] Recupero dettagli film da TMDb per ID ${tmdb_movie_id}...`);
        const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${tmdb_movie_id}`, {
            params: { api_key: TMDB_API_KEY, language: 'it-IT' },
            timeout: 5000
        });
        if (tmdbRes.data) {
            if (!finalTitle || finalTitle === 'undefined' || finalTitle === '') {
                finalTitle = tmdbRes.data.title;
            }
            if (!finalReleaseDate || finalReleaseDate === 'undefined' || finalReleaseDate === '') {
                finalReleaseDate = tmdbRes.data.release_date;
            }
            if (!finalPosterUrl || finalPosterUrl.includes('undefined') || finalPosterUrl.includes('placeholder') || finalPosterUrl === '') {
                finalPosterUrl = tmdbRes.data.poster_path
                    ? `https://image.tmdb.org/t/p/w500${tmdbRes.data.poster_path}`
                    : `https://via.placeholder.com/500x750/131313/FFFFFF?text=${encodeURIComponent(finalTitle || 'No+Cover')}`;
            }
        }
    } catch (tmdbErr) {
        console.warn(`⚠️ [TMDb Lookup] Fallito recupero da TMDb per ID ${tmdb_movie_id}: ${tmdbErr.message}`);
    }

    if (!finalTitle) {
        finalTitle = `Film #${tmdb_movie_id}`;
    }

    try {
        let response;
        try {
            console.log(`📅 [Reminder Insert] Tentativo inserimento con colonna 'notified'...`);
            response = await axios.post(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                username: username,
                tmdb_movie_id: parseInt(tmdb_movie_id),
                title: finalTitle,
                poster_url: finalPosterUrl || null,
                release_date: finalReleaseDate || null,
                email: finalEmail,
                notified: false
            }, {
                headers: supabaseHeaders(),
                timeout: 10000
            });
        } catch (dbErr) {
            const dbErrMsg = dbErr.response && dbErr.response.data && dbErr.response.data.message
                ? dbErr.response.data.message
                : dbErr.message;
            const isMissingNotified = dbErrMsg.includes("notified") || (dbErr.response && dbErr.response.data && dbErr.response.data.code === 'PGRST204');
            
            if (isMissingNotified) {
                console.warn(`⚠️ [Reminder Insert] Colonna 'notified' non configurata nel DB Supabase. Riprovo l'inserimento senza la colonna 'notified'...`);
                response = await axios.post(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                    username: username,
                    tmdb_movie_id: parseInt(tmdb_movie_id),
                    title: finalTitle,
                    poster_url: finalPosterUrl || null,
                    release_date: finalReleaseDate || null,
                    email: finalEmail
                }, {
                    headers: supabaseHeaders(),
                    timeout: 10000
                });
            } else {
                throw dbErr;
            }
        }

        console.log(`📅 [Reminder Insert] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json({ success: true, data: response.data ? response.data[0] : null });
    } catch (error) {
        console.error(`❌ [Reminder Insert] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        const message = error.response && error.response.data && error.response.data.message
            ? error.response.data.message
            : error.message;

        if (message.includes('duplicate key') || status === 409) {
            return res.status(409).json({ success: false, message: 'Avviso già inserito.' });
        }
        return res.status(status).json({ success: false, error: message });
    }
});

// Rimuove un promemoria di uscita film
app.delete('/api/reminders/:username/:movie_id', async (req, res) => {
    const { username, movie_id } = req.params;
    console.log(`🗑️ [Reminder Delete] Utente '${username}' rimuove avviso per film ID ${movie_id}`);

    try {
        const response = await axios.delete(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
            params: {
                username: `eq.${username}`,
                tmdb_movie_id: `eq.${movie_id}`
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`🗑️ [Reminder Delete] Risposta Supabase: Stato ${response.status}`);
        return res.status(response.status).json({ success: true });
    } catch (error) {
        console.error(`❌ [Reminder Delete] ERRORE:`, error.message);
        const status = error.response ? error.response.status : 500;
        return res.status(status).json({ success: false, error: error.message });
    }
});


// =========================================
// GESTIONE TICKET BUG REPORT (GITHUB API & WEBHOOK)
// =========================================
const rateLimitDb = new Map();
const RATE_LIMIT_LIMIT = 5;
const RATE_LIMIT_WINDOW = 3600 * 1000; // 1 ora in ms

app.post('/api/report-bug', async (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    // Pulisce e controlla il Rate Limiter per l'IP
    let timestamps = rateLimitDb.get(ip) || [];
    timestamps = timestamps.filter(t => now - t < RATE_LIMIT_WINDOW);
    rateLimitDb.set(ip, timestamps);

    if (timestamps.length >= RATE_LIMIT_LIMIT) {
        console.warn(`⚠️ [Rate Limit] Bloccata richiesta da IP ${ip} (troppe segnalazioni)`);
        return res.status(429).json({
            success: false,
            message: 'Troppe segnalazioni inviate. Riprova più tardi (max 5 all\'ora).'
        });
    }

    timestamps.push(now);

    const { title, description, email, currentPage, browserInfo, username } = req.body || {};

    if (!title || !description) {
        return res.status(400).json({ success: false, message: 'Titolo e descrizione sono obbligatori.' });
    }

    // Validazione formale dell'email
    if (email) {
        const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailPattern.test(email)) {
            return res.status(400).json({ success: false, message: 'Indirizzo email non valido.' });
        }
    }

    // Credenziali GitHub (con supporto a token specifici per utente)
    let githubToken = process.env.GITHUB_TOKEN;
    if (username) {
        const envKey = `GITHUB_TOKEN_${username.toUpperCase()}`;
        if (process.env[envKey]) {
            githubToken = process.env[envKey];
            console.log(`🔑 [GitHub API] Utilizzo token specifico per l'utente ${username} (${envKey})`);
        }
    }
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

    const issueBody = `# Bug Report

## Titolo
${title}

## Descrizione del bug
${description}

## Informazioni aggiuntive
- **Utente Stoike**: ${username || 'Anonimo'}
- **Email utente**: ${email || 'Non inserita'}
- **Pagina corrente**: ${currentPage}
- **Browser Info**: ${browserInfo}
`;

    // Funzione helper per salvataggio locale di fallback
    const saveLocalFallback = () => {
        try {
            const localBugsPath = path.join(__dirname, 'bug_reports.json');
            let bugs = [];
            if (fs.existsSync(localBugsPath)) {
                try {
                    bugs = JSON.parse(fs.readFileSync(localBugsPath, 'utf8'));
                } catch (e) {
                    bugs = [];
                }
            }
            const newBug = {
                id: Date.now(),
                title: `[Bug Report] ${title}`,
                body: issueBody,
                created_at: new Date().toISOString(),
                status: 'open_local'
            };
            bugs.push(newBug);
            fs.writeFileSync(localBugsPath, JSON.stringify(bugs, null, 2), 'utf8');
            console.log(`💾 [GitHub API Fallback] Segnalazione bug salvata con successo in locale: ${localBugsPath}`);
            return true;
        } catch (localErr) {
            console.error("❌ [GitHub API Fallback] Errore nel salvataggio locale:", localErr.message);
            return false;
        }
    };

    // Se la configurazione di GitHub manca o è a valore segnaposto (es. "your_github_...")
    const isPlaceholder = (val) => !val || val.includes('your_github_');
    if (isPlaceholder(githubToken) || isPlaceholder(githubOwner) || isPlaceholder(githubRepo)) {
        console.warn("⚠️ [GitHub API] Configurazione incompleta o con segnaposto in .env. Utilizzo del salvataggio locale di fallback.");
        if (saveLocalFallback()) {
            return res.json({
                success: true,
                message: 'Segnalazione salvata localmente (GitHub API non configurata).',
                issue_url: '#'
            });
        } else {
            return res.status(500).json({
                success: false,
                message: 'Errore di configurazione e salvataggio locale fallito.'
            });
        }
    }

    console.log(`🚀 [GitHub API] Creazione issue nel repo ${githubOwner}/${githubRepo} per bug: '${title}'...`);
    try {
        const response = await axios.post(
            `https://api.github.com/repos/${githubOwner}/${githubRepo}/issues`,
            {
                title: `[Bug Report] ${title}`,
                body: issueBody,
                labels: ['bug', 'user-report']
            },
            {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        console.log(`✅ [GitHub API] Risposta ricevuta: Stato ${response.status}`);
        if (response.status === 201) {
            return res.json({
                success: true,
                message: 'Segnalazione creata con successo!',
                issue_url: response.data.html_url
            });
        } else {
            console.error(`❌ [GitHub API] Creazione fallita, risposta:`, response.data);
            console.log(`⚠️ Tentativo di salvataggio locale di fallback...`);
            if (saveLocalFallback()) {
                return res.json({
                    success: true,
                    message: 'Segnalazione salvata localmente (GitHub API non disponibile).',
                    issue_url: '#'
                });
            } else {
                return res.status(502).json({
                    success: false,
                    message: `Errore risposta GitHub API. Stato: ${response.status}`
                });
            }
        }
    } catch (error) {
        console.error(`❌ [GitHub API] Eccezione di rete:`, error.message);
        console.log(`⚠️ Tentativo di salvataggio locale di fallback...`);
        if (saveLocalFallback()) {
            return res.json({
                success: true,
                message: 'Segnalazione salvata localmente (GitHub offline/non autorizzato).',
                issue_url: '#'
            });
        } else {
            return res.status(500).json({ success: false, message: 'Errore di connessione con le API di GitHub.' });
        }
    }
});


// Webhook firma di verifica
function verifyGithubSignature(rawBody, signatureHeader) {
    if (!signatureHeader) return false;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.warn("⚠️ [Webhook GitHub] Nessun GITHUB_WEBHOOK_SECRET configurato in .env!");
        return false;
    }

    if (!signatureHeader.includes('=')) return false;
    const [shaName, signature] = signatureHeader.split('=');
    if (shaName !== 'sha256') return false;

    const hmac = crypto.createHmac('sha256', webhookSecret);
    const digest = hmac.update(rawBody).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signature, 'utf8'));
    } catch (err) {
        return false;
    }
}

// GitHub Webhook Route
app.post('/api/webhook/github', express.raw({ type: 'application/json' }), async (req, res) => {
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = req.body; // Buffer grazie a express.raw

    if (!verifyGithubSignature(rawBody, signature)) {
        console.error("❌ [Webhook GitHub] Firma HMAC SHA-256 non valida o assente.");
        return res.status(401).json({ success: false, message: 'Firma non valida.' });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody.toString('utf8'));
    } catch (err) {
        return res.status(400).json({ success: false, message: 'JSON non valido.' });
    }

    if (!payload) {
        return res.status(400).json({ success: false, message: 'Payload vuoto.' });
    }

    const action = payload.action;
    const issue = payload.issue || {};

    if (action === 'closed') {
        const issueTitle = issue.title || '';
        const issueBody = issue.body || '';
        console.log(`🔔 [Webhook GitHub] Ticket chiuso: '${issueTitle}'`);

        // Estrae email e titolo originale
        const emailMatch = issueBody.match(/(?:## Email utente\s*\r?\n\s*|- \*\*Email utente\*\*:\s*|Email utente:\s*|Email:\s*)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
        const titleMatch = issueBody.match(/## Titolo\s*\r?\n\s*([^\r\n]+)/i);

        const userEmail = emailMatch ? emailMatch[1].trim() : null;
        let originalTitle = titleMatch ? titleMatch[1].trim() : null;

        if (!originalTitle) {
            originalTitle = issueTitle.replace('[Bug Report] ', '');
        }

        if (!userEmail) {
            console.log("ℹ️ [Webhook GitHub] Nessun indirizzo email trovato nel ticket. Invio notifica saltato.");
            return res.json({ success: true, message: 'Nessuna email nel ticket, notifica saltata.' });
        }

        console.log(`📧 [Webhook GitHub] Invio email di notifica risoluzione a '${userEmail}'...`);
        const subject = `[Stoike] Problema Risolto: ${originalTitle}`;

        const emailHtml = `
        <html>
        <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #0b0c10; color: #c5c6c7;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #121318; border: 1px solid rgba(255, 215, 0, 0.1); border-radius: 12px; margin-top: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #ffd700; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Stoike</h1>
                    <div style="height: 2px; width: 60px; background: linear-gradient(90deg, transparent, #ffd700, transparent); margin: 15px auto 0 auto;"></div>
                </div>
                <div style="font-size: 16px; line-height: 1.6; color: #c5c6c7; margin-bottom: 30px;">
                    <p style="font-size: 18px; color: #ffffff; font-weight: 600; margin-bottom: 20px;">Gentile Utente,</p>
                    <p>Siamo felici di comunicarti che il problema tecnico che ci hai segnalato è stato <strong>completamente risolto</strong> dal nostro team di supporto.</p>
                    
                    <div style="background-color: rgba(255,215,0,0.03); border-left: 4px solid #ffd700; padding: 15px 20px; margin: 25px 0; border-radius: 4px;">
                        <span style="font-size: 12px; text-transform: uppercase; color: #ffd700; font-weight: 700; display: block; margin-bottom: 5px;">Segnalazione Risolta</span>
                        <strong style="color: #ffffff; font-size: 16px;">${originalTitle}</strong>
                    </div>
                    
                    <p>Adesso puoi tornare a goderti Stoike al massimo delle sue funzionalità. Se riscontri ulteriori problemi, non esitare a contattarci di nuovo tramite il nostro pulsante di supporto fluttuante.</p>
                </div>
                <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 25px; font-size: 13px; color: rgba(255,255,255,0.4);">
                    <p>Grazie per averci aiutato a rendere Stoike un posto migliore!</p>
                    <p style="margin-top: 5px; font-weight: 600; color: #ffd700;">Il Team di Supporto Stoike</p>
                </div>
            </div>
        </body>
        </html>
        `;

        const smtpHost = process.env.SMTP_HOST;
        const smtpPort = process.env.SMTP_PORT || '587';
        const smtpUser = process.env.SMTP_USER;
        const smtpPass = process.env.SMTP_PASS;
        const smtpFrom = process.env.SMTP_FROM || '"Stoike Support" <noreply@stoike.cinema>';

        if (!smtpHost || !smtpUser || !smtpPass) {
            console.log("====================================================================");
            console.log("✉️  [MOCK EMAIL NOTIFICATION - TERMINAL LOGGING FALLBACK]");
            console.log(`FROM:    ${smtpFrom}`);
            console.log(`TO:      ${userEmail}`);
            console.log(`SUBJECT: ${subject}`);
            console.log("--------------------------------------------------------------------");
            console.log(`Gentile Utente, il problema '${originalTitle}' è stato risolto con successo!`);
            console.log("====================================================================");
        } else {
            const nodemailer = require('nodemailer');
            try {
                const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: parseInt(smtpPort),
                    secure: parseInt(smtpPort) === 465,
                    auth: {
                        user: smtpUser,
                        pass: smtpPass
                    }
                });

                await transporter.sendMail({
                    from: smtpFrom,
                    to: userEmail,
                    subject: subject,
                    html: emailHtml
                });
                console.log("✅ [Webhook GitHub] Email di risoluzione inviata con successo tramite SMTP!");
            } catch (smtpErr) {
                console.error(`❌ [Webhook GitHub] Errore nell'invio SMTP:`, smtpErr.message);
                console.log("====================================================================");
                console.log("✉️  [FALLBACK - MOCK EMAIL LOGGED TO TERMINAL]");
                console.log(`FROM:    ${smtpFrom}`);
                console.log(`TO:      ${userEmail}`);
                console.log(`SUBJECT: ${subject}`);
                console.log("====================================================================");
            }
        }
    }

    return res.json({ success: true, message: 'Webhook elaborato con successo.' });
});






// =========================================================================
// BACKGROUND WORKER - CONTROLLO AVVISI DI USCITA ED INVIO EMAIL DI NOTIFICA
// =========================================================================

// File locale per tracciare i promemoria già notificati (fallback se colonna 'notified' assente nel DB)
const NOTIFIED_TRACKER_PATH = path.join(__dirname, 'notified_reminders.json');

function loadNotifiedTracker() {
    try {
        if (fs.existsSync(NOTIFIED_TRACKER_PATH)) {
            return JSON.parse(fs.readFileSync(NOTIFIED_TRACKER_PATH, 'utf8'));
        }
    } catch (e) {
        console.warn("⚠️ [Release Worker] Impossibile leggere il file di tracking locale:", e.message);
    }
    return {};
}

function saveNotifiedTracker(tracker) {
    try {
        fs.writeFileSync(NOTIFIED_TRACKER_PATH, JSON.stringify(tracker, null, 2), 'utf8');
    } catch (e) {
        console.error("❌ [Release Worker] Impossibile salvare il file di tracking locale:", e.message);
    }
}

async function checkAndSendReleaseNotifications() {
    console.log("⏰ [Release Worker] Avvio controllo promemoria film in uscita...");
    try {
        let reminders = [];
        let hasNotifiedColumn = true;

        // Tentativo 1: Recupera solo i promemoria non ancora notificati (colonna 'notified' presente)
        try {
            const response = await axios.get(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                params: {
                    notified: 'eq.false',
                    select: '*'
                },
                headers: supabaseHeaders(),
                timeout: 15000
            });
            reminders = response.data || [];
            console.log(`⏰ [Release Worker] Recuperati ${reminders.length} promemoria con notified=false dal DB.`);
        } catch (dbErr) {
            const dbErrMsg = dbErr.response && dbErr.response.data && dbErr.response.data.message
                ? dbErr.response.data.message
                : dbErr.message;
            const isMissingNotified = dbErrMsg.includes("notified") || (dbErr.response && dbErr.response.data && dbErr.response.data.code === 'PGRST204');
            
            if (isMissingNotified) {
                hasNotifiedColumn = false;
                console.warn("⚠️ [Release Worker] Colonna 'notified' non trovata nel DB. Fallback: recupero TUTTI i promemoria e uso tracking locale...");
                
                // Tentativo 2: Recupera TUTTI i promemoria (senza filtro su notified)
                try {
                    const fallbackResponse = await axios.get(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                        params: {
                            select: '*'
                        },
                        headers: supabaseHeaders(),
                        timeout: 15000
                    });
                    reminders = fallbackResponse.data || [];
                    console.log(`⏰ [Release Worker] Recuperati ${reminders.length} promemoria totali dal DB (fallback).`);
                } catch (fallbackErr) {
                    console.error("❌ [Release Worker] Impossibile recuperare i promemoria dal DB:", fallbackErr.message);
                    return;
                }
            } else {
                throw dbErr;
            }
        }

        if (reminders.length === 0) {
            console.log("⏰ [Release Worker] Nessun promemoria presente nel database.");
            return;
        }

        // Carica il tracker locale (usato quando la colonna 'notified' non esiste)
        const localTracker = loadNotifiedTracker();

        // Se non c'è la colonna notified, filtra via i promemoria già tracciati localmente
        if (!hasNotifiedColumn) {
            const beforeCount = reminders.length;
            reminders = reminders.filter(r => {
                const trackingKey = `${r.username}_${r.tmdb_movie_id}`;
                return !localTracker[trackingKey];
            });
            console.log(`⏰ [Release Worker] Dopo filtro tracking locale: ${reminders.length} da controllare (${beforeCount - reminders.length} già notificati).`);
        }

        if (reminders.length === 0) {
            console.log("⏰ [Release Worker] Nessun promemoria da notificare.");
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        console.log(`⏰ [Release Worker] Data odierna locale: ${todayStr}. Analisi di ${reminders.length} promemoria...`);

        let trackerUpdated = false;

        for (const reminder of reminders) {
            let relDate = reminder.release_date;

            // Se la release_date è mancante, tenta di recuperarla da TMDb e aggiornare il DB
            if (!relDate && reminder.tmdb_movie_id) {
                console.log(`🔍 [Release Worker] release_date mancante per '${reminder.title}' (ID: ${reminder.tmdb_movie_id}). Tentativo recupero da TMDb...`);
                try {
                    const tmdbRes = await axios.get(`${TMDB_BASE_URL}/movie/${reminder.tmdb_movie_id}`, {
                        params: { api_key: TMDB_API_KEY, language: 'it-IT' },
                        timeout: 5000
                    });
                    if (tmdbRes.data && tmdbRes.data.release_date) {
                        relDate = tmdbRes.data.release_date;
                        console.log(`✅ [Release Worker] release_date recuperata da TMDb: ${relDate}. Aggiornamento DB...`);
                        // Aggiorna il record nel DB con la release_date recuperata
                        try {
                            await axios.patch(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                                release_date: relDate
                            }, {
                                params: { id: `eq.${reminder.id}` },
                                headers: supabaseHeaders(),
                                timeout: 10000
                            });
                        } catch (patchDateErr) {
                            console.warn(`⚠️ [Release Worker] Impossibile aggiornare release_date nel DB per ID ${reminder.id}:`, patchDateErr.message);
                        }
                    } else {
                        console.warn(`⚠️ [Release Worker] TMDb non ha restituito una release_date per ID ${reminder.tmdb_movie_id}. Salto questo promemoria.`);
                        continue;
                    }
                } catch (tmdbErr) {
                    console.warn(`⚠️ [Release Worker] Impossibile recuperare release_date da TMDb per ID ${reminder.tmdb_movie_id}:`, tmdbErr.message);
                    continue;
                }
            }

            if (!relDate) continue;

            if (relDate <= todayStr) {
                // Controlla che l'email sia valida e non sia un placeholder
                const email = reminder.email;
                if (!email || email.endsWith('@stoike.cinema') || email.trim() === '') {
                    console.warn(`⚠️ [Release Worker] Email non valida o placeholder per '${reminder.title}' (utente: ${reminder.username}, email: ${email}). Salto invio email ma segno come notificato.`);
                    // Segna come notificato per non ritentare
                    const trackingKey = `${reminder.username}_${reminder.tmdb_movie_id}`;
                    localTracker[trackingKey] = { notifiedAt: new Date().toISOString(), skipped: true, reason: 'invalid_email' };
                    trackerUpdated = true;
                    if (hasNotifiedColumn) {
                        try {
                            await axios.patch(`${SUPABASE_URL}/rest/v1/movie_reminders`, { notified: true }, {
                                params: { id: `eq.${reminder.id}` },
                                headers: supabaseHeaders(),
                                timeout: 10000
                            });
                        } catch (e) { /* ignora */ }
                    }
                    continue;
                }

                console.log(`📧 [Release Worker] Notifica film '${reminder.title}' (Uscita: ${relDate}) per '${email}'...`);

                const subject = `[Stoike] È uscito il film: ${reminder.title}!`;
                const emailHtml = `
                <html>
                <body style="margin: 0; padding: 0; font-family: 'Inter', sans-serif; background-color: #0b0c10; color: #c5c6c7;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #121318; border: 1px solid rgba(255, 215, 0, 0.1); border-radius: 12px; margin-top: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #ffd700; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -1px;">Stoike</h1>
                            <div style="height: 2px; width: 60px; background: linear-gradient(90deg, transparent, #ffd700, transparent); margin: 15px auto 0 auto;"></div>
                        </div>
                        <div style="text-align: center; margin-bottom: 30px;">
                            <img src="${reminder.poster_url || 'https://via.placeholder.com/300x450/131313/FFFFFF?text=No+Cover'}" alt="${reminder.title}" style="width: 200px; height: auto; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.05);" />
                        </div>
                        <div style="font-size: 16px; line-height: 1.6; color: #c5c6c7; margin-bottom: 30px; text-align: center;">
                            <p style="font-size: 20px; color: #ffffff; font-weight: 700; margin-bottom: 10px;">È arrivato il grande giorno!</p>
                            <p>Il film che stavi aspettando con ansia è finalmente uscito nelle sale ed è disponibile per te.</p>
                            
                            <div style="background-color: rgba(255,215,0,0.03); border: 1px solid rgba(255, 215, 0, 0.15); padding: 15px 20px; margin: 25px auto; border-radius: 8px; max-width: 400px;">
                                <span style="font-size: 11px; text-transform: uppercase; color: #ffd700; font-weight: 700; display: block; margin-bottom: 5px; letter-spacing: 1px;">Ora Disponibile</span>
                                <strong style="color: #ffffff; font-size: 18px; display: block;">${reminder.title}</strong>
                                <span style="color: #ffd700; font-size: 13px; display: block; margin-top: 5px;">Data Uscita: ${new Date(relDate).toLocaleDateString('it-IT')}</span>
                            </div>
                            
                            <p>Corri su Stoike per consultare le recensioni della community, votarlo o scrivere la tua recensione!</p>
                            
                            <a href="http://localhost:${PORT}/movie.html?id=${reminder.tmdb_movie_id}" style="display: inline-block; background-color: #ffd700; color: #0b0c10; font-weight: 700; padding: 12px 30px; border-radius: 30px; text-decoration: none; margin-top: 15px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(255,215,0,0.3);">Vedi Dettaglio Film</a>
                        </div>
                        <div style="text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 25px; font-size: 13px; color: rgba(255,255,255,0.4);">
                            <p>Hai ricevuto questa email perché hai attivato un promemoria per l'uscita di questo film su Stoike.</p>
                            <p style="margin-top: 5px; font-weight: 600; color: #ffd700;">Il Team Stoike</p>
                        </div>
                    </div>
                </body>
                </html>
                `;

                const smtpHost = process.env.SMTP_HOST;
                const smtpPort = process.env.SMTP_PORT || '587';
                const smtpUser = process.env.SMTP_USER;
                const smtpPass = process.env.SMTP_PASS;
                const smtpFrom = process.env.SMTP_FROM || '"Stoike Alerts" <noreply@stoike.cinema>';

                let emailSent = false;
                if (!smtpHost || !smtpUser || !smtpPass) {
                    console.log("====================================================================");
                    console.log("✉️  [MOCK EMAIL ALERTS - TERMINAL LOGGING FALLBACK]");
                    console.log(`FROM:    ${smtpFrom}`);
                    console.log(`TO:      ${email}`);
                    console.log(`SUBJECT: ${subject}`);
                    console.log("--------------------------------------------------------------------");
                    console.log(`È uscito il film '${reminder.title}'!`);
                    console.log("====================================================================");
                    emailSent = true;
                } else {
                    const nodemailer = require('nodemailer');
                    try {
                        const transporter = nodemailer.createTransport({
                            host: smtpHost,
                            port: parseInt(smtpPort),
                            secure: parseInt(smtpPort) === 465,
                            auth: {
                                user: smtpUser,
                                pass: smtpPass
                            }
                        });

                        await transporter.sendMail({
                            from: smtpFrom,
                            to: email,
                            subject: subject,
                            html: emailHtml
                        });
                        console.log(`✅ [Release Worker] Notifica email inviata con successo via SMTP a '${email}'!`);
                        emailSent = true;
                    } catch (smtpErr) {
                        console.error(`❌ [Release Worker] Errore invio SMTP:`, smtpErr.message);
                        console.log("====================================================================");
                        console.log("✉️  [FALLBACK - MOCK EMAIL LOGGED TO TERMINAL]");
                        console.log(`FROM:    ${smtpFrom}`);
                        console.log(`TO:      ${email}`);
                        console.log(`SUBJECT: ${subject}`);
                        console.log("====================================================================");
                        emailSent = true;
                    }
                }

                if (emailSent) {
                    // Aggiorna il flag notified nel DB (se la colonna esiste)
                    if (hasNotifiedColumn) {
                        try {
                            await axios.patch(`${SUPABASE_URL}/rest/v1/movie_reminders`, {
                                notified: true
                            }, {
                                params: {
                                    id: `eq.${reminder.id}`
                                },
                                headers: supabaseHeaders(),
                                timeout: 10000
                            });
                            console.log(`✅ [Release Worker] Stato notified impostato a TRUE per ID ${reminder.id}`);
                        } catch (patchErr) {
                            console.error(`❌ [Release Worker] Errore patch notified per ID ${reminder.id}:`, patchErr.message);
                        }
                    }
                    // Salva sempre nel tracker locale (backup e fallback)
                    const trackingKey = `${reminder.username}_${reminder.tmdb_movie_id}`;
                    localTracker[trackingKey] = { notifiedAt: new Date().toISOString(), title: reminder.title };
                    trackerUpdated = true;
                }
            }
        }

        // Salva il tracker locale se è stato aggiornato
        if (trackerUpdated) {
            saveNotifiedTracker(localTracker);
            console.log("💾 [Release Worker] Tracker locale aggiornato e salvato.");
        }
    } catch (err) {
        console.error("❌ [Release Worker] ERRORE GENERALE:", err.message);
    }
}

// Avvia il background worker dopo 5 secondi dallo startup, poi ogni 12 ore
setTimeout(checkAndSendReleaseNotifications, 5000);
setInterval(checkAndSendReleaseNotifications, 12 * 60 * 60 * 1000);


// =========================================
// AVVIO SERVER
// =========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(`🎬 Stoike Node.js Server avviato con successo!`);
    console.log(`Disponibile all'indirizzo: http://localhost:${PORT}`);
    console.log(`=============================================`);
});
