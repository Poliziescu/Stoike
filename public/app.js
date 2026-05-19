// =========================================
// STOIKE — Home Page Logic
// =========================================

let heroMovies = [];
let currentHeroIdx = 0;
let heroTimeoutId = null;
let isHovered = false;
let startTime = 0;
let elapsedBeforePause = 0;
const carouselDuration = 6000; // 6 seconds
let remainingTime = carouselDuration;

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
        // 1. Fetch Now Playing movies for Hero Banner and Trending for grid in parallel
        const [nowPlayingData, trendingData] = await Promise.all([
            fetchTMDB('/movie/now_playing').catch(() => null),
            fetchTMDB('/trending/movie/week').catch(() => null)
        ]);

        // 2. Prepare Hero movies
        if (nowPlayingData && nowPlayingData.results && nowPlayingData.results.length > 0) {
            // Filter: must have release date, backdrop, and overview/synopsis
            const valid = nowPlayingData.results.filter(m => m.release_date && m.backdrop_path && m.overview);
            // Sort by release date descending (newest first)
            valid.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
            // Map and slice top 5
            heroMovies = valid.slice(0, 5).map(m => mapTMDBMovie(m));
        }

        // Prepare Trending movies for grid
        let trendingMovies = [];
        if (trendingData && trendingData.results && trendingData.results.length > 0) {
            trendingMovies = trendingData.results.map(m => mapTMDBMovie(m));
        }

        // Fallback for Hero if no now_playing movies could be loaded or filtered
        if (heroMovies.length === 0 && trendingMovies.length > 0 && trendingData && trendingData.results) {
            // Filter and sort weekly trending movies by release date descending
            const valid = trendingData.results.filter(m => m.release_date && m.backdrop_path);
            valid.sort((a, b) => new Date(b.release_date) - new Date(a.release_date));
            heroMovies = valid.slice(0, 5).map(m => mapTMDBMovie(m));
        }

        // 3. Render Hero Banner Carousel
        if (heroMovies.length > 0) {
            setupHeroEvents();
            renderHeroSlide(heroMovies[0]);
        } else {
            console.warn('No movies found for Hero Carousel');
        }

        // 4. Render Trending Grid
        if (trendingMovies.length > 0) {
            // Render the whole list of trending movies in the main grid
            gridEl.innerHTML = trendingMovies.map(movie => renderMovieCard(movie)).join('');
        } else {
            gridEl.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-12">${i18n.t('home.noMovies')}</div>`;
        }
    } catch (e) {
        console.error('Error loading home content:', e);
        gridEl.innerHTML = `<div class="col-span-full text-center text-red-400 py-12">${i18n.t('home.errorLoading')}</div>`;
    }
});

function setupHeroEvents() {
    const heroSection = document.getElementById('hero-section');
    if (!heroSection) return;

    // Navigate to movie details on card click
    heroSection.addEventListener('click', () => {
        const currentMovie = heroMovies[currentHeroIdx];
        if (currentMovie) {
            window.location.href = `/movie.html?id=${currentMovie.id}`;
        }
    });

    // Watch button click handler (stops propagation)
    const watchBtn = document.getElementById('hero-watch-btn');
    if (watchBtn) {
        watchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentMovie = heroMovies[currentHeroIdx];
            if (currentMovie) {
                window.location.href = `/movie.html?id=${currentMovie.id}`;
            }
        });
    }

    // Add to list button click handler (stops propagation)
    const addBtn = heroSection.querySelector('button:not(#hero-watch-btn)');
    if (addBtn) {
        addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Optional: placeholder watchlist feedback
        });
    }

    // Prev / Next button manual skip handlers (stops propagation)
    const prevBtn = document.getElementById('hero-prev-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            prevMovie();
        });
    }

    const nextBtn = document.getElementById('hero-next-btn');
    if (nextBtn) {
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            nextMovie();
        });
    }

    // Trailer button click handler (stops propagation and triggers trailer modal)
    const trailerBtn = document.getElementById('hero-trailer-btn');
    if (trailerBtn) {
        trailerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentMovie = heroMovies[currentHeroIdx];
            if (currentMovie) {
                openTrailerModal(currentMovie);
            }
        });
    }

    // Hover mouseenter/mouseleave logic
    heroSection.addEventListener('mouseenter', () => {
        if (heroMovies.length <= 1) return;
        isHovered = true;
        clearTimeout(heroTimeoutId);

        const progressBar = document.getElementById('hero-progress-bar');
        if (progressBar) {
            const computedWidth = window.getComputedStyle(progressBar).width;
            progressBar.style.transition = 'none';
            progressBar.style.width = computedWidth;
        }

        const now = Date.now();
        elapsedBeforePause += (now - startTime);
        remainingTime = Math.max(0, carouselDuration - elapsedBeforePause);
    });

    heroSection.addEventListener('mouseleave', () => {
        if (heroMovies.length <= 1) return;
        isHovered = false;
        resumeHeroCarousel();
    });
}

