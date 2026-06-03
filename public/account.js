// =========================================
// STOIKE — Logica Frontend della Pagina Account
// =========================================

// Stato originale del profilo (usato per la funzione Annulla)
let originalProfile = {
    username: '',
    nickname: '',
    email: '',
    avatar_url: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDt7PZrBX9BJiiPiYcPFspIG13xOyP14bl7xlFDunbqT-rfZhgwIV4UoGe3TzGGWQ6Dr4xdgALPg9tdgrKl49JGdE-JxxariZRrTvGKlUOkpH8aXPB7bpDFTEXVR7UoGuf8cDFq8n1yxhiOpV9KwKetxG8xApbTLjbO-sGc18y_DLG_SiY9uSexy1JZ3rurDYa8JyyWg1_89Owywrb4zM9AejdI2QnwfYPYIUCaRcho_FQAHUtG0xJ2o6PvIFx0NFMbVr3D2STI9KL3',
};

// Immagine attualmente selezionata codificata in Base64 (se caricata)
let uploadedAvatarBase64 = null;

// All'avvio del DOM
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verifica autenticazione
    const username = localStorage.getItem('stoike_user');
    if (!username) {
        // Se l'utente non è registrato/loggato, reindirizza alla home
        window.location.href = '/index.html';
        return;
    }

    // 2. Popola campo username (sola lettura)
    const usernameInput = document.getElementById('profile-username');
    if (usernameInput) {
        usernameInput.value = username;
    }
    originalProfile.username = username;

    // Popola immediatamente dalla cache di localStorage per rendering istantaneo
    const cachedNickname = localStorage.getItem('stoike_nickname');
    const cachedAvatar = localStorage.getItem('stoike_avatar');
    
    const nicknameInput = document.getElementById('profile-nickname');
    if (nicknameInput && cachedNickname) {
        nicknameInput.value = cachedNickname;
        originalProfile.nickname = cachedNickname;
    }

    const cachedEmail = localStorage.getItem('stoike_email_' + username) || localStorage.getItem('stoike_email');
    const emailInput = document.getElementById('profile-email');
    if (emailInput && cachedEmail) {
        emailInput.value = cachedEmail;
        originalProfile.email = cachedEmail;
    }
    
    const avatarPreview = document.getElementById('profile-avatar-preview');
    if (avatarPreview && cachedAvatar) {
        avatarPreview.src = cachedAvatar;
        originalProfile.avatar_url = cachedAvatar;
    }

    // 3. Recupera dati del profilo dal server
    await loadUserProfile(username);

    // 4. Traduzione della pagina
    if (window.i18n) {
        // Aggiungiamo dinamicamente le traduzioni della pagina account all'i18n engine
        extendI18nTranslations();
        i18n.applyTranslations();
    }

    // 5. Setup del form
    const form = document.getElementById('profile-form');
    if (form) {
        form.addEventListener('submit', handleProfileSave);
    }
});

// Carica il profilo dal server
async function loadUserProfile(username) {
    try {
        const response = await fetch(`/api/user/profile?username=${encodeURIComponent(username)}&_t=${Date.now()}`);
        const data = await response.json();
        
        if (data && data.success) {
            const nickname = data.nickname || '';
            const avatarUrl = data.avatar_url || originalProfile.avatar_url;
            const email = data.email || '';

            // Aggiorna input Nickname
            const nicknameInput = document.getElementById('profile-nickname');
            if (nicknameInput) nicknameInput.value = nickname;

            // Aggiorna input Email
            const emailInput = document.getElementById('profile-email');
            if (emailInput) emailInput.value = email;

            // Aggiorna preview avatar
            const avatarPreview = document.getElementById('profile-avatar-preview');
            if (avatarPreview) avatarPreview.src = avatarUrl;
            
            // Aggiorna l'header
            const headerAvatar = document.getElementById('header-user-avatar');
            if (headerAvatar) headerAvatar.src = avatarUrl;

            // Salva lo stato originario per il tasto Annulla
            originalProfile.nickname = nickname;
            originalProfile.avatar_url = avatarUrl;
            originalProfile.email = email;

            // Aggiorna cache locale
            localStorage.setItem('stoike_nickname', nickname);
            localStorage.setItem('stoike_avatar', avatarUrl);
            if (email) {
                localStorage.setItem('stoike_email_' + username, email);
            }
        }
    } catch (err) {
        console.error("Errore nel caricamento del profilo utente:", err);
    }
}

