// =========================================
// STOIKE — Shared Layout Interactivity & Globals
// =========================================

// Timeout resilient fetch tool for TMDb Proxy
async function fetchTMDB(endpoint) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
    try {
        const separator = endpoint.includes('?') ? '&' : '?';
        const lang = (window.i18n && window.i18n.getTMDBLang) ? window.i18n.getTMDBLang() : 'it-IT';
        const res = await fetch(`/api/tmdb${endpoint}${separator}language=${lang}&_t=${Date.now()}`, {
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

// Global genres cache shared by all pages
let tmdbGenres = {};
async function loadTMDBGenres() {
    const data = await fetchTMDB('/genre/movie/list');
    if (data && data.genres) {
        data.genres.forEach(g => { tmdbGenres[g.id] = g.name; });
    }
}

// Helper to map TMDB result data structure to our clean model
function mapTMDBMovie(m) {
    return {
        id: m.id,
        title: m.title,
        genre: m.genre_ids ? m.genre_ids.map(id => tmdbGenres[id] || '').filter(Boolean).join(', ') : '',
        rating: m.vote_average ? m.vote_average.toFixed(1) : 'Film non ancora valutato',
        release_year: m.release_date ? m.release_date.substring(0, 4) : 'N/A',
        poster_url: m.poster_path ? (m.poster_path.startsWith('http') ? m.poster_path : `https://image.tmdb.org/t/p/w500${m.poster_path}`) : 'https://placehold.co/500x750/131313/FFFFFF?text=No+Cover',
        backdrop_url: m.backdrop_path ? (m.backdrop_path.startsWith('http') ? m.backdrop_path : `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`) : 'https://placehold.co/1280x720/131313/FFFFFF?text=No+Backdrop',
        synopsis: m.overview || ''
    };
}

// Auth State Manager
let currentAuthMode = 'login';

async function checkAuthState() {
    const u = localStorage.getItem('stoike_user');
    const ab = document.getElementById('auth-btn');
    const ui = document.getElementById('user-info');
    
    // Elementi dell'avatar nell'header (in alto a destra)
    const headerAvatarImg = document.querySelector('img[alt="User profile avatar"]') || document.getElementById('header-user-avatar');
    
    // Gestione visuale e interattiva del pulsante avatar nell'header
    if (headerAvatarImg) {
        const avatarContainer = headerAvatarImg.parentElement;
        if (avatarContainer) {
            avatarContainer.style.cursor = 'pointer';
            
            // Rimuove eventuali listener precedenti clonando l'elemento per evitare duplicazioni
            const newContainer = avatarContainer.cloneNode(true);
            if (avatarContainer.parentNode) {
                avatarContainer.parentNode.replaceChild(newContainer, avatarContainer);
            }
            
            newContainer.addEventListener('click', (e) => {
                e.preventDefault();
                const loggedInUser = localStorage.getItem('stoike_user');
                if (loggedInUser) {
                    window.location.href = '/account.html';
                } else {
                    openAuthModal();
                }
            });
        }
    }

    if (u) {
        if (ab) ab.classList.add('hidden');
        if (ui) ui.classList.remove('hidden');
        
        // Legge nickname ed avatar dalla cache locale per caricamento immediato (senza latenza)
        const cachedNickname = localStorage.getItem('stoike_nickname');
        const cachedAvatar = localStorage.getItem('stoike_avatar');
        
        const us = document.getElementById('current-username');
        if (us) {
            us.innerText = cachedNickname || u;
        }
        
        const headerAvatar = document.querySelector('img[alt="User profile avatar"]') || document.getElementById('header-user-avatar');
        if (headerAvatar && cachedAvatar) {
            headerAvatar.src = cachedAvatar;
        }

        // Recupera in parallelo dal server per aggiornare la cache ed evitare sfasamenti
        fetch(`/api/user/profile?username=${encodeURIComponent(u)}&_t=${Date.now()}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    const latestNickname = data.nickname || '';
                    const latestAvatar = data.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt7PZrBX9BJiiPiYcPFspIG13xOyP14bl7xlFDunbqT-rfZhgwIV4UoGe3TzGGWQ6Dr4xdgALPg9tdgrKl49JGdE-JxxariZRrTvGKlUOkpH8aXPB7bpDFTEXVR7UoGuf8cDFq8n1yxhiOpV9KwKetxG8xApbTLjbO-sGc18y_DLG_SiY9uSexy1JZ3rurDYa8JyyWg1_89Owywrb4zM9AejdI2QnwfYPYIUCaRcho_FQAHUtG0xJ2o6PvIFx0NFMbVr3D2STI9KL3';
                    
                    console.log("👤 [Stoike Auth] Cache:", { cachedNickname, cachedAvatar }, "Server:", { latestNickname, latestAvatar });

                    // Se ci sono variazioni rispetto alla cache, aggiorna il DOM
                    if (latestNickname !== cachedNickname || latestAvatar !== cachedAvatar) {
                        localStorage.setItem('stoike_nickname', latestNickname);
                        localStorage.setItem('stoike_avatar', latestAvatar);
                        
                        if (us) us.innerText = latestNickname || u;
                        
                        const currentHeaderAvatar = document.querySelector('img[alt="User profile avatar"]') || document.getElementById('header-user-avatar');
                        if (currentHeaderAvatar) {
                            currentHeaderAvatar.src = latestAvatar;
                        }

                        // Se ci troviamo nella pagina account stessa, aggiorna anche la preview locale
                        const accountPreview = document.getElementById('profile-avatar-preview');
                        if (accountPreview && (typeof uploadedAvatarBase64 === 'undefined' || !uploadedAvatarBase64)) {
                            accountPreview.src = latestAvatar;
                        }
                        const accountNickname = document.getElementById('profile-nickname');
                        if (accountNickname && document.activeElement !== accountNickname) {
                            accountNickname.value = latestNickname;
                        }
                    }
                }
            })
            .catch(err => console.warn("Impossibile recuperare il profilo aggiornato dal server:", err));
            
    } else {
        if (ab) ab.classList.remove('hidden');
        if (ui) ui.classList.add('hidden');
        
        // Ripristina l'avatar di default se l'utente si disconnette
        const headerAvatar = document.querySelector('img[alt="User profile avatar"]') || document.getElementById('header-user-avatar');
        if (headerAvatar) {
            headerAvatar.src = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt7PZrBX9BJiiPiYcPFspIG13xOyP14bl7xlFDunbqT-rfZhgwIV4UoGe3TzGGWQ6Dr4xdgALPg9tdgrKl49JGdE-JxxariZRrTvGKlUOkpH8aXPB7bpDFTEXVR7UoGuf8cDFq8n1yxhiOpV9KwKetxG8xApbTLjbO-sGc18y_DLG_SiY9uSexy1JZ3rurDYa8JyyWg1_89Owywrb4zM9AejdI2QnwfYPYIUCaRcho_FQAHUtG0xJ2o6PvIFx0NFMbVr3D2STI9KL3';
        }
    }
}

function logoutUser() {
    localStorage.removeItem('stoike_user');
    localStorage.removeItem('stoike_role');
    localStorage.removeItem('stoike_nickname');
    localStorage.removeItem('stoike_avatar');
    checkAuthState();
    // Refresh page in case of admin access to update UI controls
    window.location.reload();
}

// Premium glassmorphic toast notification system
window.showStoikeToast = function(message, type = 'success') {
    const existing = document.querySelectorAll('.stoike-toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'stoike-toast fixed bottom-6 right-6 z-[9999] max-w-md p-4 rounded-xl border flex items-center gap-3 shadow-2xl backdrop-blur-xl transition-all duration-500 transform translate-y-10 opacity-0';
    
    let borderClass = 'border-primary-container/30 bg-surface-container-high/90 text-primary-container';
    let icon = 'info';
    let iconColor = 'text-primary-container';
    
    if (type === 'success') {
        borderClass = 'border-green-500/30 bg-green-950/40 text-green-300';
        icon = 'check_circle';
        iconColor = 'text-green-400';
    } else if (type === 'error' || type === 'warning') {
        borderClass = 'border-red-500/30 bg-red-950/40 text-red-300';
        icon = 'error';
        iconColor = 'text-red-400';
    } else if (type === 'info') {
        borderClass = 'border-primary-container/20 bg-surface-container/60 text-on-surface';
        icon = 'info';
        iconColor = 'text-primary-container';
    }

    toast.className += ' ' + borderClass;
    
    toast.innerHTML = `
        <span class="material-symbols-outlined ${iconColor} text-[22px] flex-shrink-0">${icon}</span>
        <div class="font-label-md text-sm leading-relaxed">${message}</div>
        <button class="ml-auto text-on-surface-variant hover:text-white transition-colors p-1 rounded-full hover:bg-white/5" onclick="this.parentElement.remove()">
            <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 50);
    
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
};

// Override standard browser alert with premium glassmorphic toast
window.alert = function(msg) {
    let type = 'info';
    const lower = String(msg).toLowerCase();
    if (lower.includes('errore') || lower.includes('fallit') || lower.includes('impossibile') || lower.includes('non trov') || lower.includes('must') || lower.includes('obbligatori') || lower.includes('erro')) {
        type = 'error';
    } else if (lower.includes('success') || lower.includes('completato') || lower.includes('salvato') || lower.includes('riuscito')) {
        type = 'success';
    }
    window.showStoikeToast(msg, type);
};

window.openAuthModal = function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const error = document.getElementById('auth-error');
        if (error) error.classList.add('hidden');
    }
};

window.closeAuthModal = function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    const form = document.getElementById('auth-form');
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
};

function switchAuthTab(mode) {
    currentAuthMode = mode;
    const tl = document.getElementById('tab-login');
    const tr = document.getElementById('tab-register');
    const ti = document.getElementById('auth-modal-title');
    const bt = document.getElementById('auth-btn-text');
    const bi = document.querySelector('#auth-submit-btn .material-symbols-outlined');
    const err = document.getElementById('auth-error');
    
    if (err) err.classList.add('hidden');
    
    if (mode === 'login') {
        if (tl) tl.className = 'flex-1 font-label-md text-primary-container border-b-2 border-primary-container pb-1 transition-colors';
        if (tr) tr.className = 'flex-1 font-label-md text-on-surface-variant hover:text-white transition-colors pb-1';
        if (ti) ti.innerText = 'Login';
        if (bt) bt.innerText = 'Accedi';
        if (bi) bi.innerText = 'login';
        
        // Rimuovi campo email se presente
        const emailGroup = document.getElementById('auth-email-group');
        if (emailGroup) emailGroup.remove();
    } else {
        if (tr) tr.className = 'flex-1 font-label-md text-primary-container border-b-2 border-primary-container pb-1 transition-colors';
        if (tl) tl.className = 'flex-1 font-label-md text-on-surface-variant hover:text-white transition-colors pb-1';
        if (ti) ti.innerText = 'Registrazione';
        if (bt) bt.innerText = 'Registrati';
        if (bi) bi.innerText = 'person_add';
        
        // Aggiungi campo email per registrazione
        let emailGroup = document.getElementById('auth-email-group');
        if (!emailGroup) {
            emailGroup = document.createElement('div');
            emailGroup.id = 'auth-email-group';
            emailGroup.className = 'transition-all duration-300';
            emailGroup.innerHTML = `
                <label class="block font-label-sm text-on-surface-variant mb-1">Email</label>
                <input id="auth-email" required class="w-full bg-black/50 border border-outline-variant/30 rounded px-4 py-3 text-white focus:border-primary-container focus:ring-0 outline-none transition-colors" type="email" placeholder="Es. mike@example.com" />
            `;
            const submitBtn = document.getElementById('auth-submit-btn');
            if (submitBtn) {
                submitBtn.parentNode.insertBefore(emailGroup, submitBtn);
            }
        }
    }
}

// Global Drawer Actions
let closeTimeout = null;
function openDrawer() {
    clearTimeout(closeTimeout);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
    }
    if (overlay) {
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('opacity-100'), 10);
    }
}

