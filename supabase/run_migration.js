/**
 * STOIKE - Supabase Database Migration Runner
 * 
 * Questo script esegue automaticamente la migrazione SQL sul database Supabase.
 * Rileva automaticamente l'host del database a partire da SUPABASE_URL in .env,
 * installa 'pg' se non è presente, e applica il file SQL di setup.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Carica le variabili d'ambiente da .env
const envPath = path.join(__dirname, '../backend/.env');
const envRootPath = path.join(__dirname, '../.env');

let envContent = '';
if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync(envRootPath)) {
    envContent = fs.readFileSync(envRootPath, 'utf8');
}

// Semplice parser per .env
const config = {};
envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
        config[match[1].trim()] = match[2].trim();
    }
});

// 2. Determina i parametri del Database
let dbUrl = process.env.DATABASE_URL || config.DATABASE_URL || config.SUPABASE_DB_URL;
let dbPassword = process.env.SUPABASE_DB_PASSWORD || config.SUPABASE_DB_PASSWORD;
let supabaseUrl = process.env.SUPABASE_URL || config.SUPABASE_URL || '';

// Se abbiamo dbUrl, usiamo quello direttamente
let connectionString = dbUrl;

if (!connectionString) {
    // Tentiamo di ricavare l'host da supabaseUrl
    // Es: https://tsolrzumlrppryqgeqcm.supabase.co -> db.tsolrzumlrppryqgeqcm.supabase.co
    let dbHost = '';
    if (supabaseUrl) {
        const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
        if (match) {
            dbHost = `db.${match[1]}.supabase.co`;
        }
    }

    if (!dbHost) {
        console.error("❌ Errore: Impossibile trovare SUPABASE_URL o DATABASE_URL nel file .env.");
        console.log("Aggiungi nel tuo file .env:");
        console.log("SUPABASE_DB_PASSWORD=il_tuo_password_di_supabase");
        process.exit(1);
    }

    if (!dbPassword) {
        console.log("⚠️ Attenzione: SUPABASE_DB_PASSWORD non trovata nel file .env.");
        console.log("Inserisci la password del database di Supabase quando richiesto o definiscila in .env.");
        
        // Per semplicità d'uso non interattivo nell'automazione, leggiamo da argomento della riga di comando
        const passArg = process.argv.find(arg => arg.startsWith('--password='));
        if (passArg) {
            dbPassword = passArg.split('=')[1];
        } else {
            console.error("❌ Password mancante. Esegui il comando in questo modo:");
            console.log("node supabase/run_migration.js --password=LaTuaPasswordSupabase");
            process.exit(1);
        }
    }

    connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@${dbHost}:5432/postgres`;
}

// 3. Verifica ed installa la dipendenza 'pg' se mancante
try {
    require.resolve('pg');
} catch (e) {
    console.log("📦 Dipendenza 'pg' non trovata. Installazione automatica in corso...");
    try {
        execSync('npm install pg --no-save', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        console.log("✅ Libreria 'pg' installata con successo.");
    } catch (err) {
        console.error("❌ Impossibile installare 'pg':", err.message);
        process.exit(1);
    }
}

const { Client } = require('pg');

// 4. Carica il file SQL di setup
const sqlFilePath = path.join(__dirname, 'supabase_reminders_setup.sql');
if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ File SQL non trovato all'indirizzo: ${sqlFilePath}`);
    process.exit(1);
}

const sql = fs.readFileSync(sqlFilePath, 'utf8');
console.log(`📖 Caricato il file di migrazione SQL (${sql.length} byte).`);

// 5. Esegui la migrazione
console.log("🔌 Connessione al database Supabase in corso...");
const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false } // Supabase richiede SSL
});

client.connect()
    .then(async () => {
        console.log("✅ Connesso al database!");
        console.log("🚀 Esecuzione delle query SQL in corso...");
        
        try {
            await client.query(sql);
            console.log("=========================================");
            console.log("🎉 MIGRAZIONE COMPLETATA CON SUCCESSO!");
            console.log("La tabella 'movie_reminders' è pronta.");
            console.log("La policy RLS 'Allow public access' è attiva.");
            console.log("=========================================");
        } catch (err) {
            console.error("❌ Errore durante l'esecuzione del SQL:", err.message);
        } finally {
            await client.end();
            console.log("🔌 Connessione chiusa.");
        }
    })
    .catch(err => {
        console.error("❌ Connessione al database fallita:", err.message);
        process.exit(1);
    });
