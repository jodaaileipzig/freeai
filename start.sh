#!/usr/bin/env bash
# FreeAI Studio - Startskript
set -e
cd "$(dirname "$0")/backend"

if [ ! -f .env ]; then
  echo "ℹ️  Keine .env gefunden – erstelle aus Vorlage..."
  cp .env.example .env
  echo "👉 Bitte trage deine kostenlosen API-Keys in backend/.env ein."
fi

echo "📦 Installiere Abhängigkeiten..."
pip install -q -r requirements.txt

PORT="${PORT:-5000}"
echo "🚀 Starte FreeAI Studio auf http://localhost:$PORT"
PORT="$PORT" python app.py
