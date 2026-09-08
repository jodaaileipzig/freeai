"""
FreeAI Studio - Flask Backend
Eine All-in-One KI-Web-App, die kostenlose Modelle nutzt.
"""
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

import providers

load_dotenv()

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "..", "frontend")

app = Flask(__name__, static_folder=None)
CORS(app)


# ---------------------------------------------------------------
# Frontend ausliefern
# ---------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/static/<path:path>")
def static_files(path):
    return send_from_directory(os.path.join(FRONTEND_DIR, "static"), path)


# ---------------------------------------------------------------
# Konfiguration / verfügbare Anbieter & Modelle
# ---------------------------------------------------------------
@app.route("/api/config")
def config():
    avail = providers.available_providers()
    chat_models = {p: m for p, m in providers.CHAT_MODELS.items() if avail.get(p)}
    image_models = {p: m for p, m in providers.IMAGE_MODELS.items() if avail.get(p)}
    return jsonify({
        "providers": avail,
        "chat_models": chat_models,
        "image_models": image_models,
    })


# ---------------------------------------------------------------
# CHAT
# ---------------------------------------------------------------
@app.route("/api/chat", methods=["POST"])
def api_chat():
    data = request.get_json(force=True)
    provider = data.get("provider")
    model = data.get("model")
    messages = data.get("messages", [])
    temperature = float(data.get("temperature", 0.7))
    try:
        reply = providers.chat(provider, model, messages, temperature)
        return jsonify({"reply": reply})
    except providers.ProviderError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unerwarteter Fehler: {e}"}), 500


# ---------------------------------------------------------------
# BILDGENERIERUNG
# ---------------------------------------------------------------
@app.route("/api/image", methods=["POST"])
def api_image():
    data = request.get_json(force=True)
    model = data.get("model", "black-forest-labs/FLUX.1-schnell")
    prompt = data.get("prompt", "")
    if not prompt.strip():
        return jsonify({"error": "Bitte einen Bild-Prompt eingeben."}), 400
    try:
        image = providers.generate_image(model, prompt)
        return jsonify({"image": image})
    except providers.ProviderError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unerwarteter Fehler: {e}"}), 500


# ---------------------------------------------------------------
# ZUSAMMENFASSUNG / ÜBERSETZUNG
# ---------------------------------------------------------------
@app.route("/api/text-tool", methods=["POST"])
def api_text_tool():
    data = request.get_json(force=True)
    provider = data.get("provider")
    model = data.get("model")
    text = data.get("text", "")
    mode = data.get("mode", "summary")  # summary | translate
    target_lang = data.get("target_lang", "Deutsch")
    if not text.strip():
        return jsonify({"error": "Bitte Text eingeben."}), 400
    try:
        result = providers.summarize(provider, model, text, mode, target_lang)
        return jsonify({"result": result})
    except providers.ProviderError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unerwarteter Fehler: {e}"}), 500


# ---------------------------------------------------------------
# SPRACHE-ZU-TEXT
# ---------------------------------------------------------------
@app.route("/api/transcribe", methods=["POST"])
def api_transcribe():
    if "audio" not in request.files:
        return jsonify({"error": "Keine Audiodatei erhalten."}), 400
    f = request.files["audio"]
    try:
        text = providers.transcribe(f.read(), f.filename or "audio.webm")
        return jsonify({"text": text})
    except providers.ProviderError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Unerwarteter Fehler: {e}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n🚀 FreeAI Studio läuft auf http://0.0.0.0:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=False)