function closeDrawer() {
    clearTimeout(closeTimeout);
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
    }
    if (overlay) {
        overlay.classList.remove('opacity-100');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

// Search execution redirects to list.html with query and year
function executeSearchGlobal() {
    const input = document.getElementById('search-input');
    const yearInput = document.getElementById('search-year-input');
    
    const query = input ? input.value.trim() : '';
    const year = yearInput ? yearInput.value.trim() : '';
    
    if (!query && !year) return;
    
    let url = '/list.html?';
    if (query) url += `query=${encodeURIComponent(query)}&`;
    if (year) url += `year=${encodeURIComponent(year)}`;
    
    window.location.href = url;
}

async function fetchSuggestionsGlobal() {
    const suggestionsBox = document.getElementById('search-suggestions');
    const input = document.getElementById('search-input');
    const yearInput = document.getElementById('search-year-input');
    
    if (!suggestionsBox) return;

    const query = input ? input.value.trim() : '';
    const year = yearInput ? yearInput.value.trim() : '';

    if (!query && !year) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.classList.remove('flex');
        return;
    }
    
    // Show Loading state
    suggestionsBox.innerHTML = `<div class="p-4 text-center font-label-md text-on-surface-variant animate-pulse">. . .</div>`;
    suggestionsBox.classList.remove('hidden');
    suggestionsBox.classList.add('flex');

    let endpoint = '';
    if (query && year) {
        endpoint = `/search/movie?query=${encodeURIComponent(query)}&primary_release_year=${encodeURIComponent(year)}`;
    } else if (query) {
        endpoint = `/search/movie?query=${encodeURIComponent(query)}`;
    } else if (year) {
        endpoint = `/discover/movie?primary_release_year=${encodeURIComponent(year)}&sort_by=popularity.desc`;
    }
    
    const rawData = await fetchTMDB(endpoint);
    
    if (rawData && rawData.results && rawData.results.length > 0) {
        suggestionsBox.innerHTML = '';
        rawData.results.slice(0, 5).forEach(m => {
            const movie = mapTMDBMovie(m);
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 hover:bg-surface-container-high cursor-pointer transition-colors border-b border-outline-variant/10 last:border-0';
            item.innerHTML = `<img src="${movie.poster_url}" class="w-10 h-14 object-cover rounded shadow-sm" alt="${movie.title}" onerror="this.src='https://placehold.co/150x225/131313/FFFFFF?text=No+Cover'"><div class="flex-1 min-w-0"><div class="font-label-md text-white truncate">${movie.title}</div><div class="font-label-sm text-on-surface-variant">${movie.release_year} • <span class="material-symbols-outlined text-[12px] material-fill-1 text-primary-container align-middle">star</span> ${movie.rating}</div></div>`;
            item.addEventListener('click', () => {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
                if (input) input.value = '';
                if (yearInput) yearInput.value = '';
                window.location.href = `/movie.html?id=${movie.id}`;
            });
            suggestionsBox.appendChild(item);
        });
    } else {
        suggestionsBox.innerHTML = `<div class="p-4 text-center font-label-md text-on-surface-variant">${window.i18n ? i18n.t('search.noResults') : 'Nessun risultato'}</div>`;
    }
}

// Utility function to sync user reminders from Supabase on startup
async function syncUserReminders() {
    const user = localStorage.getItem('stoike_user');
    if (!user) return;
    try {
        const resp = await fetch('/api/reminders/' + encodeURIComponent(user));
        if (resp.ok) {
            const data = await resp.json();
            localStorage.setItem('stoike_saved_movies_' + user, JSON.stringify(data));
            // Trigger UI update for current active reminders on page load
            if (data && Array.isArray(data)) {
                data.forEach(m => {
                    updateMovieSaveButtons(m.tmdb_movie_id || m.id, true);
                });
            }
        }
    } catch (e) {
        console.warn("Impossibile sincronizzare i promemoria dal server:", e);
    }
}

