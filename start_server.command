#!/bin/bash
# Stoike - Start Server Launcher
# Questo script viene eseguito automaticamente facendo doppio clic su di esso in Finder.

# Trova la directory dello script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================="
echo "🎬 STOIKE - Avvio del Server Node.js..."
echo "============================================="

# 🔍 RILEVAMENTO ED INIZIALIZZAZIONE DI NODE.JS
# Aggiungi percorsi comuni al PATH (Homebrew, percorsi di default macOS, ecc.)
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Carica NVM se presente
if [ -d "$HOME/.nvm" ]; then
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi

# Carica FNM se presente
if [ -d "$HOME/.fnm" ]; then
    export PATH="$HOME/.fnm:$PATH"
    eval "$(fnm env)"
fi

# Carica Volta se presente
if [ -d "$HOME/.volta" ]; then
    export VOLTA_HOME="$HOME/.volta"
    export PATH="$VOLTA_HOME/bin:$PATH"
fi

# Funzione per verificare se node e npm sono disponibili
check_node() {
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

if ! check_node; then
    echo "⚠️  Node.js non rilevato nei percorsi di sistema."
    
    # Cartella locale per Node.js portatile
    PORTABLE_DIR="$DIR/.node_portable"
    
    if [ -d "$PORTABLE_DIR/bin" ]; then
        echo "🔄 Trovata installazione locale di Node.js. Caricamento..."
        export PATH="$PORTABLE_DIR/bin:$PATH"
    fi
    
    # Ricontrolla se ora è disponibile
    if ! check_node; then
        echo "📥 Download di una versione portatile di Node.js..."
        echo "Questo accade solo la prima volta se Node.js non è installato sul tuo Mac."
        
        # Rileva architettura (M1/M2/M3 vs Intel)
        ARCH=$(uname -m)
        if [ "$ARCH" = "arm64" ]; then
            NODE_ARCH="darwin-arm64"
            echo "💻 Architettura rilevata: Apple Silicon (M1/M2/M3/arm64)"
        else
            NODE_ARCH="darwin-x64"
            echo "💻 Architettura rilevata: Intel (x64)"
        fi
        
        NODE_VERSION="v20.12.2"
        DOWNLOAD_URL="https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${NODE_ARCH}.tar.gz"
        
        echo "⏳ Scaricamento di Node.js ${NODE_VERSION}..."
        mkdir -p "$PORTABLE_DIR"
        
        if command -v curl >/dev/null 2>&1; then
            curl -L "$DOWNLOAD_URL" -o "$PORTABLE_DIR/node.tar.gz"
        elif command -v wget >/dev/null 2>&1; then
            wget -qO "$PORTABLE_DIR/node.tar.gz" "$DOWNLOAD_URL"
        else
            echo "❌ Errore: Né 'curl' né 'wget' sono installati. Impossibile scaricare Node.js."
            echo "Si prega di installare Node.js manualmente da: https://nodejs.org/"
            echo "Premi un tasto qualsiasi per uscire..."
            read -n 1 -s -r
            exit 1
        fi
        
        echo "📦 Estrazione dei file..."
        tar -xzf "$PORTABLE_DIR/node.tar.gz" -C "$PORTABLE_DIR" --strip-components=1
        rm "$PORTABLE_DIR/node.tar.gz"
        
        # Rimuovi l'attributo di quarantena per evitare blocchi di sicurezza su macOS
        xattr -r -d com.apple.quarantine "$PORTABLE_DIR" 2>/dev/null
        
        export PATH="$PORTABLE_DIR/bin:$PATH"
        
        if check_node; then
            echo "✅ Node.js portatile installato con successo!"
        else
            echo "❌ Errore durante l'inizializzazione di Node.js portatile."
            echo "Premi un tasto qualsiasi per uscire..."
            read -n 1 -s -r
            exit 1
        fi
    fi
fi

# Controlla se le dipendenze sono installate
echo "1. Installazione/Verifica delle dipendenze..."
npm install

echo ""
echo "2. Avvio del server..."
echo "Il sito sarà disponibile all'indirizzo: http://localhost:5001"
echo "Per arrestare il server, premi CTRL+C in questa finestra."
echo "============================================="
echo ""

node server.js