async function openTrailerModal(movie) {
    if (!movie) return;

    try {
        // Pause carousel and progress bar
        clearTimeout(heroTimeoutId);
        // Save current hover state so we don't automatically cycle
        const wasHoveredBeforeTrailer = isHovered;
        isHovered = true; // freeze timer

        const progressBar = document.getElementById('hero-progress-bar');
        if (progressBar) {
            const computedWidth = window.getComputedStyle(progressBar).width;
            progressBar.style.transition = 'none';
            progressBar.style.width = computedWidth;
        }

        const now = Date.now();
        elapsedBeforePause += (now - startTime);
        remainingTime = Math.max(0, carouselDuration - elapsedBeforePause);

        // Fetch trailers
        const videos = await fetchTMDB(`/movie/${movie.id}/videos`).catch(() => null);
        const trailer = videos && videos.results ? videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube') : null;

        if (!trailer || !trailer.key) {
            alert((window.i18n && window.i18n.t) ? window.i18n.t('movie.errorAlert') : 'Impossibile caricare il trailer.');
            // Resume carousel
            isHovered = wasHoveredBeforeTrailer;
            if (!isHovered) {
                resumeHeroCarousel();
            }
            return;
        }

        // Inject dynamic backdrop overlay
        let backdrop = document.querySelector('.movie-card-backdrop');
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'movie-card-backdrop';
            document.body.appendChild(backdrop);
        }

        // Inject dynamic trailer modal
        let modal = document.querySelector('.movie-trailer-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'movie-trailer-modal';
            document.body.appendChild(modal);
        }

        // Render YouTube iframe inside modal styled exactly like the rest
        modal.innerHTML = `
            <iframe class="w-full h-full" src="https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=0&controls=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        `;

        // Close modal and resume carousel
        const closeTrailer = () => {
            backdrop.classList.remove('active');
            modal.classList.remove('active');
            setTimeout(() => {
                modal.innerHTML = '';
                backdrop.remove();
                modal.remove();
            }, 800);

            // Resume carousel
            isHovered = wasHoveredBeforeTrailer;
            if (!isHovered) {
                resumeHeroCarousel();
            }
        };

        // Click on backdrop is the ONLY way to exit the playing trailer modal
        backdrop.onclick = closeTrailer;

        // Force reflow and activate transitions
        void backdrop.offsetWidth;
        void modal.offsetWidth;

        backdrop.classList.add('active');
        modal.classList.add('active');
    } catch (e) {
        console.error('Error playing trailer:', e);
    }
}

function resumeHeroCarousel() {
    const progressBar = document.getElementById('hero-progress-bar');
    if (progressBar) {
        // Force reflow
        void progressBar.offsetWidth;
        progressBar.style.transition = `width ${remainingTime}ms linear`;
        progressBar.style.width = '100%';
    }

    startTime = Date.now();
    clearTimeout(heroTimeoutId);
    heroTimeoutId = setTimeout(() => {
        nextMovie();
    }, remainingTime);
}

function prevMovie() {
    currentHeroIdx = (currentHeroIdx - 1 + heroMovies.length) % heroMovies.length;
    elapsedBeforePause = 0;
    remainingTime = carouselDuration;
    renderHeroSlide(heroMovies[currentHeroIdx]);
}

function nextMovie() {
    currentHeroIdx = (currentHeroIdx + 1) % heroMovies.length;
    elapsedBeforePause = 0;
    remainingTime = carouselDuration;
    renderHeroSlide(heroMovies[currentHeroIdx]);
}

function renderHeroSlide(movie) {
    if (!movie) return;

    const backdropEl = document.getElementById('hero-backdrop');
    const contentWrapperEl = document.getElementById('hero-content-wrapper');
    const titleEl = document.getElementById('hero-title');
    const synopsisEl = document.getElementById('hero-synopsis');
    const progressBar = document.getElementById('hero-progress-bar');

    // 1. Start elegant fade-out
    if (backdropEl) backdropEl.classList.add('opacity-0');
    if (contentWrapperEl) contentWrapperEl.classList.add('opacity-0');

    // Wait for the fade-out to complete (300ms is the sweet spot of the 500ms transition)
    setTimeout(() => {
        // 2. Update content
        if (backdropEl) backdropEl.src = movie.backdrop_url || movie.poster_url || '';
        if (titleEl) titleEl.innerText = movie.title || i18n.t('home.noTitle');
        if (synopsisEl) synopsisEl.innerText = movie.synopsis || i18n.t('home.noSynopsis');

        // 3. Start elegant fade-in
        if (backdropEl) backdropEl.classList.remove('opacity-0');
        if (contentWrapperEl) contentWrapperEl.classList.remove('opacity-0');

        // 4. Reset and start progress bar animation
        if (progressBar) {
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
            // Force browser layout calculation (reflow)
            void progressBar.offsetWidth;

            if (!isHovered) {
                startTime = Date.now();
                progressBar.style.transition = `width ${remainingTime}ms linear`;
                progressBar.style.width = '100%';

                clearTimeout(heroTimeoutId);
                heroTimeoutId = setTimeout(() => {
                    nextMovie();
                }, remainingTime);
            } else {
                progressBar.style.width = '0%';
            }
        }
    }, 300);
}