// Utility function to toggle save button styles dynamically
function updateMovieSaveButtons(id, active) {
    const buttons = document.querySelectorAll(`[id^="card-save-btn-${id}"], #movie-detail-save-btn`);
    buttons.forEach(btn => {
        const icon = btn.querySelector('.material-symbols-outlined');
        if (active) {
            btn.className = "p-2 bg-yellow-400/20 border border-yellow-400/40 rounded-full flex items-center justify-center text-yellow-400 hover:bg-yellow-400/30 transition-colors";
            if (icon) icon.classList.add('material-fill-1');
        } else {
            btn.className = "p-2 bg-black/60 backdrop-blur-md border border-outline-variant/20 rounded-full flex items-center justify-center hover:bg-primary-container hover:text-black text-white transition-colors";
            if (icon) icon.classList.remove('material-fill-1');
        }
    });
}

// Asynchronous glassmorphic email modal prompt
function promptEmailModal() {
    return new Promise((resolve) => {
        const modalDiv = document.createElement('div');
        modalDiv.id = 'email-prompt-modal';
        modalDiv.className = 'fixed inset-0 z-[200] flex items-center justify-center';
        modalDiv.innerHTML = `
            <div class="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"></div>
            <div class="relative w-[90%] max-w-md mx-auto bg-surface-container border border-outline-variant/20 rounded-2xl p-6 shadow-2xl z-10 transition-all duration-300 transform scale-95 opacity-0">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-headline-sm font-headline-sm text-primary-container flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary-container">alternate_email</span>
                        Notifica Email
                    </h3>
                    <button id="email-prompt-close" class="text-on-surface-variant hover:text-white transition-colors">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                </div>
                <p class="text-on-surface-variant font-body-md text-sm mb-4">
                    Inserisci la tua email per essere notificato non appena questo film uscirà al cinema.
                </p>
                <form id="email-prompt-form" class="flex flex-col gap-4">
                    <div id="email-prompt-error" class="hidden bg-red-500/20 text-red-300 font-label-sm p-3 rounded border border-red-500/30 text-center"></div>
                    <div>
                        <label class="block font-label-sm text-on-surface-variant mb-1">Indirizzo Email</label>
                        <input id="email-prompt-input" required class="w-full bg-black/50 border border-outline-variant/30 rounded px-4 py-3 text-white focus:border-primary-container focus:ring-0 outline-none transition-colors" type="email" placeholder="Es. mario@example.com" />
                    </div>
                    <button type="submit" class="w-full py-3 mt-2 bg-primary-container text-black font-label-md text-label-md rounded hover:bg-primary transition-colors flex justify-center items-center gap-2 font-bold">
                        <span class="material-symbols-outlined">notifications_active</span> Attiva Promemoria
                    </button>
                </form>
            </div>
        `;
        document.body.appendChild(modalDiv);

        const card = modalDiv.querySelector('.relative');
        setTimeout(() => {
            card.classList.remove('scale-95', 'opacity-0');
            card.classList.add('scale-100', 'opacity-100');
        }, 10);

        const closeBtn = modalDiv.querySelector('#email-prompt-close');
        const backdrop = modalDiv.querySelector('.absolute');
        const form = modalDiv.querySelector('#email-prompt-form');
        const input = modalDiv.querySelector('#email-prompt-input');
        const error = modalDiv.querySelector('#email-prompt-error');

        function cleanup(result) {
            card.classList.remove('scale-100', 'opacity-100');
            card.classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                modalDiv.remove();
                resolve(result);
            }, 300);
        }

        closeBtn.addEventListener('click', () => cleanup(null));
        backdrop.addEventListener('click', () => cleanup(null));

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const val = input.value.trim();
            const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            if (!emailPattern.test(val)) {
                error.innerText = 'Indirizzo email non valido.';
                error.classList.remove('hidden');
                return;
            }
            cleanup(val);
        });
    });
}

// Global movie card renderer used on all search/list/genre results
function renderMovieCard(movie) {
    const user = localStorage.getItem('stoike_user');
    let isSaved = false;
    if (user) {
        const savedRaw = localStorage.getItem('stoike_saved_movies_' + user);
        if (savedRaw) {
            try {
                const saved = JSON.parse(savedRaw);
                isSaved = saved.some(m => (m.id == movie.id || m.tmdb_movie_id == movie.id));
            } catch(e){}
        }
    }

    const movieTitleSafe = movie.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    
    const activeBtnClass = isSaved 
        ? "p-2 bg-yellow-400/20 border border-yellow-400/40 rounded-full flex items-center justify-center text-yellow-400 hover:bg-yellow-400/30 transition-colors" 
        : "p-2 bg-black/60 backdrop-blur-md border border-outline-variant/20 rounded-full flex items-center justify-center hover:bg-primary-container hover:text-black text-white transition-colors";
    
    const activeIconClass = isSaved ? "material-symbols-outlined text-[16px] material-fill-1" : "material-symbols-outlined text-[16px]";

    return `
        <div class="movie-card group flex flex-col bg-surface-container/30 border border-outline-variant/10 rounded-2xl overflow-hidden hover:border-primary-container/30 hover:bg-surface-container/50 hover:shadow-2xl hover:shadow-primary-container/5 transition-all duration-500 cursor-pointer" data-movie-id="${movie.id}" onclick="window.location.href='/movie.html?id=${movie.id}'">
            <div class="relative aspect-[2/3] overflow-hidden card-media-container">
                <img src="${movie.poster_url}" alt="${movie.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" onerror="this.src='https://placehold.co/500x750/131313/FFFFFF?text=No+Cover'" />
                <div class="movie-rating-badge absolute top-3 right-3 flex items-center gap-2 z-30 transition-opacity duration-300">
                    <div class="px-3 py-1 bg-black/60 backdrop-blur-md border border-outline-variant/20 rounded-full flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px] material-fill-1 text-primary-container">star</span>
                        <span class="font-label-sm text-label-sm text-primary-container">${movie.rating}</span>
                    </div>
                    <button id="card-save-btn-${movie.id}" class="${activeBtnClass}" title="Avvisami all'uscita" onclick="handleSaveMovie(event, ${movie.id}, '${movieTitleSafe}', '${movie.poster_url}')">
                        <span class="${activeIconClass}">calendar_month</span>
                    </button>
                </div>
            </div>
            <div class="p-5 flex flex-col gap-2 flex-grow">
                <h3 class="font-title-md text-title-md text-white font-bold tracking-tight line-clamp-1 group-hover:text-primary-container transition-colors duration-300">${movie.title}</h3>
                <div class="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                    <span>${movie.release_year}</span>
                    <span class="w-1 h-1 bg-outline rounded-full"></span>
                    <span class="truncate max-w-[120px]">${movie.genre}</span>
                </div>
            </div>
        </div>
    `;
}

