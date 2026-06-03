// =========================================
// STOIKE — Category Lists & Search Results
// =========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for genres cache to be initialized from common.js
    let attempts = 0;
    while (Object.keys(tmdbGenres).length === 0 && attempts < 10) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    const titleEl = document.getElementById('list-title');
    const gridEl = document.getElementById('movies-grid');
    if (!gridEl) return;

    // Parse URL params
    const params = new URLSearchParams(window.location.search);
    const query = params.get('query');
    const year = params.get('year');
    const type = params.get('type');

    // ── WATCHLIST MODE ──
    if (type === 'watchlist') {
        if (titleEl) titleEl.innerText = i18n.t('list.watchlist') || 'La mia Watchlist';

        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');

        const user = localStorage.getItem('stoike_user');
        if (!user) {
            gridEl.innerHTML = `
                <div class="col-span-full text-center py-20 text-on-surface-variant">
                    <span class="material-symbols-outlined text-[56px] mb-4 block opacity-30">lock</span>
                    <p class="text-lg font-medium mb-2">Accedi per vedere la tua Watchlist</p>
                    <p class="text-sm opacity-70">Effettua il login per salvare film e ricevere promemoria sulle uscite.</p>
                </div>
            `;
            return;
        }

        // Show loading skeleton
        gridEl.innerHTML = `
            <div class="col-span-full flex flex-col items-center justify-center py-16 gap-3">
                <span class="material-symbols-outlined text-[40px] text-primary-container animate-spin">sync</span>
                <span class="text-on-surface-variant text-sm">Caricamento watchlist...</span>
            </div>
        `;

        try {
            // Fetch saved movies from API
            let savedMovies = [];
            try {
                const res = await fetch(`/api/reminders/${encodeURIComponent(user)}`);
                if (res.ok) {
                    savedMovies = await res.json();
                }
            } catch (fetchErr) {
                console.warn('Fallback to localStorage for watchlist:', fetchErr);
            }

            // Fallback to localStorage if API returned nothing
            if (!savedMovies || savedMovies.length === 0) {
                const localRaw = localStorage.getItem('stoike_saved_movies_' + user);
                if (localRaw) {
                    try {
                        const localParsed = JSON.parse(localRaw);
                        savedMovies = localParsed.map(m => ({
                            tmdb_movie_id: m.id || m.tmdb_movie_id,
                            title: m.title,
                            poster_url: m.poster_url
                        }));
                    } catch (e) {}
                }
            }

            if (!savedMovies || savedMovies.length === 0) {
                gridEl.innerHTML = `
                    <div class="col-span-full text-center py-20 text-on-surface-variant">
                        <span class="material-symbols-outlined text-[56px] mb-4 block opacity-30">bookmark_border</span>
                        <p class="text-lg font-medium mb-2">La tua Watchlist è vuota</p>
                        <p class="text-sm opacity-70">Salva i film che ti interessano per ritrovarli qui e ricevere promemoria sulle uscite.</p>
                    </div>
                `;
                return;
            }

            // Fetch TMDb details for each movie concurrently
            const movieIds = savedMovies.map(m => m.tmdb_movie_id).filter(Boolean);
            const tmdbPromises = movieIds.map(id =>
                fetchTMDB(`/movie/${id}`).catch(() => null)
            );
            const tmdbResults = await Promise.all(tmdbPromises);

            const movies = tmdbResults
                .filter(data => data && data.id)
                .map(data => {
                    // /movie/{id} returns `genres` array of {id, name} instead of genre_ids
                    const genreText = data.genres
                        ? data.genres.map(g => g.name).join(', ')
                        : (data.genre_ids ? data.genre_ids.map(id => tmdbGenres[id] || '').filter(Boolean).join(', ') : '');
                    return {
                        id: data.id,
                        title: data.title,
                        genre: genreText,
                        rating: data.vote_average ? data.vote_average.toFixed(1) : 'N/A',
                        release_year: data.release_date ? data.release_date.substring(0, 4) : 'N/A',
                        poster_url: data.poster_path
                            ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
                            : 'https://placehold.co/500x750/131313/FFFFFF?text=No+Cover',
                        backdrop_url: data.backdrop_path
                            ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
                            : '',
                        synopsis: data.overview || ''
                    };
                });

            if (movies.length > 0) {
                gridEl.innerHTML = movies.map(movie => renderMovieCard(movie)).join('');
            } else {
                gridEl.innerHTML = `
                    <div class="col-span-full text-center py-20 text-on-surface-variant">
                        <span class="material-symbols-outlined text-[56px] mb-4 block opacity-30">error_outline</span>
                        <p class="text-lg font-medium">Impossibile caricare i dettagli dei film salvati</p>
                    </div>
                `;
            }
        } catch (e) {
            console.error('Error loading watchlist:', e);
            gridEl.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">${i18n.t('list.error')}</div>`;
        }
        return;
    }

    // ── STANDARD TMDB LIST MODE ──
    let endpoint = '/trending/movie/week';
    let pageTitle = i18n.t('list.catalog');

    if (query && year) {
        pageTitle = `${i18n.t('list.resultsFor')} "${query}" (${year})`;
        endpoint = `/search/movie?query=${encodeURIComponent(query)}&primary_release_year=${encodeURIComponent(year)}`;
    } else if (query) {
        pageTitle = `${i18n.t('list.resultsFor')} "${query}"`;
        endpoint = `/search/movie?query=${encodeURIComponent(query)}`;
    } else if (year) {
        pageTitle = `Film del ${year}`;
        endpoint = `/discover/movie?primary_release_year=${encodeURIComponent(year)}&sort_by=popularity.desc`;
    } else if (type) {
        if (type === 'top_rated') {
            pageTitle = i18n.t('list.topRated');
            endpoint = '/movie/top_rated';
        } else if (type === 'new_releases') {
            pageTitle = i18n.t('list.newReleases');
            const today = new Date().toISOString().split('T')[0];
            endpoint = `/discover/movie?region=IT&with_release_type=2|3&primary_release_date.gte=${today}`;
        } else if (type === 'coming_soon') {
            pageTitle = i18n.t('list.comingSoon');
            endpoint = '/movie/upcoming';
        } else if (type === 'collection') {
            pageTitle = i18n.t('list.collection');
            endpoint = '/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000';
        }
    }

    if (titleEl) titleEl.innerText = pageTitle;

    let currentPage = 1;
    let totalPages = 1;

    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadMoreSpinner = document.getElementById('load-more-spinner');

    function getPagedEndpoint(baseEndpoint, page) {
        const separator = baseEndpoint.includes('?') ? '&' : '?';
        return `${baseEndpoint}${separator}page=${page}`;
    }

    async function loadPage(page) {
        const pagedEndpoint = getPagedEndpoint(endpoint, page);
        const data = await fetchTMDB(pagedEndpoint);
        if (data) {
            totalPages = data.total_pages || 1;
            let results = data.results || [];
            
            // Ordina i film per rating (vote_average) decrescente se siamo in top_rated o collection
            if (type === 'top_rated' || type === 'collection') {
                results.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
            }
            
            return results.map(m => mapTMDBMovie(m));
        }
        return [];
    }

    try {
        const movies = await loadPage(1);
        if (movies && movies.length > 0) {
            gridEl.innerHTML = movies.map(movie => renderMovieCard(movie)).join('');
            if (totalPages > 1) {
                loadMoreBtn.classList.remove('hidden');
            } else {
                loadMoreBtn.classList.add('hidden');
            }
        } else {
            gridEl.innerHTML = `
                <div class="col-span-full text-center py-16 text-on-surface-variant">
                    <span class="material-symbols-outlined text-[48px] mb-2 block opacity-40">search_off</span>
                    ${i18n.t('list.noMovies')}
                </div>
            `;
            loadMoreBtn.classList.add('hidden');
        }
    } catch (e) {
        console.error('Error loading list:', e);
        gridEl.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">${i18n.t('list.error')}</div>`;
        loadMoreBtn.classList.add('hidden');
    }

    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async () => {
            if (currentPage >= totalPages) return;

            loadMoreSpinner.classList.remove('hidden');
            loadMoreBtn.disabled = true;
            loadMoreBtn.classList.add('opacity-70');

            currentPage++;

            try {
                const nextMovies = await loadPage(currentPage);
                if (nextMovies && nextMovies.length > 0) {
                    const html = nextMovies.map(movie => renderMovieCard(movie)).join('');
                    gridEl.insertAdjacentHTML('beforeend', html);
                }
                
                if (currentPage >= totalPages) {
                    loadMoreBtn.classList.add('hidden');
                }
            } catch (e) {
                console.error('Error loading more movies:', e);
                currentPage--;
            } finally {
                loadMoreSpinner.classList.add('hidden');
                loadMoreBtn.disabled = false;
                loadMoreBtn.classList.remove('opacity-70');
            }
        });
    }
});
