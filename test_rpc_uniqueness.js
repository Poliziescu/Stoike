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

async function runTest() {
    console.log('Testing RPC Uniqueness check on Supabase...');
    
    // 1. Prova ad impostare nickname "Stoi" per l'utente "Stoi" (se esiste)
    try {
        const res1 = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/update_user_profile`, {
            p_username: 'Stoi',
            p_nickname: 'Stoi',
            p_avatar_url: null
        }, {
            headers: supabaseHeaders()
        });
        console.log('1. Risposta per utente Stoi:', res1.data);
    } catch (err) {
        console.error('1. Errore per utente Stoi:', err.response ? err.response.data : err.message);
    }

    // 2. Prova ad impostare lo STESSO nickname "Stoi" per l'utente "Mike"
    try {
        const res2 = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/update_user_profile`, {
            p_username: 'Mike',
            p_nickname: 'Stoi',
            p_avatar_url: null
        }, {
            headers: supabaseHeaders()
        });
        console.log('2. Risposta per utente Mike con nickname "Stoi":', res2.data);
    } catch (err) {
        console.error('2. Errore per utente Mike con nickname "Stoi":', err.response ? err.response.data : err.message);
    }
}

runTest();
