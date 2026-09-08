# 🤖 FreeAI Studio

Eine moderne, vielseitige **KI-Web-App**, die ausschließlich **kostenlose Modelle** nutzt. Alles in einer schönen Oberfläche vereint: Chatbot, Bildgenerierung, Text-Zusammenfassung, Übersetzung und Sprachfunktionen.

![Made with](https://img.shields.io/badge/Backend-Flask-blue) ![Free](https://img.shields.io/badge/Modelle-100%25%20kostenlos-brightgreen)

---

## ✨ Funktionen

| Tool | Beschreibung | Anbieter (kostenlos) |
|------|--------------|----------------------|
| 💬 **Chatbot** | Unterhaltung, Fragen beantworten, Code-Hilfe | Groq, OpenRouter, Google Gemini |
| 🖼️ **Bildgenerierung** | Bilder aus Text erzeugen (FLUX, Stable Diffusion) | Hugging Face |
| 📝 **Text-Tools** | Texte zusammenfassen & in jede Sprache übersetzen | Groq, OpenRouter, Gemini |
| 🎤 **Sprache → Text** | Sprachaufnahme transkribieren (Whisper) | Groq |
| 🔊 **Text → Sprache** | Text vorlesen lassen | Browser (offline, gratis) |

Weitere Highlights:
- 🌙 Dark- & Light-Mode
- 📱 Responsive (Desktop & Mobil)
- 🔀 Freie Anbieter- und Modellauswahl
- 🛡️ Läuft auch, wenn nur *ein* API-Key gesetzt ist

---

## 🚀 Schnellstart

### 1. Abhängigkeiten installieren
```bash
cd backend
pip install -r requirements.txt
```

### 2. Kostenlose API-Schlüssel holen
Du brauchst **nicht alle** – nur die Anbieter, die du nutzen willst:

| Anbieter | Was du damit bekommst | Kostenlosen Key holen |
|----------|----------------------|-----------------------|
| **Groq** | Schnelle Chats + Sprache→Text | https://console.groq.com/keys |
| **OpenRouter** | Viele kostenlose Chat-Modelle | https://openrouter.ai/keys |
| **Google Gemini** | Gemini-Modelle | https://aistudio.google.com/app/apikey |
| **Hugging Face** | Bildgenerierung | https://huggingface.co/settings/tokens |

> 💡 **Tipp:** Für den schnellsten Start reicht ein **Groq**-Key (Chat + Sprache) und ein **Hugging-Face**-Token (Bilder).

### 3. Schlüssel eintragen
```bash
cp .env.example .env
# .env öffnen und deine Keys eintragen
```

### 4. Server starten
```bash
python app.py
# oder auf einem anderen Port:
PORT=5050 python app.py
```

### 5. Öffnen
Im Browser aufrufen: **http://localhost:5000** (bzw. der gewählte Port).

---

## 📁 Projektstruktur
```
freeai-studio/
├── backend/
│   ├── app.py              # Flask-Server & API-Endpoints
│   ├── providers.py        # Anbindung an die KI-Anbieter
│   ├── requirements.txt
│   └── .env.example        # Vorlage für API-Keys
├── frontend/
│   ├── index.html          # Oberfläche
│   └── static/
│       ├── css/style.css   # Design
│       └── js/app.js        # Logik
└── README.md
```

---

## 🔧 So funktioniert es
Das Flask-Backend stellt einfache API-Endpoints bereit (`/api/chat`, `/api/image`, `/api/text-tool`, `/api/transcribe`), die die kostenlosen Anbieter ansprechen. Das Frontend erkennt automatisch über `/api/config`, welche Anbieter du konfiguriert hast, und zeigt nur die verfügbaren Modelle an. Fehlt ein Key, gibt die App einen freundlichen Hinweis statt eines Absturzes.

## ❓ Häufige Fragen
- **Kostet das etwas?** Nein. Alle genutzten Modelle/Anbieter haben ein kostenloses Kontingent.
- **Muss ich alle Keys eintragen?** Nein, nur die Anbieter, die du nutzen willst.
- **„Modell lädt gerade (kalt)" bei Bildern?** Hugging-Face-Modelle brauchen beim ersten Aufruf ~20 Sek. Warten – einfach erneut versuchen.

---

Viel Spaß mit **FreeAI Studio**! 🎉
