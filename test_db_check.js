const axios = require('axios');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

function supabaseHeaders() {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
    };
}

async function runCheck() {
    console.log('🔌 Connessione a Supabase:', SUPABASE_URL);
    
    // 1. Controlla colonne della tabella users
    try {
        const res = await axios.get(`${SUPABASE_URL}/rest/v1/users?select=*&limit=1`, {
            headers: supabaseHeaders()
        });
        console.log('✅ Tabella "users" letta con successo!');
        if (res.data && res.data.length > 0) {
            const user = res.data[0];
            console.log('Colonne disponibili:', Object.keys(user));
            console.log('Esempio record:', user);
        } else {
            console.log('Nessun record nella tabella "users", ma la tabella esiste.');
        }
    } catch (err) {
        console.error('❌ Errore lettura tabella "users":', err.response ? err.response.data : err.message);
    }

    // 2. Controlla se la RPC get_user_profile esiste
    try {
        const res = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/get_user_profile`, {
            p_username: 'Mike'
        }, {
            headers: supabaseHeaders()
        });
        console.log('✅ RPC "get_user_profile" esiste ed è funzionante! Risposta:', res.data);
    } catch (err) {
        console.error('❌ Errore RPC "get_user_profile":', err.response ? err.response.data : err.message);
    }

    // 3. Controlla se la RPC update_user_profile esiste
    try {
        const res = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/update_user_profile`, {
            p_username: 'Mike',
            p_nickname: 'MikeTestUnico',
            p_avatar_url: null
        }, {
            headers: supabaseHeaders()
        });
        console.log('✅ RPC "update_user_profile" esiste ed è funzionante! Risposta:', res.data);
    } catch (err) {
        console.error('❌ Errore RPC "update_user_profile":', err.response ? err.response.data : err.message);
    }
}

runCheck();
