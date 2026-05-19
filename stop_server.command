#!/bin/bash
# Stoike - Stop Server Launcher
# Questo script arresta tutti i server attivi di Stoike (Node.js o Python) con un doppio clic.

# Trova la directory dello script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "============================================="
echo "🛑 STOIKE - Arresto dei Server in corso..."
echo "============================================="

# 1. Arresta qualsiasi processo in ascolto sulla porta 5001 (Node.js di default)
echo "1. Ricerca processi sulla porta 5001..."
PID_NODE=$(lsof -t -i:5001 2>/dev/null)
if [ ! -z "$PID_NODE" ]; then
    echo "Processo Node.js trovato (PID: $PID_NODE). Arresto in corso..."
    kill -9 $PID_NODE 2>/dev/null
    echo "✅ Server su porta 5001 terminato."
else
    # Prova con pkill per sicurezza se avviato in altri modi
    pkill -f "node server.js" 2>/dev/null
    echo "ℹ️ Nessun processo attivo sulla porta 5001."
fi

# 2. Arresta eventuali server Python (porta 5000 o script server.py)
echo ""
echo "2. Ricerca processi Python (server.py)..."
PID_PY_5000=$(lsof -t -i:5000 2>/dev/null)
if [ ! -z "$PID_PY_5000" ]; then
    echo "Processo Python trovato su porta 5000. Arresto in corso..."
    kill -9 $PID_PY_5000 2>/dev/null
fi

pkill -f "server.py" 2>/dev/null
echo "✅ Tutti i processi 'server.py' arrestati."

echo ""
echo "============================================="
echo "🎉 Tutti i server Stoike sono stati arrestati!"
echo "============================================="
echo "Questa finestra si chiuderà tra 3 secondi..."
sleep 3
