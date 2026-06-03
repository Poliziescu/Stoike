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
OMDB_API_KEY = os.getenv('OMDB_API_KEY', '801b4332')
TMDB_BASE_URL = 'https://api.themoviedb.org/3'
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

# OMDb API Mappings and Helpers
GENRE_MAP = {
    "Action": 28, "Adventure": 12, "Animation": 16, "Comedy": 35,
    "Crime": 80, "Documentary": 99, "Drama": 18, "Family": 10751,
    "Fantasy": 14, "History": 36, "Horror": 27, "Music": 10402,
    "Mystery": 9648, "Romance": 10749, "Science Fiction": 878,
    "Sci-Fi": 878, "TV Movie": 10770, "Thriller": 53, "War": 10752,
    "Western": 37
}

STATIC_GENRES = [
    { "id": 28, "name": "Action" },
    { "id": 12, "name": "Adventure" },
    { "id": 16, "name": "Animation" },
    { "id": 35, "name": "Comedy" },
    { "id": 80, "name": "Crime" },
    { "id": 99, "name": "Documentary" },
    { "id": 18, "name": "Drama" },
    { "id": 10751, "name": "Family" },
    { "id": 14, "name": "Fantasy" },
    { "id": 36, "name": "History" },
    { "id": 27, "name": "Horror" },
    { "id": 10402, "name": "Music" },
    { "id": 9648, "name": "Mystery" },
    { "id": 10749, "name": "Romance" },
    { "id": 878, "name": "Science Fiction" },
    { "id": 10770, "name": "TV Movie" },
    { "id": 53, "name": "Thriller" },
    { "id": 10752, "name": "War" },
    { "id": 37, "name": "Western" }
]

person_cache = {}

def parse_imdb_id_to_id(imdb_id):
    if not imdb_id:
        return None
    import re
    match = re.match(r'tt(\d+)', imdb_id)
    return int(match.group(1)) if match else None

def format_id_to_imdb_id(movie_id):
    if not movie_id:
        return None
    id_str = str(movie_id)
    if len(id_str) < 7:
        return 'tt' + id_str.zfill(7)
    return 'tt' + id_str

def hash_string_to_int(s):
    if not s:
        return 0
    h = 0
    for char in s:
        h = ord(char) + ((h << 5) - h)
    return abs(h)

def clean_release_date(released_str, year_str):
    if released_str and released_str != 'N/A':
        from datetime import datetime
        try:
            d = datetime.strptime(released_str, '%d %b %Y')
            return d.strftime('%Y-%m-%d')
        except ValueError:
            pass
    if year_str and year_str != 'N/A':
        y = year_str.split('–')[0]
        return f"{y}-01-01"
    return 'N/A'

def get_franchise_query(title):
    if not title:
        return None
    clean = title.split(':')[0].split(' - ')[0]
    import re
    clean = re.sub(r'\s+\d+$', '', clean).strip()
    return clean if len(clean) >= 4 else None

def map_omdb_detail_to_tmdb(d):
    movie_id = parse_imdb_id_to_id(d.get('imdbID'))
    imdb_rating = d.get('imdbRating')
    rating = float(imdb_rating) if imdb_rating and imdb_rating != 'N/A' else 0.0
    release_date = clean_release_date(d.get('Released'), d.get('Year'))
    
    genre_str = d.get('Genre')
    genre_names = genre_str.split(', ') if genre_str and genre_str != 'N/A' else []
    genre_ids = [GENRE_MAP[g] for g in genre_names if g in GENRE_MAP]
    genres = [{'id': genre_ids[idx] if idx < len(genre_ids) else 1000 + idx, 'name': name} for idx, name in enumerate(genre_names)]
    
    franchise = get_franchise_query(d.get('Title'))
    belongs_to_collection = {
        'id': movie_id,
        'name': f"{franchise} Collection"
    } if franchise else None
    
    imdb_votes = d.get('imdbVotes')
    votes = int(imdb_votes.replace(',', '')) if imdb_votes and imdb_votes != 'N/A' else 0

    return {
        'id': movie_id,
        'title': d.get('Title'),
        'original_title': d.get('Title'),
        'genres': genres,
        'genre_ids': genre_ids,
        'vote_average': rating,
        'vote_count': votes,
        'release_date': release_date,
        'poster_path': d.get('Poster') if d.get('Poster') and d.get('Poster') != 'N/A' else None,
        'backdrop_path': d.get('Poster') if d.get('Poster') and d.get('Poster') != 'N/A' else None,
        'overview': d.get('Plot') if d.get('Plot') and d.get('Plot') != 'N/A' else '',
        'belongs_to_collection': belongs_to_collection
    }

