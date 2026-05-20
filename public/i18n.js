// =========================================
// STOIKE — Internationalization (i18n) Engine
// 5 Languages: IT (default), EN, FR, ES, DE
// =========================================

const translations = {
    // ── Navigation ──
    'nav.movies':        { it: 'Film', en: 'Movies', fr: 'Films', es: 'Películas', de: 'Filme' },
    'nav.genres':        { it: 'Generi', en: 'Genres', fr: 'Genres', es: 'Géneros', de: 'Genres' },
    'nav.actors':        { it: 'Attori', en: 'Actors', fr: 'Acteurs', es: 'Actores', de: 'Schauspieler' },
    'nav.community':     { it: 'Comunità', en: 'Community', fr: 'Communauté', es: 'Comunidad', de: 'Community' },

    // ── Search ──
    'search.placeholder':  { it: 'Cerca...', en: 'Search...', fr: 'Rechercher...', es: 'Buscar...', de: 'Suchen...' },
    'search.year':         { it: 'Anno', en: 'Year', fr: 'Année', es: 'Año', de: 'Jahr' },
    'search.clearYear':    { it: 'Pulisci', en: 'Clear', fr: 'Effacer', es: 'Limpiar', de: 'Löschen' },
    'search.noResults':    { it: 'Nessun risultato', en: 'No results', fr: 'Aucun résultat', es: 'Sin resultados', de: 'Keine Ergebnisse' },

    // ── Sidebar ──
    'sidebar.catalog':       { it: 'Catalogo', en: 'Catalog', fr: 'Catalogue', es: 'Catálogo', de: 'Katalog' },
    'sidebar.browseBy':      { it: 'Sfoglia per Categoria', en: 'Browse by Category', fr: 'Parcourir par Catégorie', es: 'Explorar por Categoría', de: 'Nach Kategorie durchsuchen' },
    'sidebar.trending':      { it: 'Tendenza', en: 'Trending', fr: 'Tendances', es: 'Tendencias', de: 'Im Trend' },
    'sidebar.topRated':      { it: 'Più Votati', en: 'Top Rated', fr: 'Les Mieux Notés', es: 'Mejor Valorados', de: 'Bestbewertet' },
    'sidebar.newReleases':   { it: 'Nuove Uscite', en: 'New Releases', fr: 'Nouveautés', es: 'Nuevos Lanzamientos', de: 'Neuerscheinungen' },
    'sidebar.comingSoon':    { it: 'Prossimamente', en: 'Coming Soon', fr: 'Prochainement', es: 'Próximamente', de: 'Demnächst' },
    'sidebar.collection':    { it: 'Collezione', en: 'Collection', fr: 'Collection', es: 'Colección', de: 'Sammlung' },

    // ── Auth ──
    'auth.loginRegister':  { it: 'Login / Registrati', en: 'Login / Register', fr: 'Connexion / Inscription', es: 'Iniciar / Registrarse', de: 'Anmelden / Registrieren' },
    'auth.welcome':        { it: 'Benvenuto,', en: 'Welcome,', fr: 'Bienvenue,', es: 'Bienvenido,', de: 'Willkommen,' },
    'auth.logout':         { it: 'Logout', en: 'Logout', fr: 'Déconnexion', es: 'Cerrar sesión', de: 'Abmelden' },
    'auth.login':          { it: 'Login', en: 'Login', fr: 'Connexion', es: 'Iniciar sesión', de: 'Anmelden' },
    'auth.register':       { it: 'Registrazione', en: 'Registration', fr: 'Inscription', es: 'Registro', de: 'Registrierung' },
    'auth.username':       { it: 'Username', en: 'Username', fr: "Nom d'utilisateur", es: 'Usuario', de: 'Benutzername' },
    'auth.password':       { it: 'Password', en: 'Password', fr: 'Mot de passe', es: 'Contraseña', de: 'Passwort' },
    'auth.submit.login':   { it: 'Accedi', en: 'Sign In', fr: 'Se connecter', es: 'Acceder', de: 'Einloggen' },
    'auth.submit.register':{ it: 'Registrati', en: 'Register', fr: "S'inscrire", es: 'Registrarse', de: 'Registrieren' },
    'auth.userPlaceholder':{ it: 'Es. Mike', en: 'e.g. Mike', fr: 'Ex. Mike', es: 'Ej. Mike', de: 'z.B. Mike' },

    // ── Support Modal ──
    'support.title':        { it: 'Segnala un problema', en: 'Report a Problem', fr: 'Signaler un problème', es: 'Reportar un problema', de: 'Problem melden' },
    'support.subtitle':     { it: 'Descrivici il problema riscontrato e lo risolveremo al più presto.', en: 'Describe the problem you encountered and we will fix it as soon as possible.', fr: 'Décrivez le problème rencontré et nous le résoudrons au plus vite.', es: 'Describe el problema que encontraste y lo resolveremos lo antes posible.', de: 'Beschreiben Sie das Problem und wir werden es so schnell wie möglich beheben.' },
    'support.titleInput':   { it: 'Titolo del problema (breve e chiaro)', en: 'Problem title (short and clear)', fr: 'Titre du problème (bref et clair)', es: 'Título del problema (breve y claro)', de: 'Problemtitel (kurz und klar)' },
    'support.emailInput':   { it: 'La tua email per aggiornamenti (opzionale)', en: 'Your email for updates (optional)', fr: 'Votre email pour les mises à jour (optionnel)', es: 'Tu email para actualizaciones (opcional)', de: 'Ihre E-Mail für Updates (optional)' },
    'support.messageInput': { it: 'Descrivi il problema nel dettaglio...', en: 'Describe the problem in detail...', fr: 'Décrivez le problème en détail...', es: 'Describe el problema en detalle...', de: 'Beschreiben Sie das Problem im Detail...' },
    'support.submit':       { it: 'Invia segnalazione', en: 'Submit report', fr: 'Envoyer le signalement', es: 'Enviar reporte', de: 'Bericht senden' },

    // ── Bottom Nav ──
    'bottomNav.home':      { it: 'Home', en: 'Home', fr: 'Accueil', es: 'Inicio', de: 'Startseite' },
    'bottomNav.search':    { it: 'Cerca', en: 'Search', fr: 'Rechercher', es: 'Buscar', de: 'Suchen' },
    'bottomNav.watchlist': { it: 'Watchlist', en: 'Watchlist', fr: 'À voir', es: 'Lista', de: 'Merkliste' },
    'bottomNav.profile':   { it: 'Profilo', en: 'Profile', fr: 'Profil', es: 'Perfil', de: 'Profil' },

    // ── Home Page ──
    'home.trendingTitle':   { it: 'Film di Tendenza', en: 'Trending Movies', fr: 'Films Tendance', es: 'Películas en Tendencia', de: 'Trendfilme' },
    'home.noMovies':        { it: 'Nessun film in evidenza al momento.', en: 'No featured movies at the moment.', fr: 'Aucun film en vedette pour le moment.', es: 'No hay películas destacadas en este momento.', de: 'Derzeit keine hervorgehobenen Filme.' },
    'home.errorLoading':    { it: 'Errore nel recupero dei film di tendenza.', en: 'Error loading trending movies.', fr: 'Erreur lors du chargement des films tendance.', es: 'Error al cargar las películas en tendencia.', de: 'Fehler beim Laden der Trendfilme.' },
    'home.noTitle':         { it: 'Senza Titolo', en: 'Untitled', fr: 'Sans titre', es: 'Sin título', de: 'Ohne Titel' },
    'home.noSynopsis':      { it: 'Nessuna trama disponibile per questo capolavoro.', en: 'No synopsis available for this masterpiece.', fr: "Aucun synopsis disponible pour ce chef-d'œuvre.", es: 'No hay sinopsis disponible para esta obra maestra.', de: 'Keine Zusammenfassung für dieses Meisterwerk verfügbar.' },
    'home.watchBtn':        { it: 'Guarda Ora', en: 'Watch Now', fr: 'Regarder', es: 'Ver Ahora', de: 'Jetzt ansehen' },
    'home.heroBadge':       { it: 'Ultime Uscite', en: 'Latest Releases', fr: 'Dernières Sorties', es: 'Últimos Estrenos', de: 'Neuerscheinungen' },
    'home.watchTrailer':    { it: 'Guarda Trailer', en: 'Watch Trailer', fr: 'Regarder la Bande-annonce', es: 'Ver Tráiler', de: 'Trailer ansehen' },

    // ── Movie Detail ──
    'movie.loading':         { it: 'Caricamento...', en: 'Loading...', fr: 'Chargement...', es: 'Cargando...', de: 'Laden...' },
    'movie.backCatalog':     { it: 'Torna al catalogo', en: 'Back to catalog', fr: 'Retour au catalogue', es: 'Volver al catálogo', de: 'Zurück zum Katalog' },
    'movie.synopsis':        { it: 'Trama', en: 'Synopsis', fr: 'Synopsis', es: 'Sinopsis', de: 'Handlung' },
    'movie.cast':            { it: 'Cast Principale', en: 'Main Cast', fr: 'Distribution', es: 'Reparto Principal', de: 'Hauptbesetzung' },
    'movie.franchise':       { it: 'Prequel & Sequel (Franchise)', en: 'Prequel & Sequel (Franchise)', fr: 'Préquelle & Suite (Franchise)', es: 'Precuela y Secuela (Franquicia)', de: 'Prequel & Sequel (Franchise)' },
    'movie.prequelLabel':    { it: 'Prequel', en: 'Prequel', fr: 'Préquelle', es: 'Precuela', de: 'Prequel' },
    'movie.sequelLabel':     { it: 'Sequel', en: 'Sequel', fr: 'Suite', es: 'Secuela', de: 'Fortsetzung' },
    'movie.similar':         { it: 'Titoli Simili Suggeriti', en: 'Similar Titles', fr: 'Titres Similaires', es: 'Títulos Similares', de: 'Ähnliche Titel' },
    'movie.trailer':         { it: 'Trailer Ufficiale', en: 'Official Trailer', fr: 'Bande-annonce Officielle', es: 'Tráiler Oficial', de: 'Offizieller Trailer' },
    'movie.errorLoading':    { it: 'Errore di caricamento', en: 'Loading error', fr: 'Erreur de chargement', es: 'Error de carga', de: 'Ladefehler' },
    'movie.errorAlert':      { it: 'Impossibile caricare i dettagli di questo film.', en: 'Unable to load details for this movie.', fr: 'Impossible de charger les détails de ce film.', es: 'No se pudieron cargar los detalles de esta película.', de: 'Details für diesen Film konnten nicht geladen werden.' },

    // ── Reviews ──
    'reviews.title':         { it: 'Recensioni', en: 'Reviews', fr: 'Critiques', es: 'Reseñas', de: 'Bewertungen' },
    'reviews.loading':       { it: 'Caricamento recensioni...', en: 'Loading reviews...', fr: 'Chargement des critiques...', es: 'Cargando reseñas...', de: 'Bewertungen laden...' },
    'reviews.none':          { it: 'Nessuna recensione presente per questo film su Stoike.', en: 'No reviews for this movie on Stoike yet.', fr: 'Aucune critique pour ce film sur Stoike.', es: 'No hay reseñas para esta película en Stoike.', de: 'Noch keine Bewertungen für diesen Film auf Stoike.' },
    'reviews.errorLoading':  { it: 'Errore nel caricamento delle recensioni.', en: 'Error loading reviews.', fr: 'Erreur lors du chargement des critiques.', es: 'Error al cargar las reseñas.', de: 'Fehler beim Laden der Bewertungen.' },
    'reviews.addTitle':      { it: 'Scrivi una Recensione', en: 'Write a Review', fr: 'Écrire une Critique', es: 'Escribir una Reseña', de: 'Bewertung schreiben' },
    'reviews.author':        { it: 'Il tuo nome', en: 'Your name', fr: 'Votre nom', es: 'Tu nombre', de: 'Dein Name' },
    'reviews.rating':        { it: 'Voto (0-10)', en: 'Rating (0-10)', fr: 'Note (0-10)', es: 'Puntuación (0-10)', de: 'Bewertung (0-10)' },
    'reviews.text':          { it: 'La tua recensione...', en: 'Your review...', fr: 'Votre critique...', es: 'Tu reseña...', de: 'Deine Bewertung...' },
    'reviews.publish':       { it: 'Pubblica Recensione', en: 'Publish Review', fr: 'Publier la Critique', es: 'Publicar Reseña', de: 'Bewertung veröffentlichen' },
    'reviews.save':          { it: 'Salva', en: 'Save', fr: 'Enregistrer', es: 'Guardar', de: 'Speichern' },
    'reviews.cancel':        { it: 'Annulla', en: 'Cancel', fr: 'Annuler', es: 'Cancelar', de: 'Abbrechen' },
    'reviews.reviewText':    { it: 'Testo Recensione', en: 'Review Text', fr: 'Texte de la Critique', es: 'Texto de la Reseña', de: 'Bewertungstext' },
    'reviews.fillAll':       { it: 'Compila tutti i campi.', en: 'Fill in all fields.', fr: 'Remplissez tous les champs.', es: 'Rellena todos los campos.', de: 'Fülle alle Felder aus.' },
    'reviews.deleteTitle':   { it: 'Conferma eliminazione', en: 'Confirm deletion', fr: 'Confirmer la suppression', es: 'Confirmar eliminación', de: 'Löschen bestätigen' },
    'reviews.deleteMsg':     { it: 'Sei sicuro di voler eliminare questa recensione? Questa azione è irreversibile.', en: 'Are you sure you want to delete this review? This action is irreversible.', fr: 'Êtes-vous sûr de vouloir supprimer cette critique ? Cette action est irréversible.', es: '¿Estás seguro de que quieres eliminar esta reseña? Esta acción es irreversible.', de: 'Bist du sicher, dass du diese Bewertung löschen möchtest? Diese Aktion ist unwiderruflich.' },
    'reviews.deleteConfirm': { it: 'Elimina', en: 'Delete', fr: 'Supprimer', es: 'Eliminar', de: 'Löschen' },
    'reviews.deleteCancel':  { it: 'Annulla', en: 'Cancel', fr: 'Annuler', es: 'Cancelar', de: 'Abbrechen' },
    'reviews.user':          { it: 'Utente', en: 'User', fr: 'Utilisateur', es: 'Usuario', de: 'Benutzer' },
    'reviews.mustLogin':     { it: 'Devi essere loggato.', en: 'You must be logged in.', fr: 'Vous devez être connecté.', es: 'Debes iniciar sesión.', de: 'Du musst eingeloggt sein.' },

    // ── Actors ──
    'actors.pageTitle':      { it: 'Cerca Attore & Cast', en: 'Search Actor & Cast', fr: 'Rechercher Acteur & Distribution', es: 'Buscar Actor & Reparto', de: 'Schauspieler & Besetzung suchen' },
    'actors.searchPlaceholder': { it: 'Inserisci il nome di un attore o attrice...', en: 'Enter an actor or actress name...', fr: "Entrez le nom d'un acteur ou actrice...", es: 'Introduce el nombre de un actor o actriz...', de: 'Geben Sie einen Schauspieler-Namen ein...' },
    'actors.searchBtn':      { it: 'Cerca', en: 'Search', fr: 'Rechercher', es: 'Buscar', de: 'Suchen' },
    'actors.popular':        { it: 'Attori Popolari', en: 'Popular Actors', fr: 'Acteurs Populaires', es: 'Actores Populares', de: 'Beliebte Schauspieler' },
    'actors.loadingPopular': { it: 'Caricamento attori popolari...', en: 'Loading popular actors...', fr: 'Chargement des acteurs populaires...', es: 'Cargando actores populares...', de: 'Beliebte Schauspieler laden...' },
    'actors.loading':        { it: 'Caricamento informazioni in corso...', en: 'Loading information...', fr: 'Chargement des informations...', es: 'Cargando información...', de: 'Informationen werden geladen...' },
    'actors.notFound':       { it: 'Ci scusiamo non abbiamo trovato informazioni su questa persona', en: 'We are sorry, we could not find information about this person', fr: "Nous sommes désolés, nous n'avons trouvé aucune information sur cette personne", es: 'Lo sentimos, no hemos encontrado información sobre esta persona', de: 'Es tut uns leid, wir konnten keine Informationen über diese Person finden' },
    'actors.biography':      { it: 'Biografia', en: 'Biography', fr: 'Biographie', es: 'Biografía', de: 'Biografie' },
    'actors.filmographyOf':  { it: 'Filmografia di', en: 'Filmography of', fr: 'Filmographie de', es: 'Filmografía de', de: 'Filmografie von' },
    'actors.noFilms':        { it: 'Nessun film registrato nella filmografia.', en: 'No movies recorded in filmography.', fr: 'Aucun film enregistré dans la filmographie.', es: 'No hay películas registradas en la filmografía.', de: 'Keine Filme in der Filmografie verzeichnet.' },
    'actors.noBirthday':     { it: 'N/A (Data non disponibile)', en: 'N/A (Date not available)', fr: 'N/A (Date non disponible)', es: 'N/A (Fecha no disponible)', de: 'N/A (Datum nicht verfügbar)' },
    'actors.noBirthplace':   { it: 'N/A (Luogo non disponibile)', en: 'N/A (Place not available)', fr: 'N/A (Lieu non disponible)', es: 'N/A (Lugar no disponible)', de: 'N/A (Ort nicht verfügbar)' },
    'actors.noBio':          { it: 'Nessuna biografia dettagliata registrata per questa persona.', en: 'No detailed biography recorded for this person.', fr: 'Aucune biographie détaillée enregistrée pour cette personne.', es: 'No hay biografía detallada registrada para esta persona.', de: 'Keine detaillierte Biografie für diese Person vorhanden.' },
    'actors.loadingBio':     { it: 'Caricamento biografia...', en: 'Loading biography...', fr: 'Chargement de la biographie...', es: 'Cargando biografía...', de: 'Biografie wird geladen...' },
    'actors.viewDetails':    { it: 'Vedi dettagli', en: 'View details', fr: 'Voir les détails', es: 'Ver detalles', de: 'Details anzeigen' },

    // ── Genres ──
    'genres.pageTitle':      { it: 'Sfoglia per Genere', en: 'Browse by Genre', fr: 'Parcourir par Genre', es: 'Explorar por Género', de: 'Nach Genre durchsuchen' },
    'genres.allGenres':      { it: 'Tutti i generi', en: 'All genres', fr: 'Tous les genres', es: 'Todos los géneros', de: 'Alle Genres' },
    'genres.selectGenre':    { it: 'Seleziona un genere sopra per caricare i film', en: 'Select a genre above to load movies', fr: 'Sélectionnez un genre ci-dessus pour charger les films', es: 'Selecciona un género arriba para cargar las películas', de: 'Wählen Sie oben ein Genre aus, um Filme zu laden' },
    'genres.loading':        { it: 'Caricamento generi...', en: 'Loading genres...', fr: 'Chargement des genres...', es: 'Cargando géneros...', de: 'Genres werden geladen...' },
    'genres.loadingMovies':  { it: 'Caricamento film...', en: 'Loading movies...', fr: 'Chargement des films...', es: 'Cargando películas...', de: 'Filme werden geladen...' },
    'genres.noMovies':       { it: 'Nessun film trovato per questo genere.', en: 'No movies found for this genre.', fr: 'Aucun film trouvé pour ce genre.', es: 'No se encontraron películas para este género.', de: 'Keine Filme für dieses Genre gefunden.' },
    'genres.error':          { it: 'Errore di rete durante il caricamento dei film.', en: 'Network error while loading movies.', fr: 'Erreur réseau lors du chargement des films.', es: 'Error de red al cargar las películas.', de: 'Netzwerkfehler beim Laden der Filme.' },
    'genres.genreLabel':     { it: 'Genere:', en: 'Genre:', fr: 'Genre :', es: 'Género:', de: 'Genre:' },

    // ── List ──
    'list.catalog':       { it: 'Catalogo Film', en: 'Movie Catalog', fr: 'Catalogue de Films', es: 'Catálogo de Películas', de: 'Filmkatalog' },
    'list.resultsFor':    { it: 'Risultati per:', en: 'Results for:', fr: 'Résultats pour :', es: 'Resultados para:', de: 'Ergebnisse für:' },
    'list.topRated':      { it: 'Top Rated', en: 'Top Rated', fr: 'Les Mieux Notés', es: 'Mejor Valorados', de: 'Bestbewertet' },
    'list.newReleases':   { it: 'New Releases', en: 'New Releases', fr: 'Nouveautés', es: 'Nuevos Lanzamientos', de: 'Neuerscheinungen' },
    'list.comingSoon':    { it: 'Coming Soon', en: 'Coming Soon', fr: 'Prochainement', es: 'Próximamente', de: 'Demnächst' },
    'list.collection':    { it: 'Stoike Collection', en: 'Stoike Collection', fr: 'Collection Stoike', es: 'Colección Stoike', de: 'Stoike Sammlung' },
    'list.loading':       { it: 'Caricamento in corso...', en: 'Loading...', fr: 'Chargement...', es: 'Cargando...', de: 'Laden...' },
    'list.noMovies':      { it: 'Nessun film trovato per questa categoria o ricerca.', en: 'No movies found for this category or search.', fr: 'Aucun film trouvé pour cette catégorie ou recherche.', es: 'No se encontraron películas para esta categoría o búsqueda.', de: 'Keine Filme für diese Kategorie oder Suche gefunden.' },
    'list.error':         { it: 'Errore nel caricamento dei dati. Riprova più tardi.', en: 'Error loading data. Please try again later.', fr: 'Erreur de chargement. Réessayez plus tard.', es: 'Error al cargar los datos. Inténtalo más tarde.', de: 'Fehler beim Laden. Bitte später erneut versuchen.' },

    // ── Unified Notifications Center ──
    'nav.notifications':                  { it: 'Notifiche', en: 'Notifications', fr: 'Notifications', es: 'Notificaciones', de: 'Benachrichtigungen' },
    'notifications.title':                { it: 'Centro Notifiche', en: 'Notification Center', fr: 'Centre de Notifications', es: 'Centro de Notificaciones', de: 'Benachrichtigungszentrum' },
    'notifications.remindersSection':     { it: 'Promemoria Uscite', en: 'Release Reminders', fr: 'Rappels de Sortie', es: 'Recordatorios de Estreno', de: 'Veröffentlichungs-Erinnerungen' },
    'notifications.mentionsSection':      { it: 'Menzioni nel Forum', en: 'Forum Mentions', fr: 'Mentions dans le Forum', es: 'Menciones en el Foro', de: 'Erwähnungen im Forum' },
    'notifications.noNotifications':      { it: 'Nessuna nuova notifica.', en: 'No new notifications.', fr: 'Aucune nouvelle notification.', es: 'No hay nuevas notificaciones.', de: 'Keine neuen Benachrichtigungen.' },
    'notifications.clearAll':             { it: 'Segna tutte come lette', en: 'Mark all as read', fr: 'Tout marquer comme lu', es: 'Marcar todas como leídas', de: 'Alle als gelesen markieren' },
    'notifications.daysToGo':             { it: 'giorni all\'uscita', en: 'days to release', fr: 'jours avant la sortie', es: 'días para el estreno', de: 'Tage bis zur Veröffentlichung' },
    'notifications.releasedToday':        { it: 'Uscito oggi!', en: 'Released today!', fr: 'Sorti aujourd\'hui !', es: '¡Estrenado hoy!', de: 'Heute veröffentlicht!' },
    'notifications.released':             { it: 'Già uscito', en: 'Already released', fr: 'Déjà sorti', es: 'Ya estrenado', de: 'Bereits veröffentlicht' },
    'notifications.deleteReminder':       { it: 'Rimuovi promemoria', en: 'Remove reminder', fr: 'Supprimer le rappel', es: 'Eliminar recordatorio', de: 'Erinnerung entfernen' },
    'notifications.watchlist':            { it: 'Vedi nella Watchlist', en: 'View in Watchlist', fr: 'Voir dans la liste', es: 'Ver en la Lista', de: 'In Merkliste ansehen' },

    // ── Common / Misc ──
    'common.all':          { it: 'Tutti', en: 'All', fr: 'Tous', es: 'Todos', de: 'Alle' },
    'common.loading':      { it: 'Caricamento...', en: 'Loading...', fr: 'Chargement...', es: 'Cargando...', de: 'Laden...' },
    'common.loadMore':     { it: 'Carica altro', en: 'Load More', fr: 'Charger plus', es: 'Cargar más', de: 'Mehr laden' },
};

