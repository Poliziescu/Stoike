// =========================================
// STOIKE — Frontend Application Logic
// Tutte le chiamate API passano dal backend Flask
// =========================================

async function fetchTMDB(endpoint) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const res = await fetch(`/api/tmdb${endpoint}${separator}_t=${Date.now()}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return await res.json();
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Error fetching from TMDb:', error);
        return null;
    }
}

let tmdbGenres = {};
async function loadTMDBGenres() {
    const data = await fetchTMDB('/genre/movie/list');
    if (data && data.genres) {
        data.genres.forEach(g => { tmdbGenres[g.id] = g.name; });
    }
}

async function loadMovies(endpoint = '/trending/movie/week') {
    const data = await fetchTMDB(endpoint);
    if (data && data.results) {
        return data.results.map(m => ({
            id: m.id,
            title: m.title,
            genre: m.genre_ids ? m.genre_ids.map(id => tmdbGenres[id]).join(', ') : '',
            rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
            release_year: m.release_date ? m.release_date.substring(0, 4) : 'N/A',
            poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Cover',
            backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : 'https://via.placeholder.com/1280x720/131313/FFFFFF?text=No+Backdrop',
            synopsis: m.overview || ''
        }));
    }
    return [];
}

function renderHeroMovie(movie) {
    if (!movie) return;
    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return;
    document.getElementById('hero-backdrop').src = movie.backdrop_url || movie.poster_url || '';
    document.getElementById('hero-title').innerText = movie.title || 'Senza Titolo';
    const synopsisEl = document.getElementById('hero-synopsis');
    synopsisEl.innerText = movie.synopsis || 'Nessuna trama disponibile per questo capolavoro.';
    const watchBtn = document.getElementById('hero-watch-btn');
    const newWatchBtn = watchBtn.cloneNode(true);
    watchBtn.parentNode.replaceChild(newWatchBtn, watchBtn);
    newWatchBtn.addEventListener('click', (e) => { e.stopPropagation(); showMovieDetail(movie); });
    const newHeroSection = heroSection.cloneNode(true);
    heroSection.parentNode.replaceChild(newHeroSection, heroSection);
    newHeroSection.addEventListener('click', () => showMovieDetail(movie));
}

function renderMovies(movies, gridElement) {
    if (!gridElement) return;
    gridElement.innerHTML = '';
    if (movies.length === 0) {
        gridElement.innerHTML = '<div class="col-span-full text-center text-on-surface-variant py-12">Nessun film presente</div>';
        return;
    }
    movies.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card group relative rounded-lg overflow-hidden glass-panel glass-panel-hover transition-all duration-300 cursor-pointer';
        card.setAttribute('data-genre', movie.genre || '');
        card.addEventListener('click', () => showMovieDetail(movie));
        card.innerHTML = `<div class="aspect-[2/3] w-full relative"><img alt="${movie.title}" class="w-full h-full object-cover" src="${movie.poster_url || ''}"/><div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80"></div></div><div class="absolute bottom-0 left-0 w-full p-4 glass-panel border-t border-white/10"><h3 class="font-headline-sm text-headline-sm-mobile md:font-headline-sm md:text-headline-sm text-white mb-1 truncate">${movie.title || 'Senza Titolo'}</h3><div class="flex items-center gap-1 font-label-sm text-label-sm text-primary-container"><span class="material-symbols-outlined text-[16px] material-fill-1">star</span><span>${movie.rating || 'N/A'}</span><span class="text-on-surface-variant ml-2">${movie.release_year || ''}</span></div></div>`;
        gridElement.appendChild(card);
    });
}

