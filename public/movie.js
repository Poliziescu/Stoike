// =========================================
// STOIKE — Movie Details page & Reviews CRUD
// =========================================

let currentMovieId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Wait for genres cache to be initialized from common.js
    let attempts = 0;
    while (Object.keys(tmdbGenres).length === 0 && attempts < 10) {
        await new Promise(r => setTimeout(r, 200));
        attempts++;
    }

    const params = new URLSearchParams(window.location.search);
    const movieId = parseInt(params.get('id'));

    if (!movieId || isNaN(movieId)) {
        window.location.href = '/index.html';
        return;
    }

    currentMovieId = movieId;
    await loadMovieDetails(movieId);



    // Setup custom delete modal event handlers
    const deleteClose = document.getElementById('delete-close');
    const deleteCancel = document.getElementById('delete-cancel-btn');
    const deleteBackdrop = document.getElementById('delete-backdrop');
    if (deleteClose) deleteClose.addEventListener('click', closeDeleteModal);
    if (deleteCancel) deleteCancel.addEventListener('click', closeDeleteModal);
    if (deleteBackdrop) deleteBackdrop.addEventListener('click', closeDeleteModal);

    const deleteConfirm = document.getElementById('delete-confirm-btn');
    if (deleteConfirm) {
        deleteConfirm.addEventListener('click', executeDeleteReview);
    }
});

async function loadMovieDetails(movieId) {
    try {
        // Fetch primary TMDb movie details
        const movie = await fetchTMDB(`/movie/${movieId}`);
        if (!movie || !movie.id) {
            throw new Error('Film non trovato in TMDB');
        }

        // Map and render basic fields
        const mappedMovie = {
            id: movie.id,
            title: movie.title,
            genre: movie.genres ? movie.genres.map(g => g.name).join(', ') : '',
            rating: movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A',
            release_year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
            poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://via.placeholder.com/500x750/131313/FFFFFF?text=No+Cover',
            backdrop_url: movie.backdrop_path ? `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}` : 'https://via.placeholder.com/1280x720/131313/FFFFFF?text=No+Backdrop',
            synopsis: movie.overview || ''
        };

        document.getElementById('detail-poster').src = mappedMovie.poster_url;
        document.getElementById('detail-poster').alt = mappedMovie.title;
        document.getElementById('detail-title').innerText = mappedMovie.title;
        
        const subTitleEl = document.getElementById('sub-header-movie-title');
        if (subTitleEl) subTitleEl.innerText = mappedMovie.title;

        document.getElementById('detail-genre').innerText = mappedMovie.genre;
        document.getElementById('detail-year').innerText = mappedMovie.release_year;
        document.getElementById('detail-rating').innerText = mappedMovie.rating;

        // Synopsis
        const synopsisContainer = document.getElementById('detail-synopsis-container');
        const synopsisEl = document.getElementById('detail-synopsis');
        if (mappedMovie.synopsis) {
            synopsisEl.innerText = mappedMovie.synopsis;
            synopsisContainer.classList.remove('hidden');
        } else {
            synopsisContainer.classList.add('hidden');
        }

        // Parallel requests for credits, videos, and similar
        const [credits, videos, similar] = await Promise.all([
            fetchTMDB(`/movie/${movieId}/credits`),
            fetchTMDB(`/movie/${movieId}/videos`),
            fetchTMDB(`/movie/${movieId}/similar`)
        ]);

        // 1. Cast
        const castContainer = document.getElementById('detail-cast-container');
        const castEl = document.getElementById('detail-cast');
        if (credits && credits.cast && credits.cast.length > 0) {
            castEl.innerText = credits.cast.slice(0, 8).map(c => c.name).join(', ');
            castContainer.classList.remove('hidden');
        } else {
            castContainer.classList.add('hidden');
        }

        // 2. Franchise (Prequel / Sequel)
        const relatedContainer = document.getElementById('detail-related-container');
        const relatedEl = document.getElementById('detail-related');
        if (movie.belongs_to_collection) {
            try {
                const collection = await fetchTMDB(`/collection/${movie.belongs_to_collection.id}`);
                if (collection && collection.parts && collection.parts.length > 1) {
                    // Filter out the current movie
                    const parts = collection.parts.filter(p => p.id !== movieId);
                    if (parts.length > 0) {
                        relatedEl.innerHTML = '';
                        parts.forEach(p => {
                            const btn = document.createElement('button');
                            btn.className = 'px-3.5 py-2 bg-white/5 hover:bg-primary-container hover:text-black rounded-full border border-white/10 text-on-surface-variant font-label-md transition-all duration-300 transform hover:scale-105 shadow-sm text-sm font-medium';
                            btn.innerText = p.title;
                            btn.addEventListener('click', () => {
                                window.location.href = `/movie.html?id=${p.id}`;
                            });
                            relatedEl.appendChild(btn);
                        });
                        relatedContainer.classList.remove('hidden');
                    } else {
                        relatedContainer.classList.add('hidden');
                    }
                } else {
                    relatedContainer.classList.add('hidden');
                }
            } catch (collErr) {
                console.error('Error fetching collection info:', collErr);
                relatedContainer.classList.add('hidden');
            }
        } else {
            relatedContainer.classList.add('hidden');
        }

        // 3. Similar
        const similarContainer = document.getElementById('detail-similar-container');
        const similarEl = document.getElementById('detail-similar');
        if (similar && similar.results && similar.results.length > 0) {
            similarEl.innerHTML = '';
            similar.results.slice(0, 5).forEach(s => {
                const btn = document.createElement('button');
                btn.className = 'px-3.5 py-2 bg-white/5 hover:bg-primary-container hover:text-black rounded-full border border-white/10 text-on-surface-variant font-label-md transition-all duration-300 transform hover:scale-105 shadow-sm text-sm font-medium';
                btn.innerText = s.title;
                btn.addEventListener('click', () => {
                    window.location.href = `/movie.html?id=${s.id}`;
                });
                similarEl.appendChild(btn);
            });
            similarContainer.classList.remove('hidden');
        } else {
            similarContainer.classList.add('hidden');
        }

        // 4. Trailer Video
        const trailerContainer = document.getElementById('detail-trailer-container');
        let trailerIframe = document.getElementById('detail-trailer');
        
        // Reset src via node clone to ensure previous video playback stops completely
        const newIframe = trailerIframe.cloneNode();
        newIframe.removeAttribute('src');
        trailerIframe.parentNode.replaceChild(newIframe, trailerIframe);
        trailerIframe = newIframe;
        trailerContainer.classList.add('hidden');

        let trailerKey = null;
        if (videos && videos.results) {
            const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            if (trailer) trailerKey = trailer.key;
        }

        if (trailerKey) {
            trailerIframe.src = `https://www.youtube.com/embed/${trailerKey}?autoplay=0`;
            trailerContainer.classList.remove('hidden');
        }

        // 5. Load and Render Reviews
        await loadReviews(movieId);

    } catch (e) {
        console.error('Error loading movie details:', e);
        document.getElementById('detail-title').innerText = 'Errore di caricamento';
        alert('Impossibile caricare i dettagli di questo film.');
    }
}