// Scatena il click sul file chooser nascosto
function triggerAvatarUpload() {
    const input = document.getElementById('avatar-input');
    if (input) input.click();
}

// Legge il file selezionato e aggiorna la preview (in Base64 con ridimensionamento)
function previewAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validazione dimensioni iniziale (max 10MB per caricamento)
    if (file.size > 10 * 1024 * 1024) {
        showStatus('La dimensione della foto supera i 10MB. Seleziona un file più leggero.', 'error');
        event.target.value = ''; // svuota input
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 200;
            const MAX_HEIGHT = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Comprime in formato JPEG (qualità 0.7) per un Base64 estremamente leggero (circa 5-15 KB)
            const base64String = canvas.toDataURL('image/jpeg', 0.7);

            // Aggiorna la preview nel form
            const preview = document.getElementById('profile-avatar-preview');
            if (preview) {
                preview.src = base64String;
            }
            
            // Salva in memoria per il salvataggio
            uploadedAvatarBase64 = base64String;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Invia i dati al backend per il salvataggio
async function handleProfileSave(event) {
    event.preventDefault();

    const nicknameInput = document.getElementById('profile-nickname');
    const nickname = nicknameInput ? nicknameInput.value.trim() : '';
    const emailInput = document.getElementById('profile-email');
    const email = emailInput ? emailInput.value.trim() : '';
    const username = originalProfile.username;

    if (!nickname) {
        showStatus('Il nickname non può essere vuoto.', 'error');
        return;
    }

    const saveBtn = document.getElementById('save-btn');
    const originalBtnHTML = saveBtn.innerHTML;
    
    // Mostra spinner di caricamento
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px] align-middle mr-2">sync</span>Salvataggio...';
        saveBtn.classList.add('opacity-70');
    }

    try {
        const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                nickname: nickname,
                avatar_data: uploadedAvatarBase64,
                email: email
            })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Successo! Aggiorna stato locale e visuale
            showStatus(window.i18n ? i18n.t('account.success') : 'Profilo salvato con successo!', 'success');
            
            // Aggiorna l'input nickname visualizzato
            if (nicknameInput) nicknameInput.value = data.nickname;
            originalProfile.nickname = data.nickname;
            if (data.email !== undefined) {
                originalProfile.email = data.email;
                localStorage.setItem('stoike_email_' + username, data.email || '');
            }
            if (data.avatar_url) {
                originalProfile.avatar_url = data.avatar_url;
            }

            // Aggiorna localStorage
            localStorage.setItem('stoike_nickname', data.nickname);
            if (data.avatar_url) {
                localStorage.setItem('stoike_avatar', data.avatar_url);
                // Aggiorna header
                const headerAvatar = document.getElementById('header-user-avatar');
                if (headerAvatar) headerAvatar.src = data.avatar_url;
            }

            // Pulisce l'immagine caricata temporanea
            uploadedAvatarBase64 = null;
            document.getElementById('avatar-input').value = '';

            // Ricarica la sessione per aggiornare tutto il layout di Stoike
            if (window.checkAuthState) {
                window.checkAuthState();
            }
        } else {
            showStatus(data.message || 'Errore durante il salvataggio.', 'error');
        }
    } catch (err) {
        showStatus('Errore di connessione con il server.', 'error');
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHTML;
            saveBtn.classList.remove('opacity-70');
        }
    }
}

// Ripristina il form allo stato originario salvato
function resetForm() {
    // Ripristina input nickname
    const nicknameInput = document.getElementById('profile-nickname');
    if (nicknameInput) {
        nicknameInput.value = originalProfile.nickname;
    }

    // Ripristina input email
    const emailInput = document.getElementById('profile-email');
    if (emailInput) {
        emailInput.value = originalProfile.email;
    }

    // Ripristina preview avatar
    const preview = document.getElementById('profile-avatar-preview');
    if (preview) {
        preview.src = originalProfile.avatar_url;
    }

    // Pulisce il file caricato non salvato
    uploadedAvatarBase64 = null;
    const fileInput = document.getElementById('avatar-input');
    if (fileInput) fileInput.value = '';

    // Nasconde o pulisce i messaggi di stato
    const status = document.getElementById('profile-status');
    if (status) status.classList.add('hidden');
}

