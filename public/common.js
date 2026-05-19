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
        fetch(`/api/user/profile?username=${encodeURIComponent(u)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    const latestNickname = data.nickname || '';
                    const latestAvatar = data.avatar_url || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt7PZrBX9BJiiPiYcPFspIG13xOyP14bl7xlFDunbqT-rfZhgwIV4UoGe3TzGGWQ6Dr4xdgALPg9tdgrKl49JGdE-JxxariZRrTvGKlUOkpH8aXPB7bpDFTEXVR7UoGuf8cDFq8n1yxhiOpV9KwKetxG8xApbTLjbO-sGc18y_DLG_SiY9uSexy1JZ3rurDYa8JyyWg1_89Owywrb4zM9AejdI2QnwfYPYIUCaRcho_FQAHUtG0xJ2o6PvIFx0NFMbVr3D2STI9KL3';
                    
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
            item.innerHTML = `<img src="${movie.poster_url}" class="w-10 h-14 object-cover rounded shadow-sm" alt="${movie.title}" onerror="this.src='https://via.placeholder.com/150x225/131313/FFFFFF?text=No+Cover'"><div class="flex-1 min-w-0"><div class="font-label-md text-white truncate">${movie.title}</div><div class="font-label-sm text-on-surface-variant">${movie.release_year} • <span class="material-symbols-outlined text-[12px] material-fill-1 text-primary-container align-middle">star</span> ${movie.rating}</div></div>`;
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

// Global movie card renderer used on all search/list/genre results
function renderMovieCard(movie) {
    return `
        <div class="movie-card group flex flex-col bg-surface-container/30 border border-outline-variant/10 rounded-2xl overflow-hidden hover:border-primary-container/30 hover:bg-surface-container/50 hover:shadow-2xl hover:shadow-primary-container/5 transition-all duration-500 cursor-pointer" data-movie-id="${movie.id}" onclick="window.location.href='/movie.html?id=${movie.id}'">
            <div class="relative aspect-[2/3] overflow-hidden card-media-container">
                <img src="${movie.poster_url}" alt="${movie.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Cover'" />
                <div class="movie-rating-badge absolute top-3 right-3 px-3 py-1 bg-black/60 backdrop-blur-md border border-outline-variant/20 rounded-full flex items-center gap-1 z-30 transition-opacity duration-300">
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
        globalSearchInput.addEventListener('input', triggerSearchSuggest);
        globalSearchInput.addEventListener('focus', triggerSearchSuggest);
        globalSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') executeSearchGlobal();
        });
    }

    if (globalYearInput) {
        globalYearInput.addEventListener('input', triggerSearchSuggest);
        globalYearInput.addEventListener('focus', triggerSearchSuggest);
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

