// ================= FreeAI Studio Frontend =================
const API = ""; // gleicher Origin

let CONFIG = { providers: {}, chat_models: {}, image_models: {} };
let chatHistory = [];

const $ = (id) => document.getElementById(id);

// ---------------- Init ----------------
async function init() {
  await loadConfig();
  setupNav();
  setupChat();
  setupImage();
  setupTextTools();
  setupSpeech();
  setupTTS();
  setupSettings();
  setupTheme();
  setupMobile();
}

async function loadConfig() {
  try {
    const res = await fetch(`${API}/api/config`);
    CONFIG = await res.json();
  } catch (e) {
    console.error("Config konnte nicht geladen werden", e);
  }
  populateModelSelectors();
}

function flatChatModels() {
  const out = [];
  for (const [prov, models] of Object.entries(CONFIG.chat_models || {})) {
    for (const m of models) out.push({ provider: prov, id: m.id, name: m.name });
  }
  return out;
}

function populateModelSelectors() {
  const chatModels = flatChatModels();
  const chatSel = $("chatModel");
  const textSel = $("textModel");
  [chatSel, textSel].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    if (chatModels.length === 0) {
      sel.innerHTML = `<option value="">Kein Chat-Anbieter konfiguriert</option>`;
      return;
    }
    chatModels.forEach((m) => {
      const o = document.createElement("option");
      o.value = `${m.provider}|${m.id}`;
      o.textContent = m.name;
      sel.appendChild(o);
    });
  });

  // Bild-Modelle
  const imgSel = $("imageModel");
  if (imgSel) {
    imgSel.innerHTML = "";
    const imgModels = [];
    for (const [prov, models] of Object.entries(CONFIG.image_models || {}))
      for (const m of models) imgModels.push({ provider: prov, id: m.id, name: m.name });
    if (imgModels.length === 0) {
      imgSel.innerHTML = `<option value="">Kein Bild-Anbieter (Hugging Face) konfiguriert</option>`;
    } else {
      imgModels.forEach((m) => {
        const o = document.createElement("option");
        o.value = m.id;
        o.textContent = m.name;
        imgSel.appendChild(o);
      });
    }
  }
}

// ---------------- Navigation ----------------
const TITLES = {
  chat: "💬 Chatbot", image: "🖼️ Bildgenerierung",
  text: "📝 Text-Tools", speech: "🎤 Sprache → Text", tts: "🔊 Text → Sprache",
};
function setupNav() {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const view = item.dataset.view;
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      $(`view-${view}`).classList.add("active");
      $("viewTitle").textContent = TITLES[view];
      // Modell-Picker oben nur im Chat zeigen
      $("modelPickerWrap").style.display = view === "chat" ? "flex" : "none";
      $("sidebar").classList.remove("open");
    });
  });
}

// ---------------- Chat ----------------
function setupChat() {
  const input = $("chatInput");
  const send = $("chatSend");
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
  send.addEventListener("click", sendChat);
}

function addMsg(role, text) {
  const empty = $("chatEmpty");
  if (empty) empty.remove();
  const wrap = document.createElement("div");
  wrap.className = `msg ${role}`;
  wrap.innerHTML = `
    <div class="avatar">${role === "user" ? "🧑" : "🤖"}</div>
    <div class="bubble"></div>`;
  wrap.querySelector(".bubble").textContent = text;
  $("chatMessages").appendChild(wrap);
  $("chatMessages").scrollTop = $("chatMessages").scrollHeight;
  return wrap.querySelector(".bubble");
}