// Mostra un banner di stato (successo o errore)
function showStatus(message, type) {
    const statusBox = document.getElementById('profile-status');
    if (!statusBox) return;

    statusBox.innerText = message;
    statusBox.classList.remove('hidden', 'bg-green-500/20', 'border-green-500/30', 'text-green-200', 'bg-red-500/20', 'border-red-500/30', 'text-red-200');

    if (type === 'success') {
        statusBox.classList.add('bg-green-500/20', 'border-green-500/30', 'text-green-200');
    } else {
        statusBox.classList.add('bg-red-500/20', 'border-red-500/30', 'text-red-200');
    }

    // Scrolla per mostrare il banner se necessario
    statusBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Chiede conferma ed elimina definitivamente l'account
window.confirmDeleteAccount = async function() {
    const username = originalProfile.username;
    if (!username) return;

    const confirmMsg = window.i18n ? i18n.t('account.deleteConfirm') : "Sei sicuro di voler eliminare definitivamente il tuo account? Questa azione è irreversibile.";
    if (!confirm(confirmMsg)) {
        return;
    }

    const deleteBtn = document.getElementById('delete-account-btn');
    let originalBtnHTML = '';
    if (deleteBtn) {
        originalBtnHTML = deleteBtn.innerHTML;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="material-symbols-outlined animate-spin text-[20px] align-middle mr-2">sync</span>Eliminazione...';
        deleteBtn.classList.add('opacity-70');
    }

    try {
        const response = await fetch('/api/user/account', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            alert(window.i18n ? i18n.t('account.deleteSuccess') : "Account eliminato con successo.");
            
            // Pulisce la sessione locale
            localStorage.removeItem('stoike_user');
            localStorage.removeItem('stoike_role');
            localStorage.removeItem('stoike_nickname');
            localStorage.removeItem('stoike_avatar');
            localStorage.removeItem('stoike_saved_movies_' + username);
            localStorage.removeItem('stoike_email_' + username);
            
            // Reindirizza alla home page
            window.location.href = '/index.html';
        } else {
            alert(data.message || "Errore durante l'eliminazione dell'account.");
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = originalBtnHTML;
                deleteBtn.classList.remove('opacity-70');
            }
        }
    } catch (err) {
        alert("Errore di connessione con il server.");
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = originalBtnHTML;
            deleteBtn.classList.remove('opacity-70');
        }
    }
};

