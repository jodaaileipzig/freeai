"""
FreeAI Studio - Provider-Modul
Kapselt alle Aufrufe an die kostenlosen KI-Anbieter:
Groq, OpenRouter, Google Gemini, Hugging Face.
"""
import os
import base64
import requests

# ------------------------------------------------------------------
# Modell-Kataloge (kostenlose Modelle je Anbieter)
# ------------------------------------------------------------------
CHAT_MODELS = {
    "groq": [
        {"id": "llama-3.3-70b-versatile", "name": "Llama 3.3 70B (Groq)"},
        {"id": "llama-3.1-8b-instant", "name": "Llama 3.1 8B Instant (Groq)"},
        {"id": "gemma2-9b-it", "name": "Gemma 2 9B (Groq)"},
    ],
    "openrouter": [
        {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B (OpenRouter free)"},
        {"id": "google/gemini-2.0-flash-exp:free", "name": "Gemini 2.0 Flash (OpenRouter free)"},
        {"id": "deepseek/deepseek-chat-v3-0324:free", "name": "DeepSeek V3 (OpenRouter free)"},
        {"id": "qwen/qwen-2.5-72b-instruct:free", "name": "Qwen 2.5 72B (OpenRouter free)"},
    ],
    "gemini": [
        {"id": "gemini-2.0-flash", "name": "Gemini 2.0 Flash (Google)"},
        {"id": "gemini-1.5-flash", "name": "Gemini 1.5 Flash (Google)"},
    ],
}

IMAGE_MODELS = {
    "huggingface": [
        {"id": "black-forest-labs/FLUX.1-schnell", "name": "FLUX.1 Schnell (HF)"},
        {"id": "stabilityai/stable-diffusion-xl-base-1.0", "name": "Stable Diffusion XL (HF)"},
    ],
}


# ------------------------------------------------------------------
# Hilfsfunktionen
# ------------------------------------------------------------------
def _key(name):
    return os.environ.get(name, "").strip()


def available_providers():
    """Gibt zurück, welche Anbieter konfiguriert sind (Key vorhanden)."""
    return {
        "groq": bool(_key("GROQ_API_KEY")),
        "openrouter": bool(_key("OPENROUTER_API_KEY")),
        "gemini": bool(_key("GEMINI_API_KEY")),
        "huggingface": bool(_key("HF_API_KEY")),
    }


class ProviderError(Exception):
    pass


# ------------------------------------------------------------------
# CHAT
# ------------------------------------------------------------------
def chat(provider, model, messages, temperature=0.7):
    if provider == "groq":
        return _chat_openai_compatible(
            "https://api.groq.com/openai/v1/chat/completions",
            _key("GROQ_API_KEY"), model, messages, temperature)
    if provider == "openrouter":
        return _chat_openai_compatible(
            "https://openrouter.ai/api/v1/chat/completions",
            _key("OPENROUTER_API_KEY"), model, messages, temperature,
            extra_headers={"HTTP-Referer": "https://freeai.studio", "X-Title": "FreeAI Studio"})
    if provider == "gemini":
        return _chat_gemini(model, messages, temperature)
    raise ProviderError(f"Unbekannter Chat-Anbieter: {provider}")


def _chat_openai_compatible(url, api_key, model, messages, temperature, extra_headers=None):
    if not api_key:
        raise ProviderError("Kein API-Schlüssel für diesen Anbieter gesetzt.")
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if extra_headers:
        headers.update(extra_headers)
    payload = {"model": model, "messages": messages, "temperature": temperature}
    r = requests.post(url, headers=headers, json=payload, timeout=120)
    if r.status_code != 200:
        raise ProviderError(f"API-Fehler ({r.status_code}): {r.text[:400]}")
    data = r.json()
    return data["choices"][0]["message"]["content"]


def _chat_gemini(model, messages, temperature):
    api_key = _key("GEMINI_API_KEY")
    if not api_key:
        raise ProviderError("Kein Gemini-API-Schlüssel gesetzt.")
    # OpenAI-Format -> Gemini-Format konvertieren
    contents = []
    system_text = ""
    for m in messages:
        if m["role"] == "system":
            system_text += m["content"] + "\n"
            continue
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": m["content"]}]})
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {"contents": contents, "generationConfig": {"temperature": temperature}}
    if system_text:
        payload["systemInstruction"] = {"parts": [{"text": system_text.strip()}]}
    r = requests.post(url, json=payload, timeout=120)
    if r.status_code != 200:
        raise ProviderError(f"Gemini-Fehler ({r.status_code}): {r.text[:400]}")
    data = r.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise ProviderError(f"Unerwartete Gemini-Antwort: {str(data)[:400]}")


# ------------------------------------------------------------------
# BILDGENERIERUNG (Hugging Face)
# ------------------------------------------------------------------
def generate_image(model, prompt):
    api_key = _key("HF_API_KEY")
    if not api_key:
        raise ProviderError("Kein Hugging-Face-Token gesetzt.")
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {api_key}"}
    r = requests.post(url, headers=headers, json={"inputs": prompt}, timeout=180)
    if r.status_code == 503:
        raise ProviderError("Modell lädt gerade (kalt). Bitte in ~20 Sek. erneut versuchen.")
    if r.status_code != 200:
        raise ProviderError(f"HF-Fehler ({r.status_code}): {r.text[:300]}")
    b64 = base64.b64encode(r.content).decode("utf-8")
    return f"data:image/png;base64,{b64}"


# ------------------------------------------------------------------
# SPRACHE-ZU-TEXT (Whisper über Groq)
# ------------------------------------------------------------------
def transcribe(audio_bytes, filename="audio.webm"):
    api_key = _key("GROQ_API_KEY")
    if not api_key:
        raise ProviderError("Für Transkription wird ein Groq-Schlüssel benötigt.")
    url = "https://api.groq.com/openai/v1/audio/transcriptions"
    headers = {"Authorization": f"Bearer {api_key}"}
    files = {"file": (filename, audio_bytes)}
    data = {"model": "whisper-large-v3-turbo"}
    r = requests.post(url, headers=headers, files=files, data=data, timeout=180)
    if r.status_code != 200:
        raise ProviderError(f"Whisper-Fehler ({r.status_code}): {r.text[:300]}")
    return r.json().get("text", "")


# ------------------------------------------------------------------
# ZUSAMMENFASSUNG / ÜBERSETZUNG  (nutzt Chat-Modelle mit Prompts)
# ------------------------------------------------------------------
def summarize(provider, model, text, mode="summary", target_lang="Deutsch"):
    if mode == "translate":
        system = f"Du bist ein professioneller Übersetzer. Übersetze den Text präzise und natürlich nach {target_lang}. Gib NUR die Übersetzung zurück."
        user = text
    else:
        system = "Du bist ein Experte für prägnante Zusammenfassungen. Fasse den folgenden Text klar und strukturiert zusammen. Nutze Stichpunkte für die Kernaussagen."
        user = text
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    return chat(provider, model, messages, temperature=0.3)