// ── TMDb language mapping ──
const tmdbLangMap = {
    it: 'it-IT',
    en: 'en-US',
    fr: 'fr-FR',
    es: 'es-ES',
    de: 'de-DE'
};

// ── Wikipedia language mapping ──
const wikiLangMap = {
    it: 'it',
    en: 'en',
    fr: 'fr',
    es: 'es',
    de: 'de'
};

// ── Core API ──

function getCurrentLang() {
    return localStorage.getItem('stoike_lang') || 'it';
}

function setLang(lang) {
    if (!tmdbLangMap[lang]) lang = 'it';
    localStorage.setItem('stoike_lang', lang);
    applyTranslations(lang);
    // Update the language selector UI
    const sel = document.getElementById('lang-select');
    if (sel) sel.value = lang;
}

function t(key) {
    const lang = getCurrentLang();
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['it'] || key;
}

function getTMDBLang() {
    return tmdbLangMap[getCurrentLang()] || 'it-IT';
}

function getWikiLang() {
    return wikiLangMap[getCurrentLang()] || 'it';
}

function applyTranslations(lang) {
    if (!lang) lang = getCurrentLang();

    // 1. Translate data-i18n text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const entry = translations[key];
        if (entry) {
            el.innerText = entry[lang] || entry['it'] || '';
        }
    });

    // 2. Translate data-i18n-placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        const entry = translations[key];
        if (entry) {
            el.placeholder = entry[lang] || entry['it'] || '';
        }
    });

    // 3. Translate data-i18n-title attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        const entry = translations[key];
        if (entry) {
            el.title = entry[lang] || entry['it'] || '';
        }
    });
}

// ── Expose globally ──
window.i18n = { getCurrentLang, setLang, t, getTMDBLang, getWikiLang, applyTranslations };