// Estende le traduzioni di i18n per la pagina account
function extendI18nTranslations() {
    if (!window.i18n || !translations) return;

    const accountTranslations = {
        'account.title': {
            it: 'Gestione Account',
            en: 'Account Settings',
            fr: 'Gestion du Compte',
            es: 'Gestión de Cuenta',
            de: 'Kontoeinstellungen'
        },
        'account.subtitle': {
            it: 'Personalizza il tuo profilo di Stoike',
            en: 'Customize your Stoike profile',
            fr: 'Personnalisez votre profil Stoike',
            es: 'Personaliza tu perfil de Stoike',
            de: 'Personalisiere dein Stoike-Profil'
        },
        'account.changePhoto': {
            it: 'Cambia foto',
            en: 'Change photo',
            fr: 'Changer la photo',
            es: 'Cambiar foto',
            de: 'Foto ändern'
        },
        'account.uploadBtn': {
            it: 'Carica foto',
            en: 'Upload photo',
            fr: 'Charger une photo',
            es: 'Subir foto',
            de: 'Foto hochladen'
        },
        'account.photoSpecs': {
            it: 'Formati supportati: PNG, JPG. Max 5MB.',
            en: 'Supported formats: PNG, JPG. Max 5MB.',
            fr: 'Formats supportés : PNG, JPG. Max 5 Mo.',
            es: 'Formatos soportados: PNG, JPG. Máx. 5MB.',
            de: 'Unterstützte Formate: PNG, JPG. Max. 5MB.'
        },
        'account.username': {
            it: 'Username',
            en: 'Username',
            fr: "Nom d'utilisateur",
            es: 'Usuario',
            de: 'Benutzername'
        },
        'account.usernameImmutable': {
            it: "L'username è immutabile e serve per l'autenticazione.",
            en: 'The username is immutable and is used for authentication.',
            fr: "Le nom d'utilisateur est immuable et sert à l'authentification.",
            es: 'El nombre de usuario es inmutable y se usa para la autenticación.',
            de: 'Der Benutzername ist unveränderlich und dient der Authentifizierung.'
        },
        'account.nickname': {
            it: 'Nickname Personalizzato',
            en: 'Custom Nickname',
            fr: 'Pseudonyme Personnalisé',
            es: 'Apodo Personalizado',
            de: 'Benutzerdefinierter Spitzname'
        },
        'account.nicknamePlaceholder': {
            it: 'Es. MikeTheCritic',
            en: 'e.g. MikeTheCritic',
            fr: 'Ex. MikeTheCritic',
            es: 'Ej. MikeTheCritic',
            de: 'z.B. MikeTheCritic'
        },
        'account.nicknameSpecs': {
            it: 'Il tuo nome pubblico visibile nei forum e nelle recensioni. Deve essere unico.',
            en: 'Your public name visible in forums and reviews. Must be unique.',
            fr: 'Votre nom public visible dans les forums et les critiques. Doit être unique.',
            es: 'Tu nombre público visible en foros y reseñas. Debe ser único.',
            de: 'Dein öffentlicher Name in Foren und Bewertungen. Muss einzigartig sein.'
        },
        'account.email': {
            it: 'Email',
            en: 'Email',
            fr: 'Email',
            es: 'Correo electrónico',
            de: 'E-Mail'
        },
        'account.emailPlaceholder': {
            it: 'Es. mario@example.com',
            en: 'e.g. mario@example.com',
            fr: 'Ex. mario@example.com',
            es: 'Ej. mario@example.com',
            de: 'z.B. mario@example.com'
        },
        'account.emailSpecs': {
            it: 'Utilizzata per i promemoria di uscita dei film. Non verrà condivisa pubblicamente.',
            en: 'Used for movie release reminders. Will not be shared publicly.',
            fr: 'Utilisée pour les rappels de sortie de films. Ne sera pas partagée publiquement.',
            es: 'Utilizada para recordatorios de estrenos de películas. No se compartirá públicamente.',
            de: 'Wird für Film-Erinnerungen verwendet. Wird nicht öffentlich geteilt.'
        },
        'account.save': {
            it: 'Salva',
            en: 'Save',
            fr: 'Enregistrer',
            es: 'Guardar',
            de: 'Speichern'
        },
        'account.cancel': {
            it: 'Annulla',
            en: 'Cancel',
            fr: 'Annuler',
            es: 'Cancelar',
            de: 'Abbrechen'
        },
        'account.goBack': {
            it: 'Torna Indietro',
            en: 'Go Back',
            fr: 'Retour',
            es: 'Volver',
            de: 'Zurück'
        },
        'account.success': {
            it: 'Profilo salvato con successo!',
            en: 'Profile saved successfully!',
            fr: 'Profil enregistré avec succès !',
            es: '¡Perfil guardado con éxito!',
            de: 'Profil erfolgreich gespeichert!'
        },
        'account.dangerZone': {
            it: 'Zona di Pericolo',
            en: 'Danger Zone',
            fr: 'Zone de Danger',
            es: 'Zona de Peligro',
            de: 'Gefahrenzone'
        },
        'account.dangerZoneSpecs': {
            it: 'Una volta eliminato il tuo account, tutti i tuoi dati, le recensioni ed i promemoria verranno persi definitivamente.',
            en: 'Once your account is deleted, all your data, reviews and reminders will be permanently lost.',
            fr: 'Une fois votre compte supprimé, toutes vos données, avis et rappels seront définitivement perdus.',
            es: 'Una vez eliminada la cuenta, todos tus datos, opiniones y recordatorios se perderán para sempre.',
            de: 'Sobald dein Konto gelöscht ist, gehen alle deine Daten, Bewertungen und Erinnerungen dauerhaft verloren.'
        },
        'account.deleteAccount': {
            it: 'Elimina Account',
            en: 'Delete Account',
            fr: 'Supprimer le Compte',
            es: 'Eliminar Cuenta',
            de: 'Konto löschen'
        },
        'account.deleteConfirm': {
            it: 'Sei sicuro di voler eliminare definitivamente il tuo account? Questa azione è irreversibile.',
            en: 'Are you sure you want to permanently delete your account? This action is irreversible.',
            fr: 'Êtes-vous sûr di voler eliminare definitivamente il tuo account? Questa azione è irreversibile.',
            es: '¿Estás seguro de que deseas eliminar permanentemente tu cuenta? Esta acción es irreversible.',
            de: 'Bist du sicher, dass du dein Konto dauerhaft löschen möchtest? Diese Aktion ist unumkehrbar.'
        },
        'account.deleteSuccess': {
            it: 'Account eliminato con successo.',
            en: 'Account deleted successfully.',
            fr: 'Compte supprimé avec succès.',
            es: 'Cuenta eliminada con éxito.',
            de: 'Konto erfolgreich gelöscht.'
        }
    };

    // Unisci i dizionari
    Object.assign(translations, accountTranslations);
}
