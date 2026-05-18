// =========================================
// STOIKE — Actors/Cast Search & Filter Page
// =========================================

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for genres cache to be initialized from common.js
    let attempts = 0;
    while (Object.keys(tmdbGenres).length === 0 && attempts < 10) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    // Get DOM nodes
    const searchInput = document.getElementById('actor-search-input');
    const searchBtn = document.getElementById('actor-search-btn');
    const loadingEl = document.getElementById('actor-loading');
    const errorEl = document.getElementById('actor-error-message');
    const profileCard = document.getElementById('actor-profile-card');
    const actorPhoto = document.getElementById('actor-photo');
    const actorName = document.getElementById('actor-name');
    const actorBirthday = document.getElementById('actor-birthday');
    const actorBirthplace = document.getElementById('actor-birthplace');
    const actorBio = document.getElementById('actor-biography');
    const moviesSection = document.getElementById('actor-movies-section');
    const filmActorName = document.getElementById('filmography-actor-name');
    const moviesGrid = document.getElementById('movies-grid');
    const popularSection = document.getElementById('popular-actors-section');
    const popularGrid = document.getElementById('popular-actors-grid');

    // Execute the search pipeline
    async function executeActorSearch(query) {
        if (!query) return;

        // Reset UI states
        profileCard.classList.add('hidden');
        moviesSection.classList.add('hidden');
        errorEl.classList.add('hidden');
        loadingEl.classList.remove('hidden');
        if (popularSection) popularSection.classList.add('hidden');

        try {
            // Step 1: Search for person matching the query
            const searchData = await fetchTMDB(`/search/person?query=${encodeURIComponent(query)}`);
            
            if (!searchData || !searchData.results || searchData.results.length === 0) {
                loadingEl.classList.add('hidden');
                errorEl.classList.remove('hidden');
                return;
            }

            // Take the first match
            const bestMatch = searchData.results[0];
            await loadActorDetails(bestMatch.id);

        } catch (err) {
            console.error('Error searching actor:', err);
            loadingEl.classList.add('hidden');
            errorEl.classList.remove('hidden');
        }
    }

    // Load full details & movies for a person ID
    async function loadActorDetails(personId) {
        try {
            // Fetch person details and movie credits in parallel
            const [profile, credits] = await Promise.all([
                fetchTMDB(`/person/${personId}`),
                fetchTMDB(`/person/${personId}/movie_credits`)
            ]);

            loadingEl.classList.add('hidden');

            if (!profile || !profile.name) {
                errorEl.classList.remove('hidden');
                return;
            }

            // 1. Populate Biography Card details
            actorName.innerText = profile.name;
            filmActorName.innerText = profile.name;

            // Picture profile path with backup placeholder
            actorPhoto.src = profile.profile_path 
                ? `https://image.tmdb.org/t/p/w500${profile.profile_path}` 
                : 'https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Photo';
            actorPhoto.alt = profile.name;

            // Birthday and birthplace
            actorBirthday.innerText = profile.birthday 
                ? formatDate(profile.birthday) 
                : i18n.t('actors.noBirthday');
            actorBirthplace.innerText = profile.place_of_birth 
                ? profile.place_of_birth 
                : i18n.t('actors.noBirthplace');

            // Biography: try Wikipedia first in user's language, fallback to TMDb
            actorBio.innerText = i18n.t('actors.loadingBio');
            const wikiBio = await getWikipediaBiography(profile.name);
            if (wikiBio) {
                actorBio.innerText = wikiBio;
            } else if (profile.biography) {
                actorBio.innerText = profile.biography;
            } else {
                actorBio.innerText = i18n.t('actors.noBio');
            }

            profileCard.classList.replace('hidden', 'flex');

            // 2. Populate filmography grid
            if (credits && credits.cast && credits.cast.length > 0) {
                // Sort by popularity (descending) so their most famous movies appear first
                const sortedCast = credits.cast
                    .filter(m => m.poster_path) // only show movies with posters for premium layout
                    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

                if (sortedCast.length > 0) {
                    // Map to our unified data model and limit to top 24 movies
                    const mappedMovies = sortedCast.slice(0, 24).map(m => mapTMDBMovie(m));
                    moviesGrid.innerHTML = mappedMovies.map(movie => renderMovieCard(movie)).join('');
                    moviesSection.classList.remove('hidden');
                } else {
                    moviesGrid.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-8">${i18n.t('actors.noFilms')}</div>`;
                    moviesSection.classList.remove('hidden');
                }
            } else {
                moviesGrid.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-8">${i18n.t('actors.noFilms')}</div>`;
                moviesSection.classList.remove('hidden');
            }

        } catch (err) {
            console.error('Error fetching actor details:', err);
            errorEl.classList.remove('hidden');
        }
    }

    // Fetch biography from Wikipedia using selected language
    async function getWikipediaBiography(name) {
        const lang = (window.i18n && window.i18n.getWikiLang) ? window.i18n.getWikiLang() : 'it';
        
        // Try the user's selected language first
        let bio = await fetchWikipediaSummary(name, lang);
        if (bio) return bio;

        // If not found in the selected language, fallback to English (unless English was already tried)
        if (lang !== 'en') {
            bio = await fetchWikipediaSummary(name, 'en');
        }
        
        return bio;
    }

    async function fetchWikipediaSummary(name, lang) {
        try {
            // Step 1: Search for the page title
            const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&srlimit=1&utf8=1&format=json&origin=*`;
            const searchRes = await fetch(searchUrl);
            const searchData = await searchRes.json();

            if (!searchData.query || !searchData.query.search || searchData.query.search.length === 0) {
                return null;
            }

            const pageTitle = searchData.query.search[0].title;

            // Step 2: Get the page summary via REST API
            const summaryUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
            const summaryRes = await fetch(summaryUrl);
            if (!summaryRes.ok) return null;
            const summaryData = await summaryRes.json();

            // Use extract_html would give HTML, extract gives plain text
            if (summaryData.extract && summaryData.extract.length > 50) {
                return summaryData.extract;
            }
            return null;
        } catch (err) {
            console.warn(`Wikipedia (${lang}) fetch failed for "${name}":`, err);
            return null;
        }
    }

    // Format YYYY-MM-DD date into standard European Italian format
    function formatDate(rawDate) {
        if (!rawDate) return '';
        const parts = rawDate.split('-');
        if (parts.length !== 3) return rawDate;
        const months = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        const day = parseInt(parts[2], 10);
        const month = months[parseInt(parts[1], 10) - 1];
        const year = parts[0];
        return `${day} ${month} ${year}`;
    }

    // Set search event listeners
    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', () => {
            const query = searchInput.value.trim();
            executeActorSearch(query);
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value.trim();
                executeActorSearch(query);
            }
        });
    }

    // Auto trigger search if a query URL parameter exists (e.g. redirected from details page)
    const params = new URLSearchParams(window.location.search);
    const initialQuery = params.get('query');
    if (initialQuery) {
        const decodedQuery = decodeURIComponent(initialQuery);
        if (searchInput) searchInput.value = decodedQuery;
        executeActorSearch(decodedQuery);
    } else {
        // No query param: load popular/trending actors on page open
        await loadPopularActors();
    }

    // Render a single actor card for the popular grid
    function renderActorCard(person) {
        const photoUrl = person.profile_path
            ? `https://image.tmdb.org/t/p/w500${person.profile_path}`
            : 'https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Photo';
        const knownFor = person.known_for && person.known_for.length > 0
            ? person.known_for.map(k => k.title || k.name || '').filter(Boolean).slice(0, 2).join(', ')
            : person.known_for_department || '';
        return `
            <div class="movie-card group flex flex-col bg-surface-container/30 border border-outline-variant/10 rounded-2xl overflow-hidden hover:border-primary-container/30 hover:bg-surface-container/50 hover:shadow-2xl hover:shadow-primary-container/5 transition-all duration-500 cursor-pointer" onclick="document.getElementById('actor-search-input').value='${person.name.replace(/'/g, "\\'")}';
                document.getElementById('actor-search-btn').click();">
                <div class="relative aspect-[2/3] overflow-hidden">
                    <img src="${photoUrl}" alt="${person.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" loading="lazy" onerror="this.src='https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Photo'" />
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-4">
                        <span class="text-primary-container font-label-sm text-center">${i18n.t('actors.viewDetails')}</span>
                    </div>
                </div>
                <div class="p-5 flex flex-col gap-2 flex-grow">
                    <h3 class="font-title-md text-title-md text-white font-bold tracking-tight line-clamp-1 group-hover:text-primary-container transition-colors duration-300">${person.name}</h3>
                    <div class="flex items-center gap-2 text-on-surface-variant font-body-sm text-body-sm">
                        <span class="material-symbols-outlined text-[14px] text-primary-container">theater_comedy</span>
                        <span class="truncate max-w-[150px]">${knownFor}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // Fetch and display popular actors from TMDb
    async function loadPopularActors() {
        if (!popularGrid || !popularSection) return;
        try {
            const data = await fetchTMDB('/person/popular');
            if (data && data.results && data.results.length > 0) {
                const actors = data.results.filter(p => p.profile_path);
                popularGrid.innerHTML = actors.map(p => renderActorCard(p)).join('');
            } else {
                popularGrid.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-8">${i18n.t('actors.notFound')}</div>`;
            }
        } catch (err) {
            console.error('Error loading popular actors:', err);
            popularGrid.innerHTML = `<div class="col-span-full text-center text-on-surface-variant py-8">${i18n.t('genres.error')}</div>`;
        }
    }
});
