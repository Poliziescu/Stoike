"""
STOIKE — Backend Server (Flask)
Gestisce le API routes per TMDb, autenticazione e recensioni.
Le chiavi API sono nascoste lato server in .env.
"""

import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv
import requests as http_requests

# Carica le variabili d'ambiente dal file .env
load_dotenv()

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



# =========================================
# AVVIO SERVER
# =========================================

if __name__ == '__main__':
    print('🎬 Stoike Server avviato su http://localhost:5001')
    app.run(debug=True, port=5001)