// Global handle save movie (Supports interactive dynamic toggle state)
window.handleSaveMovie = async function(event, id, title, posterUrl) {
    if (event) event.stopPropagation();
    const user = localStorage.getItem('stoike_user');
    if (!user) {
        showStoikeToast("Devi effettuare l'accesso per salvare i film ed essere avvisato.", 'warning');
        openAuthModal();
        return;
    }

    const key = 'stoike_saved_movies_' + user;
    let saved = [];
    const savedRaw = localStorage.getItem(key);
    if (savedRaw) {
        try { saved = JSON.parse(savedRaw); } catch(e){}
    }

    const isSaved = saved.some(m => (m.id == id || m.tmdb_movie_id == id));

    if (isSaved) {
        // Tenta la cancellazione (rimozione) del promemoria
        try {
            const resp = await fetch(`/api/reminders/${encodeURIComponent(user)}/${id}`, {
                method: 'DELETE'
            });
            if (resp.ok) {
                saved = saved.filter(m => !(m.id == id || m.tmdb_movie_id == id));
                localStorage.setItem(key, JSON.stringify(saved));
                showStoikeToast("Avviso di uscita rimosso con successo.", 'info');
                updateMovieSaveButtons(id, false);
                return;
            } else {
                throw new Error("Errore risposta server");
            }
        } catch (err) {
            console.error("Errore durante la rimozione dell'avviso:", err);
            // Fallback locale in caso di errore server
            saved = saved.filter(m => !(m.id == id || m.tmdb_movie_id == id));
            localStorage.setItem(key, JSON.stringify(saved));
            showStoikeToast("Avviso rimosso localmente.", 'info');
            updateMovieSaveButtons(id, false);
        }
    } else {
        // Recupera l'email dal profilo utente nel DB (non chiede più via modal)
        let email = null;
        try {
            const profileRes = await fetch(`/api/user/profile?username=${encodeURIComponent(user)}&_t=${Date.now()}`);
            const profileData = await profileRes.json();
            if (profileData && profileData.success && profileData.email) {
                email = profileData.email;
            }
        } catch (e) {
            console.warn('Impossibile recuperare email dal profilo:', e);
        }

        // Fallback: prova da localStorage (per retrocompatibilità)
        if (!email) {
            email = localStorage.getItem('stoike_email_' + user);
        }

        // Se non c'è email da nessuna parte, avvisa l'utente
        if (!email) {
            showStoikeToast("Per ricevere avvisi email devi impostare la tua email nelle impostazioni del profilo. Il promemoria verrà salvato ma senza notifica email.", 'warning');
        }

        // Tenta il salvataggio nel database tramite backend
        let savedInDb = false;
        try {
            const resp = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user,
                    tmdb_movie_id: id,
                    title: title,
                    poster_url: posterUrl,
                    email: email || undefined
                })
            });
            
            if (resp.ok) {
                savedInDb = true;
            } else if (resp.status === 409) {
                showStoikeToast("Hai già attivato l'avviso per questo film.", 'info');
                // Sincronizza lo stato dell'icona
                updateMovieSaveButtons(id, true);
                return;
            }
        } catch(err) {
            console.warn("Impossibile salvare nel database, procedo in locale:", err);
        }
        
        if (!saved.some(m => (m.id == id || m.tmdb_movie_id == id))) {
            saved.push({ id: id, tmdb_movie_id: id, title, poster_url: posterUrl, added_at: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(saved));
            
            if (savedInDb) {
                showStoikeToast("Promemoria attivato con successo! Riceverai un'email il giorno dell'uscita.", 'success');
            } else {
                showStoikeToast("Promemoria salvato localmente.", 'success');
            }
            updateMovieSaveButtons(id, true);
        }
    }
};