function getYouTubeEmbedUrl(url) {
    if (!url) return null;
    let videoId = null;
    const shortMatch = url.match(/youtu\.be\/([\w-]+)/);
    if (shortMatch) videoId = shortMatch[1];
    const longMatch = url.match(/[?&]v=([\w-]+)/);
    if (longMatch) videoId = longMatch[1];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function renderReviewCard(rev, isAdmin) {
    return `<div id="review-card-${rev.id}" class="mb-4 p-4 glass-panel border border-white/10 rounded-lg relative">${isAdmin ? `<button onclick="startEditReview('${rev.id}')" class="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant hover:text-white" title="Modifica Recensione"><span class="material-symbols-outlined text-[18px]">edit</span></button>` : ''}<div class="flex items-center gap-2 mb-2 pr-10"><span class="material-symbols-outlined text-primary-container text-[18px]">person</span><span class="font-label-md text-white font-bold">${rev.author || 'Utente'}</span><span class="ml-auto text-primary-container font-label-sm flex items-center gap-1" id="display-rating-${rev.id}"><span class="material-symbols-outlined text-[14px] material-fill-1">star</span><span>${rev.rating}/10</span></span></div><p id="display-text-${rev.id}" class="font-body-md text-on-surface-variant">${rev.review_text}</p><div id="edit-form-${rev.id}" class="hidden flex-col gap-3 mt-4 border-t border-outline-variant/20 pt-4"><div><label class="block font-label-sm text-on-surface-variant mb-1">Voto (0-10)</label><input type="number" id="edit-rating-${rev.id}" value="${rev.rating}" min="0" max="10" step="0.1" class="w-24 bg-black/50 border border-outline-variant/30 rounded px-2 py-1 text-white focus:border-primary-container focus:ring-0 outline-none transition-colors"></div><div><label class="block font-label-sm text-on-surface-variant mb-1">Testo Recensione</label><textarea id="edit-text-${rev.id}" class="w-full h-24 bg-black/50 border border-outline-variant/30 rounded px-3 py-2 text-white focus:border-primary-container focus:ring-0 outline-none transition-colors">${rev.review_text}</textarea></div><div class="flex gap-2"><button onclick="saveEditReview('${rev.id}')" class="px-4 py-2 bg-primary-container text-black font-label-sm rounded hover:bg-primary transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">save</span> Salva</button><button onclick="cancelEditReview('${rev.id}')" class="px-4 py-2 border border-outline-variant/30 text-white font-label-sm rounded hover:bg-white/10 transition-colors">Annulla</button></div></div></div>`;
}

let currentMovieId = null;

async function showMovieDetail(movie) {
    currentMovieId = movie.id;
    const heroSection = document.getElementById('hero-section');
    const genresView = document.getElementById('genres-view');
    const sectionTitle = document.getElementById('section-title');
    const movieDetail = document.getElementById('movie-detail');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    if (heroSection) heroSection.classList.add('hidden');
    if (genresView) genresView.classList.add('hidden');
    if (sectionTitle) sectionTitle.classList.add('hidden');
    document.getElementById('movies-grid').classList.add('hidden');
    if (sidebar) { sidebar.classList.remove('md:flex'); sidebar.classList.add('hidden'); }
    if (mainContent) { mainContent.classList.remove('md:ml-64'); }
    movieDetail.classList.remove('hidden');
    document.getElementById('detail-poster').src = movie.poster_url || '';
    document.getElementById('detail-poster').alt = movie.title;
    document.getElementById('detail-title').innerText = movie.title || 'Senza Titolo';
    document.getElementById('detail-genre').innerText = movie.genre || '';
    document.getElementById('detail-year').innerText = movie.release_year || '';
    document.getElementById('detail-rating').innerText = movie.rating || 'N/A';
    const trailerContainer = document.getElementById('detail-trailer-container');
    let trailerIframe = document.getElementById('detail-trailer');
    const newIframe = trailerIframe.cloneNode();
    newIframe.removeAttribute('src');
    trailerIframe.parentNode.replaceChild(newIframe, trailerIframe);
    trailerIframe = newIframe;
    trailerContainer.classList.add('hidden');
    const [credits, videos, similar] = await Promise.all([
        fetchTMDB(`/movie/${movie.id}/credits`),
        fetchTMDB(`/movie/${movie.id}/videos`),
        fetchTMDB(`/movie/${movie.id}/similar`)
    ]);
    if (currentMovieId !== movie.id) return;
    let trailerKey = null;
    if (videos && videos.results) {
        const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
        if (trailer) trailerKey = trailer.key;
    }
    if (trailerKey) {
        trailerIframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=0`;
        trailerContainer.classList.remove('hidden');
    }
    const synopsisContainer = document.getElementById('detail-synopsis-container');
    const synopsisEl = document.getElementById('detail-synopsis');
    if (movie.synopsis) { synopsisEl.innerText = movie.synopsis; synopsisContainer.classList.remove('hidden'); }
    else { synopsisContainer.classList.add('hidden'); }
    const castContainer = document.getElementById('detail-cast-container');
    const castEl = document.getElementById('detail-cast');
    if (credits && credits.cast && credits.cast.length > 0) {
        castEl.innerText = credits.cast.slice(0, 8).map(c => c.name).join(', ');
        castContainer.classList.remove('hidden');
    } else { castContainer.classList.add('hidden'); }
    const similarContainer = document.getElementById('detail-similar-container');
    const similarEl = document.getElementById('detail-similar');
    if (similar && similar.results && similar.results.length > 0) {
        similarEl.innerText = similar.results.slice(0, 5).map(s => s.title).join(' • ');
        similarContainer.classList.remove('hidden');
    } else { similarContainer.classList.add('hidden'); }

    // Recensioni via Backend API
    const reviewContainer = document.getElementById('detail-review-container');
    const reviewEl = document.getElementById('detail-review');
    reviewEl.innerHTML = '<span class="opacity-50">Caricamento recensioni...</span>';
    reviewContainer.classList.remove('hidden');
    try {
        const resp = await fetch(`/api/reviews/${movie.id}`);
        const reviews = await resp.json();
        if (Array.isArray(reviews) && reviews.length > 0) {
            const isAdmin = localStorage.getItem('stoike_role') === 'admin';
            reviewEl.innerHTML = reviews.map(rev => renderReviewCard(rev, isAdmin)).join('');
        } else {
            reviewEl.innerHTML = '<p class="font-body-md text-on-surface-variant italic">Nessuna recensione presente per questo film su Stoike.</p>';
        }
    } catch(e) {
        reviewEl.innerHTML = '<p class="font-body-md text-on-surface-variant italic">Errore nel caricamento recensioni.</p>';
    }
    const isAdmin = localStorage.getItem('stoike_role') === 'admin';
    const addReviewSection = document.getElementById('add-review-section');
    if (addReviewSection) {
        if (isAdmin) { addReviewSection.classList.remove('hidden'); addReviewSection.dataset.movieId = movie.id; }
        else { addReviewSection.classList.add('hidden'); }
    }
    setTimeout(() => {
        document.getElementById('main-content').scrollTo({ top: 0, behavior: 'instant' });
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, 10);
}

function hideMovieDetail() {
    currentMovieId = null;
    const heroSection = document.getElementById('hero-section');
    const sectionTitle = document.getElementById('section-title');
    const movieDetail = document.getElementById('movie-detail');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    movieDetail.classList.add('hidden');
    if (sidebar) { sidebar.classList.remove('hidden'); sidebar.classList.add('hidden', 'md:flex'); }
    if (mainContent) { mainContent.classList.add('md:ml-64'); }
    document.getElementById('movies-grid').classList.remove('hidden');
    if (heroSection) heroSection.classList.remove('hidden');
    if (sectionTitle) sectionTitle.classList.remove('hidden');
}

async function executeSearch() {
    const input = document.getElementById('search-input');
    const query = input ? input.value.trim() : '';
    if (!query) return;
    const sectionTitle = document.getElementById('section-title');
    const moviesGrid = document.getElementById('movies-grid');
    const heroSection = document.getElementById('hero-section');
    const genresView = document.getElementById('genres-view');
    const movieDetail = document.getElementById('movie-detail');
    if (movieDetail && !movieDetail.classList.contains('hidden')) { hideMovieDetail(); }
    if (heroSection) heroSection.classList.add('hidden');
    if (genresView) genresView.classList.add('hidden');
    if (sectionTitle) { sectionTitle.innerText = `Risultati per: "${query}"`; sectionTitle.classList.remove('hidden'); }
    if (moviesGrid) {
        moviesGrid.innerHTML = '<div class="col-span-full text-center py-12"><span class="opacity-50">Ricerca in corso...</span></div>';
        moviesGrid.classList.remove('hidden');
        document.getElementById('search-suggestions').classList.add('hidden');
        const searchResults = await loadMovies(`/search/movie?query=${encodeURIComponent(query)}`);
        renderMovies(searchResults, moviesGrid);
    }
}

async function fetchSuggestions(query) {
    const suggestionsBox = document.getElementById('search-suggestions');
    if (!query) { suggestionsBox.classList.add('hidden'); return; }
    const results = await loadMovies(`/search/movie?query=${encodeURIComponent(query)}`);
    if (results && results.length > 0) {
        suggestionsBox.innerHTML = '';
        results.slice(0, 5).forEach(movie => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 hover:bg-surface-container-high cursor-pointer transition-colors border-b border-outline-variant/10 last:border-0';
            item.innerHTML = `<img src="${movie.poster_url}" class="w-10 h-14 object-cover rounded shadow-sm" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/150x225/131313/FFFFFF?text=No+Cover'"><div class="flex-1 min-w-0"><div class="font-label-md text-white truncate">${movie.title}</div><div class="font-label-sm text-on-surface-variant">${movie.release_year} • <span class="material-symbols-outlined text-[12px] material-fill-1 text-primary-container align-middle">star</span> ${movie.rating}</div></div>`;
            item.addEventListener('click', () => { suggestionsBox.classList.add('hidden'); document.getElementById('search-input').value = ''; showMovieDetail(movie); });
            suggestionsBox.appendChild(item);
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.innerHTML = '<div class="p-4 text-center font-label-md text-on-surface-variant">Nessun risultato</div>';
        suggestionsBox.classList.remove('hidden');
    }
}

// DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    const sectionTitle = document.getElementById('section-title');
    const moviesGrid = document.getElementById('movies-grid');
    const links = document.querySelectorAll('a[href="#"]');
    if (moviesGrid) {
        moviesGrid.innerHTML = '<div class="col-span-full text-center text-on-surface-variant py-12">Caricamento in corso...</div>';
        await loadTMDBGenres();
        const initialMovies = await loadMovies('/trending/movie/week');
        if (initialMovies.length > 0) renderHeroMovie(initialMovies[0]);
        renderMovies(initialMovies, moviesGrid);
        const genresContainer = document.getElementById('genres-container');
        if (genresContainer && Object.keys(tmdbGenres).length > 0) {
            let gHTML = '<button class="genre-btn px-6 py-3 bg-surface-container border border-outline-variant/20 font-label-md text-label-md rounded-full hover:bg-surface-container-high hover:border-primary-container/50 transition-colors" data-genre="All" data-genre-id="">All</button>';
            gHTML += Object.entries(tmdbGenres).sort((a,b)=>a[1].localeCompare(b[1])).map(([id,name])=>`<button class="genre-btn px-6 py-3 bg-surface-container border border-outline-variant/20 font-label-md text-label-md rounded-full hover:bg-surface-container-high hover:border-primary-container/50 transition-colors" data-genre="${name}" data-genre-id="${id}">${name}</button>`).join('');
            genresContainer.innerHTML = gHTML;
            document.querySelectorAll('.genre-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const g = btn.getAttribute('data-genre'), gid = btn.getAttribute('data-genre-id');
                    if (moviesGrid) { moviesGrid.innerHTML = '<div class="col-span-full text-center py-12"><span class="opacity-50">Caricamento...</span></div>'; moviesGrid.classList.remove('hidden'); renderMovies(await loadMovies(g==='All'?'/trending/movie/week':`/discover/movie?with_genres=${gid}&sort_by=popularity.desc`), moviesGrid); }
                    if (sectionTitle) sectionTitle.innerText = g==='All'?'Tutti i generi':'Genere: '+g;
                });
            });
        }
    }
    const si = document.getElementById('search-input'); let st = null;
    if (si) { si.addEventListener('input', e=>{clearTimeout(st);const q=e.target.value.trim();if(!q){document.getElementById('search-suggestions').classList.add('hidden');return;}st=setTimeout(()=>fetchSuggestions(q),1000);}); si.addEventListener('keydown', e=>{if(e.key==='Enter'){clearTimeout(st);executeSearch();}}); document.addEventListener('click', e=>{if(!document.getElementById('search-container').contains(e.target))document.getElementById('search-suggestions').classList.add('hidden');}); }
    const bb = document.getElementById('back-to-grid'); if(bb) bb.addEventListener('click', hideMovieDetail);
    const tA='text-primary-container font-bold border-b-2 border-primary-container pb-1 opacity-80 scale-95'.split(' '),tI='text-on-surface-variant'.split(' '),sA='bg-primary-container/10 text-primary-container border-r-4 border-primary-container'.split(' '),sI='text-on-surface-variant'.split(' '),bA='text-primary-container drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]'.split(' '),bI='text-on-surface-variant opacity-60'.split(' ');
    links.forEach(link=>{link.addEventListener('click',async e=>{e.preventDefault();const md=document.getElementById('movie-detail');if(md&&!md.classList.contains('hidden'))hideMovieDetail();let t=link.innerText.trim();const sp=link.querySelector('span:not(.material-symbols-outlined)');if(sp)t=sp.innerText.trim();if(t==='Home'||t==='Movies'||t==='Trending')t='Trending Now';const cH=document.getElementById('hero-section'),cG2=document.getElementById('genres-view'),cGrid=document.getElementById('movies-grid');
    if(t==='Trending Now'){if(cG2)cG2.classList.add('hidden');if(cH)cH.classList.remove('hidden');if(sectionTitle)sectionTitle.innerText=t;if(cGrid){cGrid.innerHTML='<div class="col-span-full text-center py-12"><span class="opacity-50">Caricamento...</span></div>';cGrid.classList.remove('hidden');const nm=await loadMovies('/trending/movie/week');if(nm.length>0)renderHeroMovie(nm[0]);renderMovies(nm,cGrid);}}
    else if(t==='Genres'){if(cH)cH.classList.add('hidden');if(cG2)cG2.classList.remove('hidden');if(cGrid){cGrid.classList.remove('hidden');Array.from(cGrid.querySelectorAll('.movie-card')).forEach(c=>c.classList.remove('hidden'));}if(sectionTitle)sectionTitle.innerText='Genres';}
    else{if(cG2)cG2.classList.add('hidden');if(cH)cH.classList.add('hidden');if(sectionTitle)sectionTitle.innerText=t;if(cGrid){cGrid.innerHTML='<div class="col-span-full text-center py-12"><span class="opacity-50">Caricamento...</span></div>';cGrid.classList.remove('hidden');let ep='/trending/movie/week';if(t==='Top Rated')ep='/movie/top_rated';if(t==='New Releases')ep=`/discover/movie?region=IT&with_release_type=2|3&primary_release_date.gte=${new Date().toISOString().split('T')[0]}`;renderMovies(await loadMovies(ep),cGrid);}}
    const nav=link.parentElement,isT=nav.classList.contains('hidden')&&nav.classList.contains('md:flex'),isS=nav.tagName==='NAV'&&nav.classList.contains('flex-col'),isB=nav.tagName==='NAV'&&nav.classList.contains('bottom-0');
    if(isT){nav.querySelectorAll('a').forEach(a=>{a.classList.remove(...tA);a.classList.add(...tI);});link.classList.remove(...tI);link.classList.add(...tA);}else if(isS){nav.querySelectorAll('a').forEach(a=>{a.classList.remove(...sA);a.classList.add(...sI);});link.classList.remove(...sI);link.classList.add(...sA);}else if(isB){nav.querySelectorAll('a').forEach(a=>{a.classList.remove(...bA);a.classList.add(...bI);});link.classList.remove(...bI);link.classList.add(...bA);}});});
    // Support
    const sFab=document.getElementById('support-fab'),sModal=document.getElementById('support-modal'),sClose=document.getElementById('support-close'),sBk=document.getElementById('support-backdrop'),sForm=document.getElementById('support-form');
    const openS=()=>{sModal.classList.remove('hidden');sModal.classList.add('flex');};const closeS=()=>{sModal.classList.add('hidden');sModal.classList.remove('flex');};
    if(sFab)sFab.addEventListener('click',openS);if(sClose)sClose.addEventListener('click',closeS);if(sBk)sBk.addEventListener('click',closeS);
    if(sForm)sForm.addEventListener('submit',e=>{e.preventDefault();const t2=document.getElementById('support-title').value.trim(),m=document.getElementById('support-message').value.trim();window.location.href=`mailto:support@stoike.cinema?subject=${encodeURIComponent('[Stoike] '+t2)}&body=${encodeURIComponent(m)}`;sForm.reset();closeS();});
    checkAuthState();
});

