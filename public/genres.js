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

            // Load genre movies
            gridEl.innerHTML = `<div class="col-span-full text-center py-12"><span class="opacity-50">${i18n.t('genres.loadingMovies')}</span></div>`;
            
            let endpoint = '/trending/movie/week';
            if (genreId) {
                endpoint = `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`;
            }

            if (sectionTitle) {
                sectionTitle.innerText = genreId ? `${i18n.t('genres.genreLabel')} ${genreName}` : i18n.t('genres.allGenres');
            }

            try {
                const data = await fetchTMDB(endpoint);
                if (data && data.results) {
                    const movies = data.results.map(m => mapTMDBMovie(m));
                    gridEl.innerHTML = movies.map(movie => renderMovieCard(movie)).join('');
                } else {
                    gridEl.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-12">${i18n.t('genres.noMovies')}</div>`;
                }
            } catch (e) {
                gridEl.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">${i18n.t('genres.error')}</div>`;
            }
        });
    });

    // Auto-click the first pill "All" to trigger initial population
    const allBtn = document.querySelector('.genre-btn[data-genre="All"]');
    if (allBtn) allBtn.click();
});