// Global Setup logic
document.addEventListener('DOMContentLoaded', async () => {
    // Apply i18n translations
    if (window.i18n) {
        i18n.applyTranslations();
        // Init custom language selector
        const currentLang = i18n.getCurrentLang();
        const flagMap = { it: 'it', en: 'gb', fr: 'fr', es: 'es', de: 'de' };
        
        const currentFlagImg = document.getElementById('current-lang-flag');
        if (currentFlagImg && flagMap[currentLang]) {
            currentFlagImg.src = `https://flagcdn.com/w20/${flagMap[currentLang]}.png`;
            currentFlagImg.alt = currentLang.toUpperCase();
        }

        const btn = document.getElementById('lang-dropdown-btn');
        const menu = document.getElementById('lang-dropdown-menu');
        
        if (btn && menu) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                menu.classList.toggle('hidden');
                menu.classList.toggle('flex');
            });
            
            document.addEventListener('click', (e) => {
                if (!btn.contains(e.target) && !menu.contains(e.target)) {
                    menu.classList.add('hidden');
                    menu.classList.remove('flex');
                }
            });
        }
        
        // Expose globally for the onclick handlers in HTML
        window.changeLanguage = async (lang) => {
            if(menu) { 
                menu.classList.add('hidden'); 
                menu.classList.remove('flex'); 
            }
            i18n.setLang(lang);
            tmdbGenres = {};
            await loadTMDBGenres();
            window.location.reload();
        };
    }

    // Check initial auth state
    checkAuthState();
    await loadTMDBGenres();
    await syncUserReminders();

    // Close Auth modal handlers
    const ac = document.getElementById('auth-close');
    const ab = document.getElementById('auth-backdrop');
    if (ac) ac.addEventListener('click', closeAuthModal);
    if (ab) ab.addEventListener('click', closeAuthModal);

    // Sidebar drawer control hooks
    const sidebar = document.getElementById('sidebar');
    const trigger = document.getElementById('sidebar-trigger');
    const overlay = document.getElementById('sidebar-overlay');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebarClose = document.getElementById('sidebar-close');

    if (trigger) {
        trigger.addEventListener('mouseenter', openDrawer);
        trigger.addEventListener('mouseleave', () => {
            closeTimeout = setTimeout(closeDrawer, 800);
        });
    }
    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (sidebar && sidebar.classList.contains('translate-x-0')) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });
    }
    if (sidebarClose) sidebarClose.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
    if (sidebar) {
        sidebar.addEventListener('mouseleave', () => {
            closeTimeout = setTimeout(closeDrawer, 800);
        });
        sidebar.addEventListener('mouseenter', () => {
            clearTimeout(closeTimeout);
        });
    }

    // Auth modal form submission
    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async e => {
            e.preventDefault();
            const u = document.getElementById('auth-username').value.trim();
            const p = document.getElementById('auth-password').value.trim();
            const err = document.getElementById('auth-error');
            const sb = document.getElementById('auth-submit-btn');
            const bt = document.getElementById('auth-btn-text');
            if (!u || !p) return;
            
            let emailVal = null;
            if (currentAuthMode === 'register') {
                const authEmailInput = document.getElementById('auth-email');
                if (authEmailInput) {
                    emailVal = authEmailInput.value.trim();
                    if (!emailVal) return;
                }
            }
            
            const originalText = bt.innerText;
            bt.innerText = 'Attendere...';
            sb.disabled = true;
            sb.classList.add('opacity-50');
            
            try {
                const response = await fetch(currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p, email: emailVal || undefined })
                });
                const data = await response.json();
                if (data && data.success) {
                    localStorage.setItem('stoike_user', data.username);
                    localStorage.setItem('stoike_role', data.role);
                    if (emailVal) {
                        localStorage.setItem('stoike_email_' + data.username, emailVal);
                    }
                    closeAuthModal();
                    checkAuthState();
                    window.location.reload(); // Refresh the page to redraw interface context
                } else {
                    if (err) {
                        err.innerText = data.message || 'Errore durante l\'autenticazione';
                        err.classList.remove('hidden');
                    }
                }
            } catch (ex) {
                if (err) {
                    err.innerText = 'Errore di connessione.';
                    err.classList.remove('hidden');
                }
            } finally {
                bt.innerText = originalText;
                sb.disabled = false;
                sb.classList.remove('opacity-50');
            }
        });
    }

    // Global search debounce
    const globalSearchInput = document.getElementById('search-input');
    const globalYearInput = document.getElementById('search-year-input');
    let searchTimeout = null;

    function triggerSearchSuggest() {
        clearTimeout(searchTimeout);
        const suggestionsBox = document.getElementById('search-suggestions');
        
        const q = globalSearchInput ? globalSearchInput.value.trim() : '';
        const y = globalYearInput ? globalYearInput.value.trim() : '';
        
        if (!q && !y) {
            if (suggestionsBox) {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
            }
            return;
        }

        // Immediately show the loading UI before debounce ends
        if (suggestionsBox) {
            suggestionsBox.innerHTML = `<div class="p-4 text-center font-label-md text-on-surface-variant animate-pulse">. . .</div>`;
            suggestionsBox.classList.remove('hidden');
            suggestionsBox.classList.add('flex');
        }

        searchTimeout = setTimeout(() => {
            fetchSuggestionsGlobal();
        }, 500);
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', () => {
            if (ypDropdown) {
                ypDropdown.classList.add('hidden');
                ypDropdown.classList.remove('flex');
            }
            triggerSearchSuggest();
        });
        globalSearchInput.addEventListener('focus', () => {
            if (ypDropdown) {
                ypDropdown.classList.add('hidden');
                ypDropdown.classList.remove('flex');
            }
            triggerSearchSuggest();
        });
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeSearchGlobal();
        });
    }

    if (globalYearInput) {
        globalYearInput.addEventListener('input', triggerSearchSuggest);
        globalYearInput.addEventListener('focus', (e) => {
            // Nasconde i suggerimenti di ricerca se aperti, poiché l'utente sta aprendo il selettore anni
            const suggestionsBox = document.getElementById('search-suggestions');
            if (suggestionsBox) {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
            }
        });
        globalYearInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeSearchGlobal();
        });
    }

    // Hide global search suggestions on click outside
    document.addEventListener('click', (e) => {
        const container = document.getElementById('search-container');
        const suggestionsBox = document.getElementById('search-suggestions');
        if (container && suggestionsBox && !container.contains(e.target)) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.classList.remove('flex');
        }
    });

    // Custom Year Picker Logic
    const ypInput = document.getElementById('search-year-input');
    const ypDropdown = document.getElementById('year-picker-dropdown');
    const ypPrev = document.getElementById('yp-prev');
    const ypNext = document.getElementById('yp-next');
    const ypLabel = document.getElementById('yp-decade-label');
    const ypGrid = document.getElementById('yp-grid');
    const ypClear = document.getElementById('yp-clear');
    
    let currentDecadeStart = Math.floor(new Date().getFullYear() / 10) * 10;

    function renderYearPicker() {
        if (!ypLabel || !ypGrid) return;
        ypLabel.innerText = `${currentDecadeStart} - ${currentDecadeStart + 9}`;
        ypGrid.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const year = currentDecadeStart + i;
            const btn = document.createElement('button');
            btn.className = 'py-2 px-2 rounded-md font-label-md text-on-surface-variant hover:bg-white/10 hover:text-white transition-colors';
            if (ypInput && ypInput.value == year) {
                btn.className = 'py-2 px-2 rounded-md font-label-md bg-primary-container text-black font-bold shadow-lg';
            }
            btn.innerText = year;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (ypInput) {
                    ypInput.value = year;
                    triggerSearchSuggest();
                }
                if (ypDropdown) {
                    ypDropdown.classList.add('hidden');
                    ypDropdown.classList.remove('flex');
                }
            });
            ypGrid.appendChild(btn);
        }
    }

    if (ypInput && ypDropdown) {
        ypInput.addEventListener('click', (e) => {
            e.stopPropagation();
            if (ypInput.value) {
                currentDecadeStart = Math.floor(parseInt(ypInput.value) / 10) * 10;
            } else {
                currentDecadeStart = Math.floor(new Date().getFullYear() / 10) * 10;
            }
            renderYearPicker();
            ypDropdown.classList.toggle('hidden');
            ypDropdown.classList.toggle('flex');
            
            // Chiude la box dei suggerimenti di ricerca all'apertura del picker
            const suggestionsBox = document.getElementById('search-suggestions');
            if (suggestionsBox) {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
            }
        });
        
        if (ypPrev) ypPrev.addEventListener('click', (e) => { e.stopPropagation(); currentDecadeStart -= 10; renderYearPicker(); });
        if (ypNext) ypNext.addEventListener('click', (e) => { e.stopPropagation(); currentDecadeStart += 10; renderYearPicker(); });
        
        if (ypClear) ypClear.addEventListener('click', (e) => {
            e.stopPropagation();
            ypInput.value = '';
            ypDropdown.classList.add('hidden');
            ypDropdown.classList.remove('flex');
            triggerSearchSuggest();
        });

        document.addEventListener('click', (e) => {
            if (!ypInput.contains(e.target) && !ypDropdown.contains(e.target)) {
                ypDropdown.classList.add('hidden');
                ypDropdown.classList.remove('flex');
            }
        });
    }

    // Support Modal (Bug Reporter Form)
    const sFab = document.getElementById('support-fab');
    const sModal = document.getElementById('support-modal');
    const sClose = document.getElementById('support-close');
    const sBk = document.getElementById('support-backdrop');
    const sForm = document.getElementById('support-form');

    const openS = () => {
        if (sModal) {
            sModal.classList.remove('hidden');
            sModal.classList.add('flex');
            const statusBox = document.getElementById('support-status');
            if (statusBox) statusBox.classList.add('hidden');
        }
    };
    
    const closeS = () => {
        if (sModal) {
            sModal.classList.add('hidden');
            sModal.classList.remove('flex');
        }
    };
    
    if (sFab) sFab.addEventListener('click', openS);
    if (sClose) sClose.addEventListener('click', closeS);
    if (sBk) sBk.addEventListener('click', closeS);
    
    if (sForm) {
        sForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('support-title').value.trim();
            const email = document.getElementById('support-email').value.trim();
            const description = document.getElementById('support-message').value.trim();
            const submitBtn = document.getElementById('support-submit');
            const statusBox = document.getElementById('support-status');
            
            if (!title || !description) return;
            
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px] align-middle mr-2">sync</span>Invio in corso...';
            }
            if (statusBox) {
                statusBox.className = 'px-4 py-3 rounded-lg border font-body-md text-body-md transition-all duration-300 bg-yellow-500/10 border-yellow-500/30 text-yellow-200';
                statusBox.innerHTML = 'Connessione al server e creazione del ticket su GitHub...';
                statusBox.classList.remove('hidden');
            }
            
            try {
                const loggedInUser = localStorage.getItem('stoike_user') || 'Anonimo';
                const response = await fetch('/api/report-bug', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        email: email || '',
                        currentPage: window.location.href,
                        browserInfo: navigator.userAgent,
                        username: loggedInUser
                    })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    if (statusBox) {
                        statusBox.className = 'px-4 py-3 rounded-lg border font-body-md text-body-md transition-all duration-300 bg-green-500/10 border-green-500/30 text-green-200';
                        statusBox.innerHTML = `<strong>Successo!</strong> Segnalazione salvata. Grazie per aver migliorato Stoike!`;
                    }

                    sForm.reset();
                    setTimeout(() => {
                        closeS();
                        if (statusBox) statusBox.classList.add('hidden');
                    }, 2000);
                } else {
                    if (statusBox) {
                        statusBox.className = 'px-4 py-3 rounded-lg border font-body-md text-body-md transition-all duration-300 bg-red-500/10 border-red-500/30 text-red-200';
                        statusBox.innerHTML = `<strong>Errore:</strong> ${data.message || 'Impossibile creare la issue.'}`;
                    }
                }
            } catch (err) {
                if (statusBox) {
                    statusBox.className = 'px-4 py-3 rounded-lg border font-body-md text-body-md transition-all duration-300 bg-red-500/10 border-red-500/30 text-red-200';
                    statusBox.innerHTML = '<strong>Errore di connessione:</strong> Impossibile raggiungere il server.';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<span class="material-symbols-outlined text-[20px] align-middle mr-2">send</span>Invia segnalazione';
                }
            }
        });
    }

    // Highlight active link in the navigation bars
    highlightActiveNav();

    // Inject mobile search overlay HTML on page load
    injectMobileSearchOverlay();

    // Setup global notifications click/badge behavior
    setupGlobalNotificationsBehavior();
    updateNotificationsCount();
    // Update count periodically every 30 seconds
    setInterval(updateNotificationsCount, 30000);
});

// ── Unified Notifications & Badges System ──

async function updateNotificationsCount() {
    const user = localStorage.getItem('stoike_user');
    const badges = document.querySelectorAll('#nav-notifications-badge, #bottom-notifications-badge, .notifications-badge');
    if (!user) {
        badges.forEach(b => {
            b.classList.add('hidden');
            b.innerText = '0';
        });
        return;
    }
    try {
        const resp = await fetch(`/api/notifications/${encodeURIComponent(user)}?_t=${Date.now()}`);
        if (resp.ok) {
            const notifs = await resp.json();
            const readKey = `stoike_read_notifications_${user}`;
            let readIds = [];
            try {
                readIds = JSON.parse(localStorage.getItem(readKey)) || [];
            } catch(e){}
            const deletedKey = `stoike_deleted_notifications_${user}`;
            let deletedIds = [];
            try {
                deletedIds = JSON.parse(localStorage.getItem(deletedKey)) || [];
            } catch(e){}
            const unread = notifs.filter(n => !readIds.includes(n.id) && !deletedIds.includes(n.id)).length;
            badges.forEach(b => {
                if (unread > 0) {
                    b.innerText = unread;
                    b.classList.remove('hidden');
                } else {
                    b.classList.add('hidden');
                    b.innerText = '0';
                }
            });
        }
    } catch(e) {
        console.warn("Impossibile caricare il conteggio notifiche:", e);
    }
}

