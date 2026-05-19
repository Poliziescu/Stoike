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
        return res.status(response.status).json(response.data);
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
    const { username, password } = req.body || {};
    console.log(`🔑 [Auth Register] Richiesta registrazione per: '${username}'`);

    try {
        const response = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/register_user`, {
            p_username: username,
            p_password: password
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
        // 1. Tenta query Supabase REST
        const response = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
            params: {
                username: `eq.${username}`,
                select: 'username,role,nickname,avatar_url'
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
                nickname: localUser.nickname || user.nickname || '',
                avatar_url: localUser.avatar_url || user.avatar_url || ''
            });
        } else {
            console.log(`👤 [Profile Get] Utente '${username}' non trovato in Supabase. Fallback locale.`);
            const localUser = getLocalProfileCaseInsensitive(username);
            
            return res.json({
                success: true,
                username: username,
                role: 'user',
                nickname: localUser.nickname || '',
                avatar_url: localUser.avatar_url || ''
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
            avatar_url: localUser.avatar_url || ''
        });
    }
});

// POST: Salva / Aggiorna profilo utente
app.post('/api/user/profile', async (req, res) => {
    const { username, nickname, avatar_data } = req.body || {};
    console.log(`👤 [Profile Update] Richiesta aggiornamento profilo per: '${username}', nickname: '${nickname}'`);
    
    if (!username) {
        return res.status(400).json({ success: false, message: 'Username obbligatorio.' });
    }

    let finalNickname = nickname ? nickname.trim() : '';

    // 1. Verifica dell'unicità del nickname
    if (finalNickname) {
        try {
            // Controlla su Supabase REST
            const response = await axios.get(`${SUPABASE_URL}/rest/v1/users`, {
                params: {
                    nickname: `eq.${finalNickname}`,
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
            // Fallback locale per verificare l'unicità
            const localProfiles = getLocalProfiles();
            const exists = Object.keys(localProfiles).some(u => 
                u !== username && localProfiles[u].nickname && localProfiles[u].nickname.toLowerCase() === finalNickname.toLowerCase()
            );
            if (exists) {
                return res.status(400).json({ success: false, message: 'Questo nickname è già in uso da un altro utente.' });
            }
        }
    }

    let avatarUrl = null;

    // 2. Decodifica e salvataggio dell'immagine profilo base64
    if (avatar_data) {
        try {
            const matches = avatar_data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                return res.status(400).json({ success: false, message: 'Formato immagine non valido.' });
            }
            const ext = matches[1];
            const base64Data = matches[2];
            const buffer = Buffer.from(base64Data, 'base64');
            
            const filename = `avatar_${username.toLowerCase()}_${Date.now()}.${ext}`;
            const filepath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filepath, buffer);
            avatarUrl = `/uploads/${filename}`;
            console.log(`💾 [Profile Update] Avatar salvato localmente: ${avatarUrl}`);
        } catch (err) {
            console.error("❌ Errore nel salvataggio dell'immagine:", err.message);
            return res.status(500).json({ success: false, message: 'Impossibile salvare l\'immagine del profilo.' });
        }
    }

    // 3. Esegui aggiornamento
    const updateData = {};
    if (finalNickname !== undefined) updateData.nickname = finalNickname;
    if (avatarUrl) updateData.avatar_url = avatarUrl;

    try {
        // Tenta salvataggio su Supabase REST
        const response = await axios.patch(`${SUPABASE_URL}/rest/v1/users`, updateData, {
            params: {
                username: `eq.${username}`
            },
            headers: supabaseHeaders(),
            timeout: 10000
        });
        console.log(`👤 [Profile Update] Supabase salvato con successo per '${username}'`);
    } catch (error) {
        console.warn(`⚠️ [Profile Update] Impossibile salvare in Supabase (colonne mancanti o errore). Fallback locale per '${username}':`, error.message);
    }

    // Salviamo SEMPRE anche in locale per garantire massima consistenza e funzionamento immediato
    saveLocalProfile(username, updateData);

    // Recuperiamo il profilo aggiornato per restituire i dati definitivi completi
    const finalProfile = getLocalProfileCaseInsensitive(username);

    return res.json({
        success: true,
        message: 'Profilo salvato con successo!',
        nickname: finalProfile.nickname || finalNickname,
        avatar_url: finalProfile.avatar_url || undefined
    });
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

    const { title, description, email, currentPage, browserInfo } = req.body || {};
    
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

    // Credenziali GitHub
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER;
    const githubRepo = process.env.GITHUB_REPO;

    const issueBody = `# Bug Report

## Titolo
${title}

## Descrizione del bug
${description}

## Informazioni aggiuntive
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
        const emailMatch = issueBody.match(/## Email utente\s*\r?\n\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
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


// =========================================
// AVVIO SERVER
// =========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`=============================================`);
    console.log(`🎬 Stoike Node.js Server avviato con successo!`);
    console.log(`Disponibile all'indirizzo: http://localhost:${PORT}`);
    console.log(`=============================================`);
});
