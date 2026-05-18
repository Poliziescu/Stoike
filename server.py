"""
STOIKE — Backend Server (Flask)
Gestisce le API routes per TMDb, autenticazione e recensioni.
Le chiavi API sono nascoste lato server in .env.
"""

import sys
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import requests as http_requests

# Configura stdout/stderr per forzare UTF-8 ed evitare crash con emoji su Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Carica le variabili d'ambiente dal file .env (cerca sia in root che in backend/.env)
load_dotenv()
if os.path.exists('backend/.env'):
    load_dotenv('backend/.env')

app = Flask(__name__, static_folder='public', static_url_path='')
CORS(app)

# Configurazione
TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# Headers per Supabase REST API
def supabase_headers():
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    }

# =========================================
# SERVE FRONTEND STATICO
# =========================================

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('public', path)


# =========================================
# PROXY TMDb API
# =========================================

@app.route('/api/tmdb/<path:endpoint>')
def proxy_tmdb(endpoint):
    """Proxy generico per qualsiasi endpoint TMDb. Nasconde l'API key."""
    params = dict(request.args)
    params['api_key'] = TMDB_API_KEY
    if 'language' not in params:
        params['language'] = 'it-IT'
    
    # Rimuoviamo il parametro cache buster '_t' prima di inviarlo a TMDb
    if '_t' in params:
        params.pop('_t')

    target_url = f'{TMDB_BASE_URL}/{endpoint}'
    print(f"🔍 [TMDb Proxy] Chiamata a: {target_url} con parametri: {params}")
    
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        resp = http_requests.get(target_url, params=params, headers=headers, timeout=10)
        print(f"✅ [TMDb Proxy] Risposta ricevuta: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [TMDb Proxy] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500


# =========================================
# AUTENTICAZIONE (via Supabase RPC)
# =========================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login utente tramite la RPC login_user di Supabase."""
    body = request.get_json()
    username = body.get('username', '')
    password = body.get('password', '')
    print(f"🔑 [Auth Login] Richiesta login per: '{username}'")
    
    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/login_user',
            headers=supabase_headers(),
            json={'p_username': username, 'p_password': password},
            timeout=10
        )
        print(f"🔑 [Auth Login] Risposta Supabase: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [Auth Login] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/auth/register', methods=['POST'])
def register():
    """Registrazione utente tramite la RPC register_user di Supabase."""
    body = request.get_json()
    username = body.get('username', '')
    password = body.get('password', '')
    print(f"🔑 [Auth Register] Richiesta registrazione per: '{username}'")
    
    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/register_user',
            headers=supabase_headers(),
            json={'p_username': username, 'p_password': password},
            timeout=10
        )
        print(f"🔑 [Auth Register] Risposta Supabase: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [Auth Register] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500


# =========================================
# RECENSIONI
# =========================================

@app.route('/api/reviews/<int:movie_id>', methods=['GET'])
def get_reviews(movie_id):
    """Recupera le recensioni per un film specifico da Supabase."""
    print(f"💬 [Reviews Get] Chiamata per film ID: {movie_id}")
    try:
        resp = http_requests.get(
            f'{SUPABASE_URL}/rest/v1/reviews',
            headers=supabase_headers(),
            params={
                'tmdb_movie_id': f'eq.{movie_id}',
                'order': 'created_at.desc',
                'select': '*'
            },
            timeout=10
        )
        print(f"💬 [Reviews Get] Risposta Supabase: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [Reviews Get] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews', methods=['POST'])
def insert_review():
    """Inserisce una nuova recensione tramite la RPC insert_review di Supabase."""
    body = request.get_json()
    username = body.get('username')
    movie_id = body.get('tmdb_movie_id')
    print(f"💬 [Review Insert] Utente '{username}' inserisce per film ID {movie_id}")
    
    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/insert_review',
            headers=supabase_headers(),
            json={
                'p_username': username,
                'p_tmdb_movie_id': movie_id,
                'p_author': body.get('author'),
                'p_review_text': body.get('review_text'),
                'p_rating': body.get('rating')
            },
            timeout=10
        )
        print(f"💬 [Review Insert] Risposta Supabase: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [Review Insert] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews/<review_id>', methods=['PUT'])
def update_review(review_id):
    """Aggiorna una recensione esistente tramite la RPC update_review di Supabase."""
    body = request.get_json()
    username = body.get('username')
    print(f"💬 [Review Update] Utente '{username}' modifica recensione ID {review_id}")
    
    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/update_review',
            headers=supabase_headers(),
            json={
                'p_review_id': review_id,
                'p_username': username,
                'p_new_text': body.get('review_text'),
                'p_new_rating': body.get('rating')
            },
            timeout=10
        )
        print(f"💬 [Review Update] Risposta Supabase: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [Review Update] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/reviews/<review_id>', methods=['DELETE'])
def delete_review(review_id):
    """Cancella una recensione tramite la RPC delete_review di Supabase."""
    # Ottiene i parametri JSON o query parameters per lo username
    body = request.get_json() or {}
    username = body.get('username') or request.args.get('username')
    print(f"🗑️ [Review Delete] Utente '{username}' richiede cancellazione recensione ID {review_id}")
    
    if not username:
        return jsonify({'error': 'Username obbligatorio'}), 400
        
    try:
        resp = http_requests.post(
            f'{SUPABASE_URL}/rest/v1/rpc/delete_review',
            headers=supabase_headers(),
            json={
                'p_review_id': review_id,
                'p_username': username
            },
            timeout=10
        )
        print(f"🗑️ [Review Delete] Risposta Supabase: Stato {resp.status_code}")
        return jsonify(resp.json()), resp.status_code
    except Exception as e:
        print(f"❌ [Review Delete] ERRORE: {str(e)}")
        return jsonify({'error': str(e)}), 500



# =========================================
# GESTIONE TICKET BUG REPORT (GITHUB API & WEBHOOK)
# =========================================

import time
import re
import hmac
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from collections import defaultdict

# Dizionario in memoria per memorizzare i timestamp dei tentativi di invio bug per IP
rate_limit_db = defaultdict(list)
RATE_LIMIT_LIMIT = 5  # max 5 segnalazioni
RATE_LIMIT_WINDOW = 3600  # 1 ora in secondi

def get_client_ip():
    if request.headers.getlist("X-Forwarded-For"):
        return request.headers.getlist("X-Forwarded-For")[0]
    return request.remote_addr

def verify_github_signature(raw_body, signature_header):
    if not signature_header:
        return False
    webhook_secret = os.getenv('GITHUB_WEBHOOK_SECRET')
    if not webhook_secret:
        print("⚠️ [Webhook GitHub] Nessun GITHUB_WEBHOOK_SECRET configurato in .env!")
        return False
    # La firma viene inviata nel formato: sha256=firma_esadecimale
    if '=' not in signature_header:
        return False
    sha_name, signature = signature_header.split('=', 1)
    if sha_name != 'sha256':
        return False
    mac = hmac.new(webhook_secret.encode('utf-8'), raw_body, hashlib.sha256)
    return hmac.compare_digest(mac.hexdigest(), signature)

@app.route('/api/report-bug', methods=['POST'])
def report_bug():
    """Valida, limita e invia la segnalazione bug a GitHub creando una nuova Issue."""
    ip = get_client_ip()
    now = time.time()
    
    # Pulisce i timestamp obsoleti
    rate_limit_db[ip] = [t for t in rate_limit_db[ip] if now - t < RATE_LIMIT_WINDOW]
    
    if len(rate_limit_db[ip]) >= RATE_LIMIT_LIMIT:
        print(f"⚠️ [Rate Limit] Bloccata richiesta da IP {ip} (troppe segnalazioni)")
        return jsonify({
            'success': False,
            'message': 'Troppe segnalazioni inviate. Riprova più tardi (max 5 all\'ora).'
        }), 429
        
    try:
        body = request.get_json()
    except Exception:
        return jsonify({'success': False, 'message': 'Dati richiesta non validi.'}), 400
        
    if not body:
        return jsonify({'success': False, 'message': 'Richiesta vuota.'}), 400
        
    title = body.get('title', '').strip()
    description = body.get('description', '').strip()
    email = body.get('email', '').strip()
    current_page = body.get('currentPage', '').strip()
    browser_info = body.get('browserInfo', '').strip()
    
    if not title or not description:
        return jsonify({'success': False, 'message': 'Titolo e descrizione sono obbligatori.'}), 400
        
    # Validazione formale dell'email (se fornita)
    if email:
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email):
            return jsonify({'success': False, 'message': 'Indirizzo email non valido.'}), 400
            
    # Registra il timestamp per il rate limiter
    rate_limit_db[ip].append(now)
    
    # Recupera credenziali GitHub
    github_token = os.getenv('GITHUB_TOKEN')
    github_owner = os.getenv('GITHUB_OWNER')
    github_repo = os.getenv('GITHUB_REPO')
    
    if not github_token or not github_owner or not github_repo:
        print("❌ [GitHub API] Configurazione incompleta in .env (mancano TOKEN/OWNER/REPO)")
        return jsonify({
            'success': False,
            'message': 'Configurazione del server incompleta (GitHub API non configurata).'
        }), 500
        
    issue_body = f"""# Bug Report

## Titolo
{title}

## Descrizione del bug
{description}

## Informazioni aggiuntive
- **Email utente**: {email if email else 'Non inserita'}
- **Pagina corrente**: {current_page}
- **Browser Info**: {browser_info}
"""

    headers = {
        'Authorization': f'token {github_token}',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    }
    
    target_url = f'https://api.github.com/repos/{github_owner}/{github_repo}/issues'
    payload = {
        'title': f'[Bug Report] {title}',
        'body': issue_body,
        'labels': ['bug', 'user-report']
    }
    
    print(f"🚀 [GitHub API] Creazione issue nel repo {github_owner}/{github_repo} per bug: '{title}'...")
    try:
        resp = http_requests.post(target_url, headers=headers, json=payload, timeout=10)
        print(f"✅ [GitHub API] Risposta ricevuta: Stato {resp.status_code}")
        
        if resp.status_code == 201:
            data = resp.json()
            return jsonify({
                'success': True,
                'message': 'Segnalazione creata con successo!',
                'issue_url': data.get('html_url')
            })
        else:
            print(f"❌ [GitHub API] Creazione fallita: {resp.text}")
            return jsonify({
                'success': False,
                'message': f'Errore risposta GitHub API. Stato: {resp.status_code}'
            }), 502
    except Exception as e:
        print(f"❌ [GitHub API] Eccezione di rete: {str(e)}")
        return jsonify({'success': False, 'message': 'Errore di connessione con le API di GitHub.'}), 500

@app.route('/api/webhook/github', methods=['POST'])
def github_webhook():
    """Riceve i webhook da GitHub ed invia un'email all'utente quando la issue viene chiusa."""
    signature = request.headers.get('X-Hub-Signature-256')
    raw_body = request.get_data()
    
    # Verifica firma crittografica del webhook
    if not verify_github_signature(raw_body, signature):
        print("❌ [Webhook GitHub] Firma HMAC SHA-256 non valida o assente.")
        return jsonify({'success': False, 'message': 'Firma non valida.'}), 401
        
    try:
        payload = request.get_json()
    except Exception:
        return jsonify({'success': False, 'message': 'JSON non valido.'}), 400
        
    if not payload:
        return jsonify({'success': False, 'message': 'Payload vuoto.'}), 400
        
    action = payload.get('action')
    issue = payload.get('issue', {})
    
    if action == 'closed':
        issue_title = issue.get('title', '')
        issue_body = issue.get('body', '')
        print(f"🔔 [Webhook GitHub] Ticket chiuso: '{issue_title}'")
        
        # Estrae email e titolo originale dal corpo in Markdown
        email_match = re.search(r"## Email utente\s*\r?\n\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", issue_body, re.IGNORECASE)
        title_match = re.search(r"## Titolo\s*\r?\n\s*([^\r\n]+)", issue_body, re.IGNORECASE)
        
        user_email = email_match.group(1).strip() if email_match else None
        original_title = title_match.group(1).strip() if title_match else None
        
        if not original_title:
            original_title = issue_title.replace('[Bug Report] ', '')
            
        if not user_email:
            print("ℹ️ [Webhook GitHub] Nessun indirizzo email trovato nel ticket. Invio notifica saltato.")
            return jsonify({'success': True, 'message': 'Nessuna email nel ticket, notifica saltata.'})
            
        print(f"📧 [Webhook GitHub] Invio email di notifica risoluzione a '{user_email}'...")
        
        subject = f"[Stoike] Problema Risolto: {original_title}"
        email_html = f"""
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
                        <strong style="color: #ffffff; font-size: 16px;">{original_title}</strong>
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
        """
        
        # Configurazione SMTP
        smtp_host = os.getenv('SMTP_HOST')
        smtp_port = os.getenv('SMTP_PORT', '587')
        smtp_user = os.getenv('SMTP_USER')
        smtp_pass = os.getenv('SMTP_PASS')
        smtp_from = os.getenv('SMTP_FROM', '"Stoike Support" <noreply@stoike.cinema>')
        
        if not smtp_host or not smtp_user or not smtp_pass:
            print("====================================================================")
            print("✉️  [MOCK EMAIL NOTIFICATION - TERMINAL LOGGING FALLBACK]")
            print(f"FROM:    {smtp_from}")
            print(f"TO:      {user_email}")
            print(f"SUBJECT: {subject}")
            print("--------------------------------------------------------------------")
            print(f"Gentile Utente, il problema '{original_title}' è stato risolto con successo!")
            print("====================================================================")
        else:
            try:
                msg = MIMEMultipart('alternative')
                msg['Subject'] = subject
                msg['From'] = smtp_from
                msg['To'] = user_email
                
                part_html = MIMEText(email_html, 'html', 'utf-8')
                msg.attach(part_html)
                
                port = int(smtp_port)
                if port == 465:
                    server = smtplib.SMTP_SSL(smtp_host, port, timeout=10)
                else:
                    server = smtplib.SMTP(smtp_host, port, timeout=10)
                    server.starttls()
                    
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, user_email, msg.as_string())
                server.quit()
                print("✅ [Webhook GitHub] Email di risoluzione inviata con successo tramite SMTP!")
            except Exception as smtp_err:
                print(f"❌ [Webhook GitHub] Errore nell'invio SMTP: {str(smtp_err)}")
                print("====================================================================")
                print("✉️  [FALLBACK - MOCK EMAIL LOGGED TO TERMINAL]")
                print(f"FROM:    {smtp_from}")
                print(f"TO:      {user_email}")
                print(f"SUBJECT: {subject}")
                print("====================================================================")
                
    return jsonify({'success': True, 'message': 'Webhook elaborato con successo.'})


# =========================================
# AVVIO SERVER
# =========================================
# AVVIO SERVER
# =========================================

if __name__ == '__main__':
    print('🎬 Stoike Server avviato su http://localhost:5001')
    app.run(debug=True, port=5001)
