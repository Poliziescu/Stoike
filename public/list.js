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
            return data.results ? data.results.map(m => mapTMDBMovie(m)) : [];
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