def fetch_movie_details_from_omdb(imdb_id):
    try:
        r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 'i': imdb_id, 'plot': 'short'}, timeout=5)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None

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
    params = dict(request.args)
    print(f"🔍 [OMDb Proxy] Intercettato endpoint TMDB: {endpoint} con parametri: {params}")
    
    try:
        # 1. GENRES
        if endpoint == 'genre/movie/list':
            return jsonify({'genres': STATIC_GENRES})
            
        # 2. TRENDING
        if endpoint == 'trending/movie/week':
            TRENDING_TITLES = [
                "Dune: Part Two", "Deadpool & Wolverine", "Inside Out 2", "Gladiator II", 
                "Oppenheimer", "Barbie", "Spider-Man: Across the Spider-Verse", "The Batman", 
                "Interstellar", "Inception", "The Dark Knight", "Avatar: The Way of Water"
            ]
            page = int(params.get('page', 1))
            limit = 10
            start = (page - 1) * limit
            titles_slice = TRENDING_TITLES[start:start + limit]
            
            movies = []
            for title in titles_slice:
                r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 't': title, 'type': 'movie'}, timeout=5)
                if r.status_code == 200 and r.json().get('Response') == 'True':
                    movies.append(map_omdb_detail_to_tmdb(r.json()))
            return jsonify({
                'results': movies,
                'page': page,
                'total_pages': (len(TRENDING_TITLES) + limit - 1) // limit,
                'total_results': len(TRENDING_TITLES)
            })
            
        # 3. NOW PLAYING
        if endpoint == 'movie/now_playing':
            NOW_PLAYING_TITLES = [
                "Furiosa: A Mad Max Saga", "The Fall Guy", "Civil War", "Challengers", 
                "IF", "Godzilla x Kong: The New Empire", "Kingdom of the Planet of the Apes",
                "A Quiet Place: Day One", "Despicable Me 4", "Twisters", "Alien: Romulus"
            ]
            movies = []
            for title in NOW_PLAYING_TITLES[:10]:
                r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 't': title, 'type': 'movie'}, timeout=5)
                if r.status_code == 200 and r.json().get('Response') == 'True':
                    movies.append(map_omdb_detail_to_tmdb(r.json()))
            return jsonify({
                'results': movies,
                'page': 1,
                'total_pages': 1,
                'total_results': len(movies)
            })
            
        # 4. SEARCH MOVIE
        if endpoint == 'search/movie':
            query = params.get('query')
            year = params.get('primary_release_year')
            page = int(params.get('page', 1))
            if not query:
                return jsonify({'results': [], 'total_results': 0, 'total_pages': 0})
                
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 's': query, 'y': year, 'page': page, 'type': 'movie'}, timeout=5)
            if r.status_code == 200 and r.json().get('Search'):
                movies = []
                for item in r.json().get('Search'):
                    detail = fetch_movie_details_from_omdb(item.get('imdbID'))
                    if detail:
                        movies.append(map_omdb_detail_to_tmdb(detail))
                total = int(r.json().get('totalResults', 0))
                return jsonify({
                    'results': movies,
                    'total_results': total,
                    'total_pages': (total + 9) // 10
                })
            return jsonify({'results': [], 'total_results': 0, 'total_pages': 0})

        # 5. DISCOVER MOVIE
        if endpoint == 'discover/movie':
            year = params.get('primary_release_year')
            page = int(params.get('page', 1))
            query = "the"
            if params.get('with_genres'):
                genre_id = int(params.get('with_genres'))
                genre_keywords = {
                    28: "action", 12: "adventure", 16: "animated", 35: "comedy",
                    80: "crime", 99: "documentary", 18: "drama", 10751: "family",
                    14: "fantasy", 36: "history", 27: "horror", 10402: "music",
                    9648: "mystery", 10749: "romance", 878: "sci-fi", 53: "thriller",
                    10752: "war", 37: "western"
                }
                query = genre_keywords.get(genre_id, "movie")
                
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 's': query, 'y': year, 'page': page, 'type': 'movie'}, timeout=5)
            if r.status_code == 200 and r.json().get('Search'):
                movies = []
                for item in r.json().get('Search'):
                    detail = fetch_movie_details_from_omdb(item.get('imdbID'))
                    if detail:
                        movies.append(map_omdb_detail_to_tmdb(detail))
                total = int(r.json().get('totalResults', 0))
                return jsonify({
                    'results': movies,
                    'total_results': total,
                    'total_pages': (total + 9) // 10
                })
            return jsonify({'results': [], 'total_results': 0, 'total_pages': 0})
            
        # 6. MOVIE DETAIL
        import re
        movie_detail_match = re.match(r'^movie/(\d+)$', endpoint)
        if movie_detail_match:
            movie_id = int(movie_detail_match.group(1))
            imdb_id = format_id_to_imdb_id(movie_id)
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 'i': imdb_id, 'plot': 'full'}, timeout=5)
            if r.status_code == 200 and r.json().get('Response') == 'True':
                return jsonify(map_omdb_detail_to_tmdb(r.json()))
            return jsonify({'error': 'Film non trovato'}), 404
            
        # 7. MOVIE CREDITS
        movie_credits_match = re.match(r'^movie/(\d+)/credits$', endpoint)
        if movie_credits_match:
            movie_id = int(movie_credits_match.group(1))
            imdb_id = format_id_to_imdb_id(movie_id)
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 'i': imdb_id}, timeout=5)
            if r.status_code == 200 and r.json().get('Response') == 'True':
                d = r.json()
                actors = d.get('Actors', '')
                actor_names = actors.split(', ') if actors and actors != 'N/A' else []
                cast = []
                for name in actor_names:
                    actor_id = hash_string_to_int(name)
                    person_cache[actor_id] = name
                    cast.append({
                        'id': actor_id,
                        'name': name,
                        'character': 'Actor',
                        'profile_path': None
                    })
                crew = []
                director = d.get('Director', '')
                if director and director != 'N/A':
                    for name in director.split(', '):
                        crew.append({'id': hash_string_to_int(name), 'name': name, 'job': 'Director'})
                writer = d.get('Writer', '')
                if writer and writer != 'N/A':
                    for name in writer.split(', '):
                        crew.append({'id': hash_string_to_int(name), 'name': name, 'job': 'Writer'})
                return jsonify({'cast': cast, 'crew': crew})
            return jsonify({'error': 'Film non trovato'}), 404

        # 8. MOVIE VIDEOS
        movie_videos_match = re.match(r'^movie/(\d+)/videos$', endpoint)
        if movie_videos_match:
            return jsonify({'results': []})

        # 9. MOVIE SIMILAR
        movie_similar_match = re.match(r'^movie/(\d+)/similar$', endpoint)
        if movie_similar_match:
            movie_id = int(movie_similar_match.group(1))
            imdb_id = format_id_to_imdb_id(movie_id)
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 'i': imdb_id}, timeout=5)
            if r.status_code == 200 and r.json().get('Response') == 'True':
                genre_str = r.json().get('Genre', '')
                genre_list = genre_str.split(', ') if genre_str else []
                primary_genre = genre_list[0] if genre_list else 'movie'
                sr = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 's': primary_genre, 'type': 'movie'}, timeout=5)
                if sr.status_code == 200 and sr.json().get('Search'):
                    movies = []
                    for item in sr.json().get('Search')[:5]:
                        detail = fetch_movie_details_from_omdb(item.get('imdbID'))
                        if detail:
                            movies.append(map_omdb_detail_to_tmdb(detail))
                    return jsonify({'results': movies})
            return jsonify({'results': []})

        # 10. COLLECTION
        collection_match = re.match(r'^collection/(\d+)$', endpoint)
        if collection_match:
            collection_id = int(collection_match.group(1))
            imdb_id = format_id_to_imdb_id(collection_id)
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 'i': imdb_id}, timeout=5)
            if r.status_code == 200 and r.json().get('Response') == 'True':
                franchise = get_franchise_query(r.json().get('Title'))
                if franchise:
                    sr = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 's': franchise, 'type': 'movie'}, timeout=5)
                    if sr.status_code == 200 and sr.json().get('Search'):
                        movies = []
                        for item in sr.json().get('Search'):
                            detail = fetch_movie_details_from_omdb(item.get('imdbID'))
                            if detail:
                                movies.append(map_omdb_detail_to_tmdb(detail))
                        movies.sort(key=lambda m: m.get('release_date', ''))
                        return jsonify({
                            'id': collection_id,
                            'name': f"{franchise} Collection",
                            'parts': movies
                        })
            return jsonify({'id': collection_id, 'name': 'Collection', 'parts': []})

        # 11. RELEASE DATES
        release_dates_match = re.match(r'^movie/(\d+)/release_dates$', endpoint)
        if release_dates_match:
            movie_id = int(release_dates_match.group(1))
            imdb_id = format_id_to_imdb_id(movie_id)
            r = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 'i': imdb_id}, timeout=5)
            if r.status_code == 200 and r.json().get('Response') == 'True':
                cleaned_date = clean_release_date(r.json().get('Released'), r.json().get('Year'))
                date_iso = f"{cleaned_date}T00:00:00.000Z" if cleaned_date != 'N/A' else None
                return jsonify({
                    'results': [
                        {
                            'iso_3166_1': 'US',
                            'release_dates': [{'type': 3, 'release_date': date_iso}] if date_iso else []
                        },
                        {
                            'iso_3166_1': 'IT',
                            'release_dates': [{'type': 3, 'release_date': date_iso}] if date_iso else []
                        }
                    ]
                })
            return jsonify({'results': []})

        # 12. SEARCH PERSON
        if endpoint == 'search/person':
            query = params.get('query')
            if not query:
                return jsonify({'results': []})
            person_id = hash_string_to_int(query)
            person_cache[person_id] = query
            return jsonify({
                'results': [
                    {
                        'id': person_id,
                        'name': query,
                        'profile_path': None
                    }
                ]
            })

        # 13. PERSON DETAIL
        person_detail_match = re.match(r'^person/(\d+)$', endpoint)
        if person_detail_match:
            person_id = int(person_detail_match.group(1))
            name = person_cache.get(person_id, f"Actor #{person_id}")
            return jsonify({
                'id': person_id,
                'name': name,
                'biography': '',
                'birthday': None,
                'place_of_birth': None,
                'profile_path': None
            })

        # 14. PERSON MOVIE CREDITS
        person_movie_credits_match = re.match(r'^person/(\d+)/movie_credits$', endpoint)
        if person_movie_credits_match:
            person_id = int(person_movie_credits_match.group(1))
            name = person_cache.get(person_id)
            if name:
                sr = http_requests.get('http://www.omdbapi.com/', params={'apikey': OMDB_API_KEY, 's': name, 'type': 'movie'}, timeout=5)
                if sr.status_code == 200 and sr.json().get('Search'):
                    movies = []
                    for item in sr.json().get('Search'):
                        detail = fetch_movie_details_from_omdb(item.get('imdbID'))
                        if detail:
                            movies.append(map_omdb_detail_to_tmdb(detail))
                    return jsonify({'cast': movies})
            return jsonify({'cast': []})

        # 15. PERSON POPULAR
        if endpoint == 'person/popular':
            POPULAR_ACTORS = [
                "Leonardo DiCaprio", "Brad Pitt", "Scarlett Johansson", "Tom Hanks", 
                "Robert Downey Jr.", "Johnny Depp", "Jennifer Lawrence", "Matt Damon", 
                "Morgan Freeman", "Meryl Streep", "Christian Bale", "Al Pacino"
            ]
            results = []
            for name in POPULAR_ACTORS:
                actor_id = hash_string_to_int(name)
                person_cache[actor_id] = name
                results.append({
                    'id': actor_id,
                    'name': name,
                    'profile_path': None,
                    'known_for': []
                })
            return jsonify({'results': results, 'total_pages': 1, 'page': 1})

        # Fallback to TMDB
        target_url = f'{TMDB_BASE_URL}/{endpoint}'
        print(f"⚠️ [OMDb Proxy Fallback] Endpoint sconosciuto, inoltro a TMDB: {target_url}")
        params['api_key'] = TMDB_API_KEY
        resp = http_requests.get(target_url, params=params, headers={'User-Agent': 'Mozilla/5.0'}, timeout=10)
        return jsonify(resp.json()), resp.status_code
        
    except Exception as e:
        print(f"❌ [OMDb Proxy] ERRORE: {str(e)}")
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
