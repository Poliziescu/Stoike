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
        rating: m.vote_average ? m.vote_average.toFixed(1) : 'N/A',
        release_year: m.release_date ? m.release_date.substring(0, 4) : 'N/A',
        poster_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : 'https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Cover',
        backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : 'https://via.placeholder.com/1280x720/131313/FFFFFF?text=No+Backdrop',
        synopsis: m.overview || ''
    };
}

// Auth State Manager
let currentAuthMode = 'login';

function checkAuthState() {
    const u = localStorage.getItem('stoike_user');
    const ab = document.getElementById('auth-btn');
    const ui = document.getElementById('user-info');
    if (u) {
        if (ab) ab.classList.add('hidden');
        if (ui) ui.classList.remove('hidden');
        const us = document.getElementById('current-username');
        if (us) us.innerText = u;
    } else {
        if (ab) ab.classList.remove('hidden');
        if (ui) ui.classList.add('hidden');
    }
}

function logoutUser() {
    localStorage.removeItem('stoike_user');
    localStorage.removeItem('stoike_role');
    checkAuthState();
    // Refresh page in case of admin access to update UI controls
    window.location.reload();
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.remove('hidden');
        const error = document.getElementById('auth-error');
        if (error) error.classList.add('hidden');
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    const form = document.getElementById('auth-form');
    if (modal) modal.classList.add('hidden');
    if (form) form.reset();
}

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
    } else {
        if (tr) tr.className = 'flex-1 font-label-md text-primary-container border-b-2 border-primary-container pb-1 transition-colors';
        if (tl) tl.className = 'flex-1 font-label-md text-on-surface-variant hover:text-white transition-colors pb-1';
        if (ti) ti.innerText = 'Registrazione';
        if (bt) bt.innerText = 'Registrati';
        if (bi) bi.innerText = 'person_add';
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

// Search execution redirects to list.html with query
function executeSearchGlobal() {
    const input = document.getElementById('search-input');
    const query = input ? input.value.trim() : '';
    if (!query) return;
    window.location.href = `/list.html?query=${encodeURIComponent(query)}`;
}

async function fetchSuggestionsGlobal(query) {
    const suggestionsBox = document.getElementById('search-suggestions');
    if (!query || !suggestionsBox) return;
    
    // Load TMDB results through common API
    const rawData = await fetchTMDB(`/search/movie?query=${encodeURIComponent(query)}`);
    if (rawData && rawData.results && rawData.results.length > 0) {
        suggestionsBox.innerHTML = '';
        rawData.results.slice(0, 5).forEach(m => {
            const movie = mapTMDBMovie(m);
            const item = document.createElement('div');
            item.className = 'flex items-center gap-3 p-3 hover:bg-surface-container-high cursor-pointer transition-colors border-b border-outline-variant/10 last:border-0';
            item.innerHTML = `<img src="${movie.poster_url}" class="w-10 h-14 object-cover rounded shadow-sm" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/150x225/131313/FFFFFF?text=No+Cover'"><div class="flex-1 min-w-0"><div class="font-label-md text-white truncate">${movie.title}</div><div class="font-label-sm text-on-surface-variant">${movie.release_year} • <span class="material-symbols-outlined text-[12px] material-fill-1 text-primary-container align-middle">star</span> ${movie.rating}</div></div>`;
            item.addEventListener('click', () => {
                suggestionsBox.classList.add('hidden');
                const si = document.getElementById('search-input');
                if (si) si.value = '';
                window.location.href = `/movie.html?id=${movie.id}`;
            });
            suggestionsBox.appendChild(item);
        });
        suggestionsBox.classList.remove('hidden');
    } else {
        suggestionsBox.innerHTML = `<div class="p-4 text-center font-label-md text-on-surface-variant">${window.i18n ? i18n.t('search.noResults') : 'Nessun risultato'}</div>`;
        suggestionsBox.classList.remove('hidden');
    }
}

// Global movie card renderer used on all search/list/genre results
function renderMovieCard(movie) {
    return `
        <div class="movie-card group flex flex-col bg-surface-container/30 border border-outline-variant/10 rounded-2xl overflow-hidden hover:border-primary-container/30 hover:bg-surface-container/50 hover:shadow-2xl hover:shadow-primary-container/5 transition-all duration-500 cursor-pointer" onclick="window.location.href='/movie.html?id=${movie.id}'">
            <div class="relative aspect-[2/3] overflow-hidden">
                <img src="${movie.poster_url}" alt="${movie.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Cover'" />
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                    <button class="w-12 h-12 bg-primary-container text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform duration-300 shadow-lg mx-auto">
                        <span class="material-symbols-outlined material-fill-1 text-[28px]">play_arrow</span>
                    </button>
                </div>
                <div class="absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-outline-variant/20 rounded-full flex items-center gap-1">
                    <span class="material-symbols-outlined text-[14px] material-fill-1 text-primary-container">star</span>
                    <span class="font-label-sm text-label-sm text-primary-container">${movie.rating}</span>
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
        menuToggle.addEventListener('mouseenter', openDrawer);
        menuToggle.addEventListener('mouseleave', () => {
            closeTimeout = setTimeout(closeDrawer, 800);
        });
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
            
            const originalText = bt.innerText;
            bt.innerText = 'Attendere...';
            sb.disabled = true;
            sb.classList.add('opacity-50');
            
            try {
                const response = await fetch(currentAuthMode === 'login' ? '/api/auth/login' : '/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p })
                });
                const data = await response.json();
                if (data && data.success) {
                    localStorage.setItem('stoike_user', data.username);
                    localStorage.setItem('stoike_role', data.role);
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

    // Search Box suggest and key event listeners
    const si = document.getElementById('search-input');
    let st = null;
    if (si) {
        si.addEventListener('input', e => {
            clearTimeout(st);
            const q = e.target.value.trim();
            if (!q) {
                const suggestionsBox = document.getElementById('search-suggestions');
                if (suggestionsBox) suggestionsBox.classList.add('hidden');
                return;
            }
            st = setTimeout(() => fetchSuggestionsGlobal(q), 1000);
        });
        
        si.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                clearTimeout(st);
                executeSearchGlobal();
            }
        });
        
        document.addEventListener('click', e => {
            const container = document.getElementById('search-container');
            const suggestionsBox = document.getElementById('search-suggestions');
            if (container && !container.contains(e.target) && suggestionsBox) {
                suggestionsBox.classList.add('hidden');
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
                const response = await fetch('/api/report-bug', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        title: title,
                        description: description,
                        email: email || '',
                        currentPage: window.location.href,
                        browserInfo: navigator.userAgent
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
});

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