async function loadReviews(movieId) {
    const reviewContainer = document.getElementById('detail-review-container');
    const reviewEl = document.getElementById('detail-review');
    const addReviewSection = document.getElementById('add-review-section');

    reviewEl.innerHTML = '<span class="opacity-50">Caricamento recensioni...</span>';
    reviewContainer.classList.remove('hidden');

    const currentUser = localStorage.getItem('stoike_user');
    const currentRole = localStorage.getItem('stoike_role');
    const isAdmin = currentUser && currentRole === 'admin';

    // Toggle add review section visibility
    if (isAdmin) {
        addReviewSection.classList.remove('hidden');
        addReviewSection.dataset.movieId = movieId;
    } else {
        addReviewSection.classList.add('hidden');
    }

    try {
        const resp = await fetch(`/api/reviews/${movieId}`);
        const reviews = await resp.json();
        
        if (Array.isArray(reviews) && reviews.length > 0) {
            reviewEl.innerHTML = reviews.map(rev => renderReviewCard(rev, isAdmin)).join('');
        } else {
            reviewEl.innerHTML = '<p class="font-body-md text-on-surface-variant italic">Nessuna recensione presente per questo film su Stoike.</p>';
        }
    } catch (err) {
        console.error('Error fetching reviews:', err);
        reviewEl.innerHTML = '<p class="font-body-md text-on-surface-variant italic">Errore nel caricamento delle recensioni.</p>';
    }
}

function renderReviewCard(rev, isAdmin) {
    // top-4 right-4 is Edit button; top-4 right-14 is Delete button (🗑️)
    return `
        <div id="review-card-${rev.id}" class="mb-4 p-4 glass-panel border border-white/10 rounded-lg relative">
            ${isAdmin ? `
                <div class="absolute top-4 right-4 flex items-center gap-2">
                    <button onclick="startEditReview('${rev.id}')" class="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-on-surface-variant hover:text-white" title="Modifica Recensione">
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button onclick="deleteReview('${rev.id}')" class="p-2 bg-white/5 hover:bg-red-500/20 rounded-full transition-colors text-red-400 hover:text-red-300" title="Elimina Recensione">
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                </div>
            ` : ''}
            <div class="flex items-center gap-2 mb-2 pr-24">
                <span class="material-symbols-outlined text-primary-container text-[18px]">person</span>
                <span class="font-label-md text-white font-bold">${rev.author || 'Utente'}</span>
                <span class="ml-auto text-primary-container font-label-sm flex items-center gap-1" id="display-rating-${rev.id}">
                    <span class="material-symbols-outlined text-[14px] material-fill-1">star</span>
                    <span>${rev.rating}/10</span>
                </span>
            </div>
            <p id="display-text-${rev.id}" class="font-body-md text-on-surface-variant">${rev.review_text}</p>
            
            <div id="edit-form-${rev.id}" class="hidden flex-col gap-3 mt-4 border-t border-outline-variant/20 pt-4">
                <div>
                    <label class="block font-label-sm text-on-surface-variant mb-1">Voto (0-10)</label>
                    <input type="number" id="edit-rating-${rev.id}" value="${rev.rating}" min="0" max="10" step="0.1" class="w-24 bg-black/50 border border-outline-variant/30 rounded px-2 py-1 text-white focus:border-primary-container focus:ring-0 outline-none transition-colors">
                </div>
                <div>
                    <label class="block font-label-sm text-on-surface-variant mb-1">Testo Recensione</label>
                    <textarea id="edit-text-${rev.id}" class="w-full h-24 bg-black/50 border border-outline-variant/30 rounded px-3 py-2 text-white focus:border-primary-container focus:ring-0 outline-none transition-colors">${rev.review_text}</textarea>
                </div>
                <div class="flex gap-2">
                    <button onclick="saveEditReview('${rev.id}')" class="px-4 py-2 bg-primary-container text-black font-label-sm rounded hover:bg-primary transition-colors flex items-center gap-1">
                        <span class="material-symbols-outlined text-[16px]">save</span> Salva
                    </button>
                    <button onclick="cancelEditReview('${rev.id}')" class="px-4 py-2 border border-outline-variant/30 text-white font-label-sm rounded hover:bg-white/10 transition-colors">Annulla</button>
                </div>
            </div>
        </div>
    `;
}

