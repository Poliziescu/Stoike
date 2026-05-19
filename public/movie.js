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

    // Sub-header scroll visibility: show back arrow + mini title only when main title is out of view
    const mainContent = document.getElementById('main-content');
    const subHeader = document.getElementById('sub-header');
    const detailTitle = document.getElementById('detail-title');

    if (mainContent && subHeader && detailTitle) {
        mainContent.addEventListener('scroll', () => {
            const titleRect = detailTitle.getBoundingClientRect();
            // 80px = height of the top navbar
            const titleHidden = titleRect.bottom < 80;

            if (titleHidden) {
                subHeader.classList.remove('opacity-0', '-translate-y-4', 'pointer-events-none');
                subHeader.classList.add('opacity-100', 'translate-y-0', 'pointer-events-auto');
            } else {
                subHeader.classList.add('opacity-0', '-translate-y-4', 'pointer-events-none');
                subHeader.classList.remove('opacity-100', 'translate-y-0', 'pointer-events-auto');
            }
        });
    }

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

    // Setup custom delete forum post modal event handlers
    const deleteForumClose = document.getElementById('delete-forum-close');
    const deleteForumCancel = document.getElementById('delete-forum-cancel-btn');
    const deleteForumBackdrop = document.getElementById('delete-forum-backdrop');
    if (deleteForumClose) deleteForumClose.addEventListener('click', closeDeleteForumModal);
    if (deleteForumCancel) deleteForumCancel.addEventListener('click', closeDeleteForumModal);
    if (deleteForumBackdrop) deleteForumBackdrop.addEventListener('click', closeDeleteForumModal);

    const deleteForumConfirm = document.getElementById('delete-forum-confirm-btn');
    if (deleteForumConfirm) {
        deleteForumConfirm.addEventListener('click', executeDeleteForumPost);
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
            castEl.innerHTML = '';
            const sliceLimit = Math.min(credits.cast.length, 8);
            credits.cast.slice(0, sliceLimit).forEach((c, idx) => {
                const span = document.createElement('span');
                span.className = 'text-primary-container hover:underline cursor-pointer transition-all duration-200 font-medium';
                span.innerText = c.name;
                span.addEventListener('click', () => {
                    window.location.href = `/actors.html?query=${encodeURIComponent(c.name)}`;
                });
                castEl.appendChild(span);
                
                if (idx < sliceLimit - 1) {
                    castEl.appendChild(document.createTextNode(', '));
                }
            });
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
                if (collection && collection.parts && collection.parts.length > 0) {
                    // Ensure the current movie is present in the collection parts with correct release date
                    let currentMovieInCollection = collection.parts.find(p => p.id === movieId);
                    if (!currentMovieInCollection) {
                        currentMovieInCollection = { id: movieId, title: movie.title, release_date: movie.release_date };
                        collection.parts.push(currentMovieInCollection);
                    }

                    // Sort parts by release date (movies with missing release date are filtered out)
                    const sortedParts = collection.parts
                        .filter(p => p.release_date)
                        .sort((a, b) => new Date(a.release_date) - new Date(b.release_date));

                    const currentIndex = sortedParts.findIndex(p => p.id === movieId);
                    
                    let prequel = null;
                    let sequel = null;

                    if (currentIndex !== -1) {
                        if (currentIndex > 0) {
                            prequel = sortedParts[currentIndex - 1];
                        }
                        if (currentIndex < sortedParts.length - 1) {
                            sequel = sortedParts[currentIndex + 1];
                        }
                    }

                    if (prequel || sequel) {
                        relatedEl.innerHTML = '';
                        
                        // Set labels dynamically with i18n
                        const prequelLabelText = window.i18n ? i18n.t('movie.prequelLabel') : 'Prequel';
                        const sequelLabelText = window.i18n ? i18n.t('movie.sequelLabel') : 'Sequel';

                        if (prequel) {
                            const btn = document.createElement('button');
                            btn.className = 'px-3.5 py-2 bg-white/5 hover:bg-primary-container hover:text-black rounded-full border border-white/10 text-on-surface-variant font-label-md transition-all duration-300 transform hover:scale-105 shadow-sm text-sm font-medium flex items-center gap-1.5 group';
                            btn.innerHTML = `<span class="material-symbols-outlined text-[18px] group-hover:-translate-x-0.5 transition-transform">arrow_back</span> <strong class="text-primary-container group-hover:text-black font-bold mr-1">${prequelLabelText}:</strong> ${prequel.title}`;
                            btn.addEventListener('click', () => {
                                window.location.href = `/movie.html?id=${prequel.id}`;
                            });
                            relatedEl.appendChild(btn);
                        }

                        if (sequel) {
                            const btn = document.createElement('button');
                            btn.className = 'px-3.5 py-2 bg-white/5 hover:bg-primary-container hover:text-black rounded-full border border-white/10 text-on-surface-variant font-label-md transition-all duration-300 transform hover:scale-105 shadow-sm text-sm font-medium flex items-center gap-1.5 group';
                            btn.innerHTML = `<strong class="text-primary-container group-hover:text-black font-bold mr-1">${sequelLabelText}:</strong> ${sequel.title} <span class="material-symbols-outlined text-[18px] group-hover:translate-x-0.5 transition-transform">arrow_forward</span>`;
                            btn.addEventListener('click', () => {
                                window.location.href = `/movie.html?id=${sequel.id}`;
                            });
                            relatedEl.appendChild(btn);
                        }

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
        await loadForum(movieId);

    } catch (e) {
        console.error('Error loading movie details:', e);
        document.getElementById('detail-title').innerText = i18n.t('movie.errorLoading');
        alert('Impossibile caricare i dettagli di questo film.');
    }
}

async function loadReviews(movieId) {
    const reviewContainer = document.getElementById('detail-review-container');
    const reviewEl = document.getElementById('detail-review');
    const addReviewSection = document.getElementById('add-review-section');

    reviewEl.innerHTML = `<span class="opacity-50">${i18n.t('reviews.loading')}</span>`;
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
            reviewEl.innerHTML = `<p class="font-body-md text-on-surface-variant italic">${i18n.t('reviews.none')}</p>`;
        }
    } catch (err) {
        console.error('Error fetching reviews:', err);
        reviewEl.innerHTML = `<p class="font-body-md text-on-surface-variant italic">${i18n.t('reviews.errorLoading')}</p>`;
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
                <span class="font-label-md text-white font-bold">${rev.author || i18n.t('reviews.user')}</span>
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
    if (!user) return alert(i18n.t('reviews.mustLogin'));

    const newText = document.getElementById(`edit-text-${id}`).value.trim();
    const newRating = document.getElementById(`edit-rating-${id}`).value;

    if (!newText || !newRating) return alert(i18n.t('reviews.fillAll'));

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
        return alert(i18n.t('reviews.mustLogin'));
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
        errorEl.innerText = i18n.t('reviews.fillAll');
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

// =========================================
// MINI FORUM & DISCUSSION SYSTEM
// =========================================

let replyToPostId = null;
let activeForumUsers = [];

async function loadForum(movieId) {
    const forumPostsEl = document.getElementById('forum-posts');
    const notLoggedEl = document.getElementById('forum-not-logged');
    const writeFormEl = document.getElementById('forum-write-form');
    
    if (!forumPostsEl) return;

    forumPostsEl.innerHTML = `<span class="opacity-50 font-body-md text-on-surface-variant italic">Caricamento messaggi del forum...</span>`;

    const currentUser = localStorage.getItem('stoike_user');
    const currentRole = localStorage.getItem('stoike_role');
    const isAdmin = currentUser && currentRole === 'admin';

    // Show write form or login prompt
    if (currentUser) {
        if (notLoggedEl) notLoggedEl.classList.add('hidden');
        if (writeFormEl) writeFormEl.classList.remove('hidden');
        // Reset reply state
        cancelForumReply();
    } else {
        if (notLoggedEl) notLoggedEl.classList.remove('hidden');
        if (writeFormEl) writeFormEl.classList.add('hidden');
    }

    try {
        const resp = await fetch(`/api/forum/${movieId}`);
        const posts = await resp.json();
        
        if (Array.isArray(posts) && posts.length > 0) {
            // Build list of active users for mentions
            activeForumUsers = [...new Set(posts.map(p => p.username))];
            
            // Threaded structure grouping
            const rootPosts = posts.filter(p => !p.parent_id);
            const replies = posts.filter(p => p.parent_id);

            let html = '';
            rootPosts.forEach(root => {
                html += renderForumPostCard(root, false, currentUser, isAdmin);
                
                // Get direct replies to this post
                const directReplies = replies.filter(r => r.parent_id === root.id);
                if (directReplies.length > 0) {
                    html += `<div class="ml-6 md:ml-12 pl-4 border-l-2 border-primary-container/20 flex flex-col gap-3 mt-2 mb-4">`;
                    directReplies.forEach(reply => {
                        html += renderForumPostCard(reply, true, currentUser, isAdmin);
                    });
                    html += `</div>`;
                }
            });
            forumPostsEl.innerHTML = html;
        } else {
            activeForumUsers = [];
            forumPostsEl.innerHTML = `<p class="font-body-md text-on-surface-variant italic">Nessun commento presente nel forum. Sii il primo a iniziare il dibattito!</p>`;
        }

        // Initialize autocomplete listeners
        initMentionAutocomplete();

    } catch (err) {
        console.error('Error fetching forum posts:', err);
        forumPostsEl.innerHTML = `<p class="font-body-md text-on-surface-variant italic text-red-400">Impossibile caricare i messaggi del forum.</p>`;
    }
}

function renderForumPostCard(post, isReply = false, currentUser, isAdmin) {
    const isOwner = currentUser && currentUser === post.username;
    const canDelete = isAdmin || isOwner;
    const formattedDate = new Date(post.created_at).toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Parse @mentions
    const parsedContent = post.content.replace(
        /@(\w+)/g,
        `<span class="bg-primary-container/15 text-primary-container px-1.5 py-0.5 rounded font-bold">@$1</span>`
    );

    return `
        <div id="forum-post-${post.id}" class="p-4 glass-panel border border-white/5 rounded-xl flex flex-col gap-2 relative transition-all duration-300 hover:border-white/10 ${isReply ? 'bg-black/20' : 'bg-white/5'}">
            <div class="flex items-center gap-2 mb-1">
                <span class="material-symbols-outlined text-primary-container text-[18px]">account_circle</span>
                <span class="font-label-md text-white font-bold">${post.username}</span>
                ${isReply ? `
                    <span class="font-label-sm text-primary-container bg-primary-container/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Risposta</span>
                ` : ''}
                <span class="text-on-surface-variant font-label-sm text-[11px] ml-auto">${formattedDate}</span>
            </div>
            
            <p class="font-body-md text-on-surface-variant whitespace-pre-wrap">${parsedContent}</p>
            
            <div class="flex gap-4 mt-2 border-t border-white/5 pt-2 font-label-sm text-[12px]">
                ${currentUser ? `
                    <button onclick="startForumReply('${post.id}', '${post.username}')" class="text-primary-container hover:text-white transition-colors flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">reply</span> Rispondi
                    </button>
                    <button onclick="tagUser('${post.username}')" class="text-on-surface-variant hover:text-white transition-colors flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">alternate_email</span> Tagga
                    </button>
                ` : ''}
                ${canDelete ? `
                    <button onclick="deleteForumPost('${post.id}')" class="text-red-400 hover:text-red-300 transition-colors ml-auto flex items-center gap-1">
                        <span class="material-symbols-outlined text-[14px]">delete</span> Elimina
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function startForumReply(postId, username) {
    replyToPostId = postId;
    const indicator = document.getElementById('forum-reply-indicator');
    const cancelBtn = document.getElementById('cancel-forum-reply');
    const formTitle = document.getElementById('forum-form-title');
    const textarea = document.getElementById('forum-post-text');

    if (indicator) indicator.innerText = `In risposta a @${username}`;
    if (cancelBtn) cancelBtn.classList.remove('hidden');
    if (formTitle) formTitle.innerText = `Rispondi a ${username}`;
    
    // Auto-focus and scroll to the form nicely
    if (textarea) {
        textarea.focus();
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function cancelForumReply() {
    replyToPostId = null;
    const indicator = document.getElementById('forum-reply-indicator');
    const cancelBtn = document.getElementById('cancel-forum-reply');
    const formTitle = document.getElementById('forum-form-title');
    const textarea = document.getElementById('forum-post-text');

    if (indicator) indicator.innerText = '';
    if (cancelBtn) cancelBtn.classList.add('hidden');
    if (formTitle) formTitle.innerText = `Scrivi un commento nel forum`;
}

function tagUser(username) {
    const textarea = document.getElementById('forum-post-text');
    if (!textarea) return;

    const currentText = textarea.value;
    const tag = `@${username} `;
    
    if (currentText.includes(tag)) {
        textarea.focus();
        return;
    }

    textarea.value = tag + currentText;
    textarea.focus();
}

async function submitForumPost() {
    const user = localStorage.getItem('stoike_user');
    const textarea = document.getElementById('forum-post-text');
    if (!user || !textarea) return;

    const text = textarea.value.trim();
    if (!text) return;

    try {
        const resp = await fetch('/api/forum', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: user,
                tmdb_movie_id: currentMovieId,
                content: text,
                parent_id: replyToPostId
            })
        });

        const data = await resp.json();
        if (!data.success) throw new Error(data.error || 'Errore salvataggio post.');

        textarea.value = '';
        cancelForumReply();
        await loadForum(currentMovieId);
    } catch (e) {
        alert('Impossibile inviare il messaggio: ' + e.message);
    }
}

let forumPostIdToDelete = null;

function openDeleteForumModal(postId) {
    forumPostIdToDelete = postId;
    const modal = document.getElementById('delete-forum-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDeleteForumModal() {
    forumPostIdToDelete = null;
    const modal = document.getElementById('delete-forum-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function deleteForumPost(postId) {
    openDeleteForumModal(postId);
}

async function executeDeleteForumPost() {
    if (!forumPostIdToDelete) return;
    const postId = forumPostIdToDelete;

    const user = localStorage.getItem('stoike_user');
    if (!user) {
        closeDeleteForumModal();
        return;
    }

    try {
        const resp = await fetch(`/api/forum/${postId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user })
        });

        const data = await resp.json();
        if (!data.success) throw new Error(data.error);

        closeDeleteForumModal();
        await loadForum(currentMovieId);
    } catch (err) {
        closeDeleteForumModal();
        alert('Errore durante l\'eliminazione: ' + err.message);
    }
}

// Mention Autocomplete logic
function initMentionAutocomplete() {
    const textarea = document.getElementById('forum-post-text');
    const dropdown = document.getElementById('mention-dropdown');
    if (!textarea || !dropdown) return;

    textarea.addEventListener('input', () => {
        const value = textarea.value;
        const selectionEnd = textarea.selectionEnd;
        
        // Find if we are typing a mention
        const textBeforeCursor = value.slice(0, selectionEnd);
        const lastWordMatch = textBeforeCursor.match(/@(\w*)$/);

        if (lastWordMatch && activeForumUsers.length > 0) {
            const query = lastWordMatch[1].toLowerCase();
            const matches = activeForumUsers.filter(u => u.toLowerCase().startsWith(query) && u.toLowerCase() !== localStorage.getItem('stoike_user')?.toLowerCase());
            
            if (matches.length > 0) {
                renderMentionDropdown(matches, lastWordMatch.index, selectionEnd);
            } else {
                dropdown.classList.add('hidden');
                dropdown.classList.remove('flex');
            }
        } else {
            dropdown.classList.add('hidden');
            dropdown.classList.remove('flex');
        }
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== textarea) {
            dropdown.classList.add('hidden');
            dropdown.classList.remove('flex');
        }
    });
}

function renderMentionDropdown(users, matchStartIndex, matchEndIndex) {
    const textarea = document.getElementById('forum-post-text');
    const dropdown = document.getElementById('mention-dropdown');
    if (!textarea || !dropdown) return;

    dropdown.innerHTML = users.map(user => `
        <button type="button" class="px-4 py-2 hover:bg-primary-container hover:text-black text-left text-white font-label-sm transition-colors flex items-center gap-2 w-full border-b border-white/5 last:border-b-0">
            <span class="material-symbols-outlined text-[16px]">alternate_email</span>
            <span>${user}</span>
        </button>
    `).join('');

    dropdown.classList.remove('hidden');
    dropdown.classList.add('flex');

    // Attach click listeners to options
    const buttons = dropdown.querySelectorAll('button');
    buttons.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            const username = users[idx];
            const value = textarea.value;
            const before = value.slice(0, matchStartIndex);
            const after = value.slice(matchEndIndex);
            
            textarea.value = before + `@${username} ` + after;
            textarea.focus();
            dropdown.classList.add('hidden');
            dropdown.classList.remove('flex');
        });
    });
}
