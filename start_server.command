#!/bin/bash
# Stoike - Start Server Launcher
# Questo script viene eseguito automaticamente facendo doppio clic su di esso in Finder.

# Trova la directory dello script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================="
echo "🎬 STOIKE - Avvio del Server Node.js..."
echo "============================================="

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