// Auth
let currentAuthMode='login';
function checkAuthState(){const u=localStorage.getItem('stoike_user'),ab=document.getElementById('auth-btn'),ui=document.getElementById('user-info');if(u){if(ab)ab.classList.add('hidden');if(ui)ui.classList.remove('hidden');const us=document.getElementById('current-username');if(us)us.innerText=u;}else{if(ab)ab.classList.remove('hidden');if(ui)ui.classList.add('hidden');}}
function logoutUser(){localStorage.removeItem('stoike_user');localStorage.removeItem('stoike_role');checkAuthState();}
function openAuthModal(){document.getElementById('auth-modal').classList.remove('hidden');document.getElementById('auth-error').classList.add('hidden');}
function closeAuthModal(){document.getElementById('auth-modal').classList.add('hidden');document.getElementById('auth-form').reset();}
document.getElementById('auth-close').addEventListener('click',closeAuthModal);
document.getElementById('auth-backdrop').addEventListener('click',closeAuthModal);
function switchAuthTab(mode){currentAuthMode=mode;const tl=document.getElementById('tab-login'),tr=document.getElementById('tab-register'),ti=document.getElementById('auth-modal-title'),bt=document.getElementById('auth-btn-text'),bi=document.querySelector('#auth-submit-btn .material-symbols-outlined');document.getElementById('auth-error').classList.add('hidden');if(mode==='login'){tl.className='flex-1 font-label-md text-primary-container border-b-2 border-primary-container pb-1 transition-colors';tr.className='flex-1 font-label-md text-on-surface-variant hover:text-white transition-colors pb-1';ti.innerText='Login';bt.innerText='Accedi';bi.innerText='login';}else{tr.className='flex-1 font-label-md text-primary-container border-b-2 border-primary-container pb-1 transition-colors';tl.className='flex-1 font-label-md text-on-surface-variant hover:text-white transition-colors pb-1';ti.innerText='Registrazione';bt.innerText='Registrati';bi.innerText='person_add';}}
document.getElementById('auth-form').addEventListener('submit',async e=>{e.preventDefault();const u=document.getElementById('auth-username').value.trim(),p=document.getElementById('auth-password').value.trim(),err=document.getElementById('auth-error'),sb=document.getElementById('auth-submit-btn'),bt=document.getElementById('auth-btn-text');const ot=bt.innerText;bt.innerText='Attendere...';sb.disabled=true;sb.classList.add('opacity-50');try{const r=await fetch(currentAuthMode==='login'?'/api/auth/login':'/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});const d=await r.json();if(d&&d.success){localStorage.setItem('stoike_user',d.username);localStorage.setItem('stoike_role',d.role);closeAuthModal();checkAuthState();}else{err.innerText=d.message||'Errore';err.classList.remove('hidden');}}catch(ex){err.innerText='Errore di connessione.';err.classList.remove('hidden');}finally{bt.innerText=ot;sb.disabled=false;sb.classList.remove('opacity-50');}});

// Reviews CRUD
function startEditReview(id){document.getElementById(`display-text-${id}`).classList.add('hidden');document.getElementById(`display-rating-${id}`).classList.add('hidden');document.getElementById(`edit-form-${id}`).classList.remove('hidden');document.getElementById(`edit-form-${id}`).classList.add('flex');}
function cancelEditReview(id){document.getElementById(`display-text-${id}`).classList.remove('hidden');document.getElementById(`display-rating-${id}`).classList.remove('hidden');document.getElementById(`edit-form-${id}`).classList.add('hidden');document.getElementById(`edit-form-${id}`).classList.remove('flex');}
async function saveEditReview(id){const u=localStorage.getItem('stoike_user');if(!u)return alert('Devi essere loggato.');const nt=document.getElementById(`edit-text-${id}`).value.trim(),nr=document.getElementById(`edit-rating-${id}`).value;if(!nt||!nr)return alert('Compila tutti i campi.');try{const r=await fetch(`/api/reviews/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,review_text:nt,rating:parseFloat(nr)})});const d=await r.json();if(!d.success)throw new Error(d.message);document.getElementById(`display-text-${id}`).innerText=nt;document.getElementById(`display-rating-${id}`).innerHTML=`<span class="material-symbols-outlined text-[14px] material-fill-1">star</span> <span>${parseFloat(nr).toFixed(1)}/10</span>`;cancelEditReview(id);}catch(e){alert('Errore: '+(e.message||'Impossibile aggiornare.'));}}
async function addReview(){const u=localStorage.getItem('stoike_user'),sec=document.getElementById('add-review-section'),mid=sec?parseInt(sec.dataset.movieId):null,au=document.getElementById('new-review-author').value.trim(),ra=document.getElementById('new-review-rating').value,tx=document.getElementById('new-review-text').value.trim(),eb=document.getElementById('new-review-error');eb.classList.add('hidden');if(!au||!ra||!tx){eb.innerText='Compila tutti i campi.';eb.classList.remove('hidden');return;}try{const r=await fetch('/api/reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,tmdb_movie_id:mid,author:au,review_text:tx,rating:parseFloat(ra)})});const d=await r.json();if(!d.success)throw new Error(d.message);document.getElementById('new-review-author').value='';document.getElementById('new-review-rating').value='';document.getElementById('new-review-text').value='';const rr=await fetch(`/api/reviews/${mid}`);const revs=await rr.json();if(Array.isArray(revs)&&revs.length>0)document.getElementById('detail-review').innerHTML=revs.map(rev=>renderReviewCard(rev,true)).join('');}catch(e){eb.innerText='Errore: '+(e.message||'Impossibile salvare.');eb.classList.remove('hidden');}}