async function sendChat() {
  const input = $("chatInput");
  const text = input.value.trim();
  const modelVal = $("chatModel").value;
  if (!text) return;
  if (!modelVal) { addMsg("bot", "⚠️ Kein Chat-Anbieter konfiguriert. Öffne die Einstellungen und trage einen API-Key ein."); return; }
  const [provider, model] = modelVal.split("|");

  addMsg("user", text);
  chatHistory.push({ role: "user", content: text });
  input.value = ""; input.style.height = "auto";

  const bubble = addMsg("bot", "…");
  $("chatSend").disabled = true;
  try {
    const res = await fetch(`${API}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, model, messages: chatHistory, temperature: 0.7 }),
    });
    const data = await res.json();
    if (data.error) { bubble.textContent = "⚠️ " + data.error; }
    else {
      bubble.textContent = data.reply;
      chatHistory.push({ role: "assistant", content: data.reply });
    }
  } catch (e) {
    bubble.textContent = "⚠️ Verbindungsfehler: " + e.message;
  } finally {
    $("chatSend").disabled = false;
  }
}

// ---------------- Bildgenerierung ----------------
function setupImage() {
  $("imageBtn").addEventListener("click", async () => {
    const model = $("imageModel").value;
    const prompt = $("imagePrompt").value.trim();
    const banner = $("imageBanner");
    banner.classList.remove("show");
    if (!model) { showBanner(banner, "Kein Hugging-Face-Token konfiguriert. Bitte in .env eintragen."); return; }
    if (!prompt) { showBanner(banner, "Bitte einen Bild-Prompt eingeben."); return; }
    const btn = $("imageBtn");
    setLoading(btn, true, "Erzeuge…");
    $("imageResult").style.display = "none";
    try {
      const res = await fetch(`${API}/api/image`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt }),
      });
      const data = await res.json();
      if (data.error) showBanner(banner, data.error);
      else { const img = $("imageResult"); img.src = data.image; img.style.display = "block"; }
    } catch (e) { showBanner(banner, "Verbindungsfehler: " + e.message); }
    finally { setLoading(btn, false, "✨ Bild erzeugen"); }
  });
}

// ---------------- Text-Tools ----------------
let textMode = "summary";
function setupTextTools() {
  document.querySelectorAll("#textMode button").forEach((b) => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#textMode button").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      textMode = b.dataset.mode;
      $("langWrap").style.display = textMode === "translate" ? "block" : "none";
    });
  });
  $("textBtn").addEventListener("click", async () => {
    const modelVal = $("textModel").value;
    const text = $("textInput").value.trim();
    const banner = $("textBanner");
    banner.classList.remove("show");
    if (!modelVal) { showBanner(banner, "Kein Chat-Anbieter konfiguriert."); return; }
    if (!text) { showBanner(banner, "Bitte Text eingeben."); return; }
    const [provider, model] = modelVal.split("|");
    const btn = $("textBtn");
    setLoading(btn, true, "Verarbeite…");
    const box = $("textResult"); box.classList.remove("show");
    try {
      const res = await fetch(`${API}/api/text-tool`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, model, text, mode: textMode, target_lang: $("targetLang").value }),
      });
      const data = await res.json();
      if (data.error) showBanner(banner, data.error);
      else { box.textContent = data.result; box.classList.add("show"); }
    } catch (e) { showBanner(banner, "Verbindungsfehler: " + e.message); }
    finally { setLoading(btn, false, "⚡ Ausführen"); }
  });
}

// ---------------- Sprache → Text ----------------
let mediaRecorder = null, chunks = [], recording = false;
function setupSpeech() {
  $("recBtn").addEventListener("click", async () => {
    if (recording) { stopRecording(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      chunks = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => uploadAudio(stream);
      mediaRecorder.start();
      recording = true;
      $("recBtn").classList.add("recording");
      $("recBtn").textContent = "⏹️";
      $("recStatus").textContent = "Aufnahme läuft… (klicken zum Stoppen)";
    } catch (e) {
      showBanner($("speechBanner"), "Mikrofonzugriff verweigert: " + e.message);
    }
  });
}
function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
  recording = false;
  $("recBtn").classList.remove("recording");
  $("recBtn").textContent = "🎙️";
  $("recStatus").textContent = "Transkribiere…";
}
async function uploadAudio(stream) {
  stream.getTracks().forEach((t) => t.stop());
  const blob = new Blob(chunks, { type: "audio/webm" });
  const fd = new FormData();
  fd.append("audio", blob, "audio.webm");
  const box = $("speechResult"); box.classList.remove("show");
  try {
    const res = await fetch(`${API}/api/transcribe`, { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) { showBanner($("speechBanner"), data.error); $("recStatus").textContent = "Klicke zum Aufnehmen"; }
    else { box.textContent = data.text || "(nichts erkannt)"; box.classList.add("show"); $("recStatus").textContent = "Fertig! Klicke für neue Aufnahme"; }
  } catch (e) {
    showBanner($("speechBanner"), "Verbindungsfehler: " + e.message);
    $("recStatus").textContent = "Klicke zum Aufnehmen";
  }
}

// ---------------- Text → Sprache (Browser) ----------------
function setupTTS() {
  const voiceSel = $("ttsVoice");
  function loadVoices() {
    const voices = speechSynthesis.getVoices();
    voiceSel.innerHTML = "";
    voices.forEach((v, i) => {
      const o = document.createElement("option");
      o.value = i; o.textContent = `${v.name} (${v.lang})`;
      voiceSel.appendChild(o);
    });
    // Deutsche Stimme bevorzugen
    const deIdx = voices.findIndex((v) => v.lang.startsWith("de"));
    if (deIdx >= 0) voiceSel.value = deIdx;
  }
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
  $("ttsBtn").addEventListener("click", () => {
    const text = $("ttsInput").value.trim();
    if (!text) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = speechSynthesis.getVoices();
    const idx = parseInt(voiceSel.value);
    if (voices[idx]) u.voice = voices[idx];
    speechSynthesis.speak(u);
  });
}

// ---------------- Settings ----------------
function setupSettings() {
  const modal = $("settingsModal");
  $("openSettings").addEventListener("click", () => { renderStatus(); modal.classList.add("show"); });
  $("closeSettings").addEventListener("click", () => modal.classList.remove("show"));
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.classList.remove("show"); });
}
function renderStatus() {
  const list = $("statusList");
  const labels = { groq: "Groq (Chat + Sprache)", openrouter: "OpenRouter (Chat)", gemini: "Google Gemini (Chat)", huggingface: "Hugging Face (Bilder)" };
  list.innerHTML = "";
  for (const [key, label] of Object.entries(labels)) {
    const on = CONFIG.providers && CONFIG.providers[key];
    const div = document.createElement("div");
    div.className = "status-item";
    div.innerHTML = `<span>${label}</span><span class="pill ${on ? "on" : "off"}">${on ? "Aktiv" : "Nicht konfiguriert"}</span>`;
    list.appendChild(div);
  }
}

// ---------------- Theme ----------------
function setupTheme() {
  const saved = localStorage.getItem("theme") || "dark";
  document.documentElement.setAttribute("data-theme", saved);
  $("themeToggle").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  });
}

// ---------------- Mobile ----------------
function setupMobile() {
  $("hamburger").addEventListener("click", () => $("sidebar").classList.toggle("open"));
}

// ---------------- Utils ----------------
function showBanner(el, msg) { el.textContent = "⚠️ " + msg; el.classList.add("show"); }
function setLoading(btn, loading, text) {
  if (loading) { btn.disabled = true; btn.innerHTML = `<span class="spinner"></span> ${text}`; }
  else { btn.disabled = false; btn.innerHTML = `<span>${text}</span>`; }
}

document.addEventListener("DOMContentLoaded", init);