// Edit Form Toggle Controllers
function startEditReview(id) {
    document.getElementById(`edit-form-${id}`).classList.replace('hidden', 'flex');
    document.getElementById(`display-text-${id}`).classList.add('hidden');
}

function cancelEditReview(id) {
    document.getElementById(`edit-form-${id}`).classList.replace('flex', 'hidden');
    document.getElementById(`display-text-${id}`).classList.remove('hidden');
}

// Update Review Function
async function saveEditReview(id) {
    const user = localStorage.getItem('stoike_user');
    if (!user) return alert('Devi essere loggato.');

    const newText = document.getElementById(`edit-text-${id}`).value.trim();
    const newRating = document.getElementById(`edit-rating-${id}`).value;

    if (!newText || !newRating) return alert('Compila tutti i campi.');

    try {
        const resp = await fetch(`/api/reviews/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user,
                review_text: newText,
                rating: parseFloat(newRating)
            })
        });
        const data = await resp.json();
        if (!data.success) throw new Error(data.message);

        document.getElementById(`display-text-${id}`).innerText = newText;
        document.getElementById(`display-rating-${id}`).innerHTML = `
            <span class="material-symbols-outlined text-[14px] material-fill-1">star</span>
            <span>${parseFloat(newRating).toFixed(1)}/10</span>
        `;
        cancelEditReview(id);
    } catch (e) {
        alert('Errore: ' + (e.message || 'Impossibile aggiornare.'));
    }
}

let reviewIdToDelete = null;

function openDeleteModal(reviewId) {
    reviewIdToDelete = reviewId;
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDeleteModal() {
    reviewIdToDelete = null;
    const modal = document.getElementById('delete-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Delete Review Function (For Admins) - Opens Custom Modal
async function deleteReview(id) {
    openDeleteModal(id);
}

// Actual implementation of Delete review called from custom modal
async function executeDeleteReview() {
    if (!reviewIdToDelete) return;
    const id = reviewIdToDelete;

    const user = localStorage.getItem('stoike_user');
    if (!user) {
        closeDeleteModal();
        return alert('Devi essere loggato.');
    }

    try {
        const resp = await fetch(`/api/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user })
        });
        
        const data = await resp.json();
        if (!data.success) throw new Error(data.message);
        
        closeDeleteModal();
        alert('Recensione eliminata con successo!');
        // Reload all reviews for the current movie
        await loadReviews(currentMovieId);
    } catch (err) {
        closeDeleteModal();
        alert('Errore: ' + (err.message || 'Impossibile eliminare la recensione.'));
    }
}

// Add Review Function (For Admins)
async function addReview() {
    const user = localStorage.getItem('stoike_user');
    const sec = document.getElementById('add-review-section');
    const movieId = sec ? parseInt(sec.dataset.movieId) : null;
    const author = document.getElementById('new-review-author').value.trim();
    const rating = document.getElementById('new-review-rating').value;
    const text = document.getElementById('new-review-text').value.trim();
    const errorEl = document.getElementById('new-review-error');

    errorEl.classList.add('hidden');

    if (!author || !rating || !text) {
        errorEl.innerText = 'Compila tutti i campi.';
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        const resp = await fetch('/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user,
                tmdb_movie_id: movieId,
                author: author,
                review_text: text,
                rating: parseFloat(rating)
            })
        });

        const data = await resp.json();
        if (!data.success) throw new Error(data.message);

        // Reset fields
        document.getElementById('new-review-author').value = '';
        document.getElementById('new-review-rating').value = '';
        document.getElementById('new-review-text').value = '';

        // Reload reviews
        await loadReviews(movieId);
    } catch (e) {
        errorEl.innerText = 'Errore: ' + (e.message || 'Impossibile salvare.');
        errorEl.classList.remove('hidden');
    }
}