function setupGlobalNotificationsBehavior() {
    const bellBtns = [];
    document.querySelectorAll('button, a').forEach(el => {
        const hasBellIcon = el.querySelector('[data-icon="notifications"]') || 
                            (el.querySelector('.material-symbols-outlined') && el.querySelector('.material-symbols-outlined').innerText.trim() === 'notifications') ||
                            el.getAttribute('title') === 'Notifiche';
        if (hasBellIcon && !el.classList.contains('md:hidden') && el.tagName !== 'A') {
            bellBtns.push(el);
        }
    });

    bellBtns.forEach(btn => {
        btn.setAttribute('onclick', "window.location.href='/notifications.html'");
        btn.style.cursor = 'pointer';
        btn.classList.add('relative');
        
        let badge = btn.querySelector('.notifications-badge, #nav-notifications-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.id = 'nav-notifications-badge';
            badge.className = 'notifications-badge hidden absolute top-0.5 right-0.5 bg-red-500 text-white font-bold text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-background z-10';
            btn.appendChild(badge);
        }
    });
}

window.updateNotificationsCount = updateNotificationsCount;

// ── Mobile Search Overlay Logic ──

function injectMobileSearchOverlay() {
    if (document.getElementById('mobile-search-overlay')) return;

    const overlayDiv = document.createElement('div');
    overlayDiv.id = 'mobile-search-overlay';
    overlayDiv.className = 'fixed inset-0 z-[9999] bg-background/95 backdrop-blur-2xl hidden flex-col p-6 transition-all duration-300 opacity-0';
    overlayDiv.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-primary-container text-[32px]">movie_filter</span>
                <div>
                    <span class="text-xl font-bold text-white block" data-i18n="bottomNav.search">Cerca nel Catalogo</span>
                    <span class="text-xs text-on-surface-variant/70">Film, attori e molto altro</span>
                </div>
            </div>
            <button onclick="closeMobileSearchOverlay()" class="p-2.5 hover:bg-white/10 rounded-full text-on-surface-variant hover:text-white transition-colors bg-white/5">
                <span class="material-symbols-outlined text-[26px]">close</span>
            </button>
        </div>
        <div class="flex flex-col gap-5 font-headline-sm">
            <!-- Search input with icon -->
            <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[22px] pointer-events-none">search</span>
                <input id="mobile-search-input" class="w-full bg-white/5 border border-outline-variant/20 rounded-2xl pl-12 pr-4 py-4 text-white focus:border-primary-container focus:ring-0 focus:bg-white/8 outline-none transition-all text-base placeholder:text-on-surface-variant/50" placeholder="Cerca film..." type="text" autocomplete="off" data-i18n-placeholder="search.placeholder" />
            </div>

            <!-- Year selector with icon -->
            <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-[22px] pointer-events-none">calendar_today</span>
                <input id="mobile-search-year-input" type="text" class="w-full bg-white/5 border border-outline-variant/20 rounded-2xl pl-12 pr-12 py-4 text-white focus:border-primary-container focus:ring-0 focus:bg-white/8 outline-none transition-all text-base cursor-pointer placeholder:text-on-surface-variant/50" placeholder="Filtra per Anno di uscita" autocomplete="off" readonly />
                <span class="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 text-[22px] pointer-events-none">arrow_drop_down</span>
            </div>
            
            <!-- Mobile Year Picker Dropdown -->
            <div id="mobile-year-picker-dropdown" class="hidden flex-col bg-surface-container border border-outline-variant/15 rounded-2xl p-5 shadow-2xl">
                <div class="flex justify-between items-center mb-4">
                    <button id="myp-prev" class="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"><span class="material-symbols-outlined text-[22px]">chevron_left</span></button>
                    <span id="myp-decade-label" class="font-bold text-white text-base tracking-wide"></span>
                    <button id="myp-next" class="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"><span class="material-symbols-outlined text-[22px]">chevron_right</span></button>
                </div>
                <div id="myp-grid" class="grid grid-cols-5 gap-2"></div>
                <div class="mt-4 pt-3 border-t border-outline-variant/10 flex justify-between items-center">
                    <button id="myp-clear" class="text-sm text-red-400 hover:text-red-300 transition-colors font-medium" data-i18n="search.clearYear">Pulisci</button>
                    <button id="myp-close" class="text-sm text-primary-container hover:underline transition-colors font-bold">Ok</button>
                </div>
            </div>

            <!-- Mobile Suggestions Box -->
            <div id="mobile-search-suggestions" class="hidden flex-col bg-surface-container/50 border border-outline-variant/10 rounded-2xl shadow-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <!-- Suggestions will be injected here -->
            </div>
            
            <button onclick="executeMobileSearch()" class="relative w-full py-4 mt-1 bg-gradient-to-r from-primary-container to-primary text-black font-bold rounded-2xl hover:shadow-xl hover:shadow-primary-container/30 transition-all duration-300 flex justify-center items-center gap-2 text-base overflow-hidden">
                <span class="material-symbols-outlined text-[22px]">search</span>
                <span data-i18n="bottomNav.search">Cerca</span>
            </button>
        </div>
    `;
    document.body.appendChild(overlayDiv);

    setupMobileSearchOverlayLogic();
}

function setupMobileSearchOverlayLogic() {
    const input = document.getElementById('mobile-search-input');
    const yearInput = document.getElementById('mobile-search-year-input');
    const suggestionsBox = document.getElementById('mobile-search-suggestions');
    
    let searchTimeout = null;

    function triggerMobileSearchSuggest() {
        clearTimeout(searchTimeout);
        const q = input ? input.value.trim() : '';
        const y = yearInput ? yearInput.value.trim() : '';
        
        if (!q && !y) {
            if (suggestionsBox) {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
            }
            return;
        }

        if (suggestionsBox) {
            suggestionsBox.innerHTML = `<div class="p-4 text-center font-label-md text-on-surface-variant animate-pulse">. . .</div>`;
            suggestionsBox.classList.remove('hidden');
            suggestionsBox.classList.add('flex');
        }

        searchTimeout = setTimeout(() => {
            fetchMobileSuggestions();
        }, 500);
    }

    if (input) {
        input.addEventListener('input', () => {
            if (mypDropdown) {
                mypDropdown.classList.add('hidden');
                mypDropdown.classList.remove('flex');
            }
            triggerMobileSearchSuggest();
        });
        input.addEventListener('focus', () => {
            if (mypDropdown) {
                mypDropdown.classList.add('hidden');
                mypDropdown.classList.remove('flex');
            }
            triggerMobileSearchSuggest();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeMobileSearch();
        });
    }

    if (yearInput) {
        yearInput.addEventListener('input', triggerMobileSearchSuggest);
        yearInput.addEventListener('focus', (e) => {
            if (suggestionsBox) {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
            }
        });
        yearInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeMobileSearch();
        });
    }

    // Hide mobile suggestions on click outside
    document.addEventListener('click', (e) => {
        const overlay = document.getElementById('mobile-search-overlay');
        if (overlay && suggestionsBox && !overlay.contains(e.target) && !e.target.closest('#mobile-search-suggestions')) {
            suggestionsBox.classList.add('hidden');
            suggestionsBox.classList.remove('flex');
        }
    });

    // Mobile Year Picker Dropdown
    const mypDropdown = document.getElementById('mobile-year-picker-dropdown');
    const mypPrev = document.getElementById('myp-prev');
    const mypNext = document.getElementById('myp-next');
    const mypClear = document.getElementById('myp-clear');
    const mypClose = document.getElementById('myp-close');
    
    let currentMobileDecadeStart = Math.floor(new Date().getFullYear() / 10) * 10;

    function renderMobileYearPicker() {
        const ypLabel = document.getElementById('myp-decade-label');
        const ypGrid = document.getElementById('myp-grid');
        if (!ypLabel || !ypGrid) return;
        
        ypLabel.innerText = `${currentMobileDecadeStart} - ${currentMobileDecadeStart + 9}`;
        ypGrid.innerHTML = '';
        for (let i = 0; i < 10; i++) {
            const year = currentMobileDecadeStart + i;
            const btn = document.createElement('button');
            btn.className = 'py-2 px-1 rounded-md text-xs text-on-surface-variant hover:bg-white/10 hover:text-white transition-colors';
            if (yearInput && yearInput.value == year) {
                btn.className = 'py-2 px-1 rounded-md text-xs bg-primary-container text-black font-bold shadow-lg';
            }
            btn.innerText = year;
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (yearInput) {
                    yearInput.value = year;
                    triggerMobileSearchSuggest();
                }
                if (mypDropdown) {
                    mypDropdown.classList.add('hidden');
                    mypDropdown.classList.remove('flex');
                }
            });
            ypGrid.appendChild(btn);
        }
    }

    if (yearInput && mypDropdown) {
        yearInput.addEventListener('click', (e) => {
            e.stopPropagation();
            if (yearInput.value) {
                currentMobileDecadeStart = Math.floor(parseInt(yearInput.value) / 10) * 10;
            } else {
                currentMobileDecadeStart = Math.floor(new Date().getFullYear() / 10) * 10;
            }
            renderMobileYearPicker();
            mypDropdown.classList.toggle('hidden');
            mypDropdown.classList.toggle('flex');

            if (suggestionsBox) {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
            }
        });
        
        if (mypPrev) mypPrev.addEventListener('click', (e) => { e.stopPropagation(); currentMobileDecadeStart -= 10; renderMobileYearPicker(); });
        if (mypNext) mypNext.addEventListener('click', (e) => { e.stopPropagation(); currentMobileDecadeStart += 10; renderMobileYearPicker(); });
        
        if (mypClear) mypClear.addEventListener('click', (e) => {
            e.stopPropagation();
            yearInput.value = '';
            mypDropdown.classList.add('hidden');
            mypDropdown.classList.remove('flex');
            triggerMobileSearchSuggest();
        });

        if (mypClose) mypClose.addEventListener('click', (e) => {
            e.stopPropagation();
            mypDropdown.classList.add('hidden');
            mypDropdown.classList.remove('flex');
        });

        document.addEventListener('click', (e) => {
            if (!yearInput.contains(e.target) && !mypDropdown.contains(e.target)) {
                mypDropdown.classList.add('hidden');
                mypDropdown.classList.remove('flex');
            }
        });
    }
}

window.openMobileSearchOverlay = function(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const overlay = document.getElementById('mobile-search-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        // Apply translations inside overlay dynamically
        if (window.i18n) {
            window.i18n.applyTranslations();
        }
        setTimeout(() => {
            overlay.classList.remove('opacity-0');
            overlay.classList.add('opacity-100');
        }, 10);
        const input = document.getElementById('mobile-search-input');
        if (input) input.focus();
    }
};

window.closeMobileSearchOverlay = function() {
    const overlay = document.getElementById('mobile-search-overlay');
    if (overlay) {
        overlay.classList.remove('opacity-100');
        overlay.classList.add('opacity-0');
        setTimeout(() => {
            overlay.classList.remove('flex');
            overlay.classList.add('hidden');
        }, 300);
    }
};

window.executeMobileSearch = function() {
    const input = document.getElementById('mobile-search-input');
    const yearInput = document.getElementById('mobile-search-year-input');
    const query = input ? input.value.trim() : '';
    const year = yearInput ? yearInput.value.trim() : '';
    if (!query && !year) return;
    let url = '/list.html?';
    if (query) url += `query=${encodeURIComponent(query)}&`;
    if (year) url += `year=${encodeURIComponent(year)}`;
    window.location.href = url;
};

async function fetchMobileSuggestions() {
    const suggestionsBox = document.getElementById('mobile-search-suggestions');
    const input = document.getElementById('mobile-search-input');
    const yearInput = document.getElementById('mobile-search-year-input');
    
    if (!suggestionsBox) return;

    const query = input ? input.value.trim() : '';
    const year = yearInput ? yearInput.value.trim() : '';

    if (!query && !year) {
        suggestionsBox.classList.add('hidden');
        suggestionsBox.classList.remove('flex');
        return;
    }

    let endpoint = '';
    if (query && year) {
        endpoint = `/search/movie?query=${encodeURIComponent(query)}&primary_release_year=${encodeURIComponent(year)}`;
    } else if (query) {
        endpoint = `/search/movie?query=${encodeURIComponent(query)}`;
    } else if (year) {
        endpoint = `/discover/movie?primary_release_year=${encodeURIComponent(year)}&sort_by=popularity.desc`;
    }
    
    const rawData = await fetchTMDB(endpoint);
    
    if (rawData && rawData.results && rawData.results.length > 0) {
        suggestionsBox.innerHTML = '';
        rawData.results.slice(0, 5).forEach(m => {
            const movie = mapTMDBMovie(m);
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 hover:bg-surface-container-high cursor-pointer transition-colors border-b border-outline-variant/10 last:border-0';
            item.innerHTML = `<img src="${movie.poster_url}" class="w-10 h-14 object-cover rounded shadow-sm" alt="${movie.title}" onerror="this.src='https://placehold.co/150x225/131313/FFFFFF?text=No+Cover'"><div class="flex-1 min-w-0"><div class="font-label-md text-white truncate">${movie.title}</div><div class="font-label-sm text-on-surface-variant">${movie.release_year} • <span class="material-symbols-outlined text-[12px] material-fill-1 text-primary-container align-middle">star</span> ${movie.rating}</div></div>`;
            item.addEventListener('click', () => {
                suggestionsBox.classList.add('hidden');
                suggestionsBox.classList.remove('flex');
                if (input) input.value = '';
                if (yearInput) yearInput.value = '';
                closeMobileSearchOverlay();
                window.location.href = `/movie.html?id=${movie.id}`;
            });
            suggestionsBox.appendChild(item);
        });
    } else {
        suggestionsBox.innerHTML = `<div class="p-4 text-center font-label-md text-on-surface-variant">${window.i18n ? i18n.t('search.noResults') : 'Nessun risultato'}</div>`;
    }
}

// Utility to apply CSS classes to nav links matching the current pathname/query
function highlightActiveNav() {
    const path = window.location.pathname;
    const search = window.location.search;
    
    const tA = 'text-primary-container font-bold border-b-2 border-primary-container pb-1 opacity-80 scale-95'.split(' ');
    const sA = 'bg-primary-container/10 text-primary-container border-r-4 border-primary-container'.split(' ');
    const bA = 'text-primary-container drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]'.split(' ');

    const links = document.querySelectorAll('nav a, header a');
    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        let isActive = false;
        
        // Match specific rules
        if (href.includes('index.html') && (path.endsWith('/') || path.endsWith('index.html'))) {
            isActive = true;
        } else if (href.includes('genres.html') && path.includes('genres.html')) {
            isActive = true;
        } else if (href.includes('actors.html') && path.includes('actors.html')) {
            isActive = true;
        } else if (href.includes('list.html')) {
            // Check specific types: top_rated, upcoming, etc.
            const typeParam = getQueryParam('type', href);
            const currentTypeParam = getQueryParam('type', window.location.href);
            if (typeParam && typeParam === currentTypeParam) {
                isActive = true;
            }
        }

        if (isActive) {
            const nav = link.parentElement;
            const isT = nav.classList.contains('hidden') && nav.classList.contains('md:flex');
            const isS = nav.tagName === 'NAV' && nav.classList.contains('flex-col');
            const isB = nav.tagName === 'NAV' && nav.classList.contains('bottom-0');
            
            if (isT) {
                link.classList.add(...tA);
                link.classList.remove('text-on-surface-variant');
            } else if (isS) {
                link.classList.add(...sA);
                link.classList.remove('text-on-surface-variant');
            } else if (isB) {
                link.classList.add(...bA);
                link.classList.remove('text-on-surface-variant', 'opacity-60');
            }
        }
    });
}

function getQueryParam(param, url) {
    try {
        const urlObj = new URL(url, window.location.origin);
        return urlObj.searchParams.get(param);
    } catch (e) {
        return null;
    }
}

// Dynamic movie card hover trailer playback and visual focus system
(function initMovieCardHoverTrailerSystem() {
    let activeHoverCard = null;
    let hoverTimeout = null;
    let prefetchPromise = null;
    let prefetchMovieId = null;
    let isModalActive = false;

    // Inject premium styles for focus, cinematic modal, and background blur dynamically
    const style = document.createElement('style');
    style.innerHTML = `
        .movie-card {
            transition: border-color 0.6s ease, 
                        box-shadow 0.6s ease,
                        filter 0.8s cubic-bezier(0.25, 1, 0.2, 1),
                        opacity 0.8s cubic-bezier(0.25, 1, 0.2, 1) !important;
            position: relative;
            z-index: 1;
        }
        
        .card-media-container {
            aspect-ratio: 2 / 3 !important;
            width: 100% !important;
            height: auto !important;
        }
        
        /* Cinematic full screen blurred backdrop */
        .movie-card-backdrop {
            position: fixed;
            inset: 0;
            background-color: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            z-index: 9990;
            opacity: 0;
            transition: opacity 0.8s cubic-bezier(0.25, 1, 0.2, 1);
            pointer-events: none;
        }
        
        .movie-card-backdrop.active {
            opacity: 1;
            pointer-events: auto;
            cursor: pointer;
        }
        
        /* Premium Centered Trailer Modal exactly matching the movie details trailer */
        .movie-trailer-modal {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) scale(0.95);
            width: 90vw;
            max-width: 896px; /* matches max-w-4xl details container */
            aspect-ratio: 16 / 9;
            z-index: 9995;
            opacity: 0;
            transition: transform 0.8s cubic-bezier(0.25, 1, 0.2, 1), 
                        opacity 0.8s cubic-bezier(0.25, 1, 0.2, 1);
            pointer-events: none;
            background-color: #000;
            border-radius: 12px; /* rounded-xl */
            overflow: hidden;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 50px 100px rgba(0, 0, 0, 0.95), 0 0 45px rgba(255, 215, 0, 0.25);
        }
        
        .movie-trailer-modal.active {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            pointer-events: auto;
        }
        
        /* Theater mode: Blurs and dims all cards EXCEPT the active hovered one */
        body.movie-card-focus-active .movie-card:not(.hovered-source-card) {
            filter: blur(5px) brightness(0.25) grayscale(0.2) !important;
            opacity: 0.45 !important;
        }
        
        body.movie-card-focus-active .movie-card.hovered-source-card {
            border-color: #ffd700 !important;
            box-shadow: 0 10px 30px rgba(255, 215, 0, 0.25) !important;
            z-index: 10 !important;
        }
        
        .movie-card-loader {
            animation: fadeIn 0.3s ease-out forwards;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
    `;
    document.head.appendChild(style);

    // Setup hover triggers using event delegation
    document.addEventListener('mouseover', (e) => {
        const card = e.target.closest('.movie-card');
        if (!card) return;

        // If we are already hovering on this card or a trailer is active, do nothing
        if (activeHoverCard === card || isModalActive) return;

        // Clean up previous card if any
        if (activeHoverCard) {
            cleanupCard(activeHoverCard);
        }

        activeHoverCard = card;
        setupCardHover(card);
    });

    document.addEventListener('mouseout', (e) => {
        if (isModalActive) return; // Do not dismiss if the trailer is currently playing!

        const relatedTarget = e.relatedTarget;
        if (activeHoverCard && (!relatedTarget || !activeHoverCard.contains(relatedTarget))) {
            cleanupCard(activeHoverCard);
            activeHoverCard = null;
        }
    });

    function setupCardHover(card) {
        const movieId = card.getAttribute('data-movie-id');
        if (!movieId) return;

        const mediaContainer = card.querySelector('.card-media-container');
        if (!mediaContainer) return;

        // 1. Immediately (second 0): inject dynamic loading overlay
        const loader = document.createElement('div');
        loader.className = 'movie-card-loader absolute inset-0 bg-black/70 backdrop-blur-[3px] flex flex-col items-center justify-center gap-2 z-20 transition-all duration-300';
        loader.innerHTML = `
            <span class="material-symbols-outlined animate-spin text-primary-container text-[36px] material-fill-1">sync</span>
            <span class="text-white font-label-md tracking-wider uppercase text-[10px] bg-black/50 px-2.5 py-1 rounded-full border border-white/10 shadow-lg">Anteprima...</span>
        `;
        mediaContainer.appendChild(loader);

        // Pre-fetch the trailer videos concurrently
        prefetchMovieId = movieId;
        prefetchPromise = fetchTMDB(`/movie/${movieId}/videos`).catch(() => null);

        // 2. Set timeout for 3 seconds of focused hovering
        hoverTimeout = setTimeout(async () => {
            if (activeHoverCard !== card) return;

            // Wait for prefetch or fetch video info
            const videos = await prefetchPromise;
            if (activeHoverCard !== card) return;

            const trailer = videos && videos.results ? videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') : null;

            if (trailer && trailer.key) {
                // Lock interaction and trigger active modal state
                isModalActive = true;

                // Highlight source card and set body theater mode class
                card.classList.add('hovered-source-card');
                document.body.classList.add('movie-card-focus-active');

                // Remove loading overlay from the card
                if (loader) {
                    loader.remove();
                }

                // Inject the dynamic cinema backdrop overlay
                let backdrop = document.querySelector('.movie-card-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'movie-card-backdrop';
                    document.body.appendChild(backdrop);
                    
                    // Click on backdrop is the ONLY way to exit the playing trailer modal
                    backdrop.addEventListener('click', () => {
                        if (activeHoverCard) {
                            cleanupCard(activeHoverCard);
                            activeHoverCard = null;
                        }
                    });
                }

                // Inject the dynamic trailer modal
                let modal = document.querySelector('.movie-trailer-modal');
                if (!modal) {
                    modal = document.createElement('div');
                    modal.className = 'movie-trailer-modal';
                    document.body.appendChild(modal);
                }

                // Render the YouTube iframe inside the modal styled exactly like the movie details trailer
                modal.innerHTML = `
                    <iframe class="w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&controls=0&modestbranding=1&loop=1&playlist=${trailer.key}&rel=0&iv_load_policy=3&showinfo=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                `;

                // Force reflow and activate transitions
                backdrop.offsetHeight;
                modal.offsetHeight;

                backdrop.classList.add('active');
                modal.classList.add('active');
            } else {
                // No trailer: remove loading overlay
                if (loader) {
                    loader.remove();
                }
            }
        }, 3000);
    }

    function cleanupCard(card) {
        clearTimeout(hoverTimeout);
        hoverTimeout = null;
        isModalActive = false;

        // Restore visual styling and deactivate theater mode
        card.classList.remove('hovered-source-card');
        document.body.classList.remove('movie-card-focus-active');

        // Deactivate and fade out cinema backdrop
        const backdrop = document.querySelector('.movie-card-backdrop');
        if (backdrop) {
            backdrop.classList.remove('active');
            setTimeout(() => {
                if (!document.body.classList.contains('movie-card-focus-active')) {
                    backdrop.remove();
                }
            }, 800);
        }

        // Deactivate and fade out dynamic trailer modal
        const modal = document.querySelector('.movie-trailer-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                if (!document.body.classList.contains('movie-card-focus-active')) {
                    modal.remove();
                }
            }, 800);
        }

        const mediaContainer = card.querySelector('.card-media-container');
        if (mediaContainer) {
            // Restore poster opacity
            const img = mediaContainer.querySelector('img');
            if (img) img.style.opacity = '1';

            // Remove loading overlay
            const loader = mediaContainer.querySelector('.movie-card-loader');
            if (loader) loader.remove();
        }
    }
})();

