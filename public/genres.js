// =========================================
// STOIKE — Genre Pills & Browsing logic
// =========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for genres cache to be initialized from common.js
    let attempts = 0;
    while (Object.keys(tmdbGenres).length === 0 && attempts < 10) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    const container = document.getElementById('genres-container');
    const gridEl = document.getElementById('movies-grid');
    const sectionTitle = document.getElementById('section-title');

    if (!container || !gridEl) return;

    // Renders genre pills
    const genreEntries = Object.entries(tmdbGenres).sort((a, b) => a[1].localeCompare(b[1]));
    
    let gHTML = `
        <button class="genre-btn px-6 py-3 bg-primary-container text-black font-label-md text-label-md rounded-full shadow-lg transition-all duration-300 transform scale-105" data-genre="All" data-genre-id="">
            All
        </button>
    `;
    
    gHTML += genreEntries.map(([id, name]) => `
        <button class="genre-btn px-6 py-3 bg-surface-container border border-outline-variant/20 font-label-md text-label-md rounded-full hover:bg-surface-container-high hover:border-primary-container/50 text-on-surface-variant hover:text-white transition-all duration-300" data-genre="${name}" data-genre-id="${id}">
            ${name}
        </button>
    `).join('');

    container.innerHTML = gHTML;

    const renderedMovieIds = new Set();
    let currentGenreId = '';
    let currentGenreName = 'All';
    let currentPage = 1;
    let totalPages = 1;

    const loadMoreBtn = document.getElementById('load-more-btn');
    const loadMoreSpinner = document.getElementById('load-more-spinner');

    function getPagedEndpoint(genreId, page) {
        if (genreId) {
            return `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc&page=${page}`;
        } else {
            return `/trending/movie/week?page=${page}`;
        }
    }

    async function loadPage(page) {
        const pagedEndpoint = getPagedEndpoint(currentGenreId, page);
        const data = await fetchTMDB(pagedEndpoint);
        if (data) {
            totalPages = data.total_pages || 1;
            return data.results 
                ? data.results
                    .map(m => mapTMDBMovie(m))
                    .filter(movie => {
                        if (renderedMovieIds.has(movie.id)) return false;
                        renderedMovieIds.add(movie.id);
                        return true;
                    })
                : [];
        }
        return [];
    }

    async function selectGenre(genreId, genreName) {
        currentGenreId = genreId;
        currentGenreName = genreName;
        currentPage = 1;
        renderedMovieIds.clear();

        if (sectionTitle) {
            sectionTitle.innerText = genreId ? `${i18n.t('genres.genreLabel')} ${genreName}` : i18n.t('genres.allGenres');
        }

        gridEl.innerHTML = `<div class="col-span-full text-center py-12"><span class="opacity-50">${i18n.t('genres.loadingMovies')}</span></div>`;
        if (loadMoreBtn) loadMoreBtn.classList.add('hidden');

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
                gridEl.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-12">${i18n.t('genres.noMovies')}</div>`;
                if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
            }
        } catch (e) {
            console.error('Error loading movies:', e);
            gridEl.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">${i18n.t('genres.error')}</div>`;
            if (loadMoreBtn) loadMoreBtn.classList.add('hidden');
        }
    }

    // Attach click listeners to pills
    const buttons = document.querySelectorAll('.genre-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const genreName = btn.getAttribute('data-genre');
            const genreId = btn.getAttribute('data-genre-id');

            // Toggle active styling states
            buttons.forEach(b => {
                b.className = "genre-btn px-6 py-3 bg-surface-container border border-outline-variant/20 font-label-md text-label-md rounded-full hover:bg-surface-container-high hover:border-primary-container/50 text-on-surface-variant hover:text-white transition-all duration-300";
            });
            btn.className = "genre-btn px-6 py-3 bg-primary-container text-black font-label-md text-label-md rounded-full shadow-lg transition-all duration-300 transform scale-105";

            await selectGenre(genreId, genreName);
        });
    });

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

    // Auto-click the first pill "All" to trigger initial population
    const allBtn = document.querySelector('.genre-btn[data-genre="All"]');
    if (allBtn) allBtn.click();
});
