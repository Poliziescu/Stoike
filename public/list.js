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
    const type = params.get('type');

    let endpoint = '/trending/movie/week';
    let pageTitle = 'Catalogo Film';

    if (query) {
        pageTitle = `Risultati per: "${query}"`;
        endpoint = `/search/movie?query=${encodeURIComponent(query)}`;
    } else if (type) {
        if (type === 'top_rated') {
            pageTitle = 'Top Rated';
            endpoint = '/movie/top_rated';
        } else if (type === 'new_releases') {
            pageTitle = 'New Releases';
            const today = new Date().toISOString().split('T')[0];
            endpoint = `/discover/movie?region=IT&with_release_type=2|3&primary_release_date.gte=${today}`;
        } else if (type === 'coming_soon') {
            pageTitle = 'Coming Soon';
            endpoint = '/movie/upcoming';
        } else if (type === 'collection') {
            pageTitle = 'Stoike Collection';
            endpoint = '/discover/movie?sort_by=vote_average.desc&vote_count.gte=1000';
        }
    }

    if (titleEl) titleEl.innerText = pageTitle;

    try {
        const data = await fetchTMDB(endpoint);
        if (data && data.results && data.results.length > 0) {
            const movies = data.results.map(m => mapTMDBMovie(m));
            gridEl.innerHTML = movies.map(movie => renderMovieCard(movie)).join('');
        } else {
            gridEl.innerHTML = `
                <div class="col-span-full text-center py-16 text-on-surface-variant">
                    <span class="material-symbols-outlined text-[48px] mb-2 block opacity-40">search_off</span>
                    Nessun film trovato per questa categoria o ricerca.
                </div>
            `;
        }
    } catch (e) {
        console.error('Error loading list:', e);
        gridEl.innerHTML = '<div class="col-span-full text-center text-red-400 py-12">Errore nel caricamento dei dati. Riprova più tardi.</div>';
    }
});
