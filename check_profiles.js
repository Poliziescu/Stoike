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
    console.log('Reading profiles from Supabase...');
    
    try {
        const resMike = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/get_user_profile`, {
            p_username: 'Mike'
        }, {
            headers: supabaseHeaders()
        });
        console.log('Profilo "Mike" nel DB:', resMike.data);
    } catch (err) {
        console.error('Errore Mike:', err.message);
    }

    try {
        const resStoi = await axios.post(`${SUPABASE_URL}/rest/v1/rpc/get_user_profile`, {
            p_username: 'Stoi'
        }, {
            headers: supabaseHeaders()
        });
        console.log('Profilo "Stoi" nel DB:', resStoi.data);
    } catch (err) {
        console.error('Errore Stoi:', err.message);
    }
}

runCheck();
