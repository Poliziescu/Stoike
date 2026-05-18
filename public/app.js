// =========================================
// STOIKE — Home Page Logic
// =========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for genres cache to be initialized from common.js
    let attempts = 0;
    while (Object.keys(tmdbGenres).length === 0 && attempts < 10) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    const gridEl = document.getElementById('movies-grid');
    if (!gridEl) return;

    try {
        // Load trending weekly movies from TMDb proxy
        const data = await fetchTMDB('/trending/movie/week');
        if (data && data.results && data.results.length > 0) {
            const movies = data.results.map(m => mapTMDBMovie(m));

            // Render Hero Banner using the first trending movie
            const heroMovie = movies[0];
            renderHero(heroMovie);

            // Render the rest in the main grid (trending grid)
            const gridMovies = movies.slice(1);
            gridEl.innerHTML = gridMovies.map(movie => renderMovieCard(movie)).join('');
        } else {
            gridEl.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-12">${i18n.t('home.noMovies')}</div>`;
        }
    } catch (e) {
        console.error('Error loading home content:', e);
        gridEl.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">${i18n.t('home.errorLoading')}</div>`;
    }
});

function renderHero(movie) {
    if (!movie) return;

    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return;

    const backdropEl = document.getElementById('hero-backdrop');
    const titleEl = document.getElementById('hero-title');
    const synopsisEl = document.getElementById('hero-synopsis');
    const watchBtn = document.getElementById('hero-watch-btn');

    if (backdropEl) backdropEl.src = movie.backdrop_url || movie.poster_url || '';
    if (titleEl) titleEl.innerText = movie.title || i18n.t('home.noTitle');
    if (synopsisEl) synopsisEl.innerText = movie.synopsis || i18n.t('home.noSynopsis');

    // Setup navigation handlers to movie.html detailing page
    const goToDetails = () => {
        window.location.href = `/movie.html?id=${movie.id}`;
    };

    if (watchBtn) {
        // Recreate button to strip old event handlers cleanly
        const newWatchBtn = watchBtn.cloneNode(true);
        watchBtn.parentNode.replaceChild(newWatchBtn, watchBtn);
        newWatchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            goToDetails();
        });
    }

    // Attach click to the whole hero banner card for maximum responsiveness
    const newHeroSection = heroSection.cloneNode(true);
    heroSection.parentNode.replaceChild(newHeroSection, heroSection);
    newHeroSection.addEventListener('click', goToDetails);
}
