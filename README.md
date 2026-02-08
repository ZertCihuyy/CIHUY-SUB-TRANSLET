

---

# 🌐 CIHUY-SUB-TRANSLET

> **Automated VTT Subtitle Translator Server**

**[English](https://www.google.com/search?q=%23-english-version)** | **[Bahasa Indonesia](https://www.google.com/search?q=%23-versi-bahasa-indonesia)**

---

## 🇺🇸 English Version

CIHUY-SUB-TRANSLET is a **Node.js + Express** powered server designed to automatically translate **VTT** subtitles using the **google-translate-api-x** engine. It features a smart chunking system and real-time streaming to ensure fast, reliable translation without breaking timestamps.

### ✨ Key Features

* **Auto-Translate:** Seamless VTT subtitle conversion.
* **Real-time Streaming:** Watch the translation results as they process.
* **Smart Chunking:** Bypasses Google Translate limits by splitting text intelligently.
* **Timestamp Integrity:** Ensures subtitle timing remains 100% accurate.
* **Monitoring:** Built-in server stats, uptime, and request logging.
* **Built-in UI:** Access the translation tool directly via your browser.

### 🛠 Tech Stack

* **Backend:** Node.js, Express.js
* **Request:** Axios, CORS
* **Engine:** `google-translate-api-x`
* **Frontend:** Vanilla HTML + CSS (Inline)

### 🚀 Getting Started

1. **Install Dependencies**
```bash
npm install express cors axios google-translate-api-x

```


2. **Run the Server**
```bash
node server.js

```


3. **Access Web UI**
Open `http://localhost:3000` in your browser.

---

## 🇮🇩 Versi Bahasa Indonesia

CIHUY-SUB-TRANSLET adalah server berbasis **Node.js + Express** yang digunakan untuk menerjemahkan subtitle **VTT** secara otomatis menggunakan **google-translate-api-x**. Dilengkapi dengan sistem **chunking** dan **streaming real-time** ke browser untuk menjamin kecepatan tanpa merusak timestamp.

### ✨ Fitur Utama

* 🔥 **Translate Otomatis:** Konversi VTT instan.
* ⚡ **Streaming Real-time:** Hasil terjemahan muncul langsung saat diproses.
* 🧩 **Sistem Chunking:** Aman dari limit (rate-limit) Google Translate.
* 🕒 **Presisi Timestamp:** Waktu subtitle tetap utuh dan akurat.
* 📊 **Monitoring:** Statistik server, uptime, dan log request tersedia.
* 🌐 **Web UI:** Antarmuka web langsung siap pakai dari server.

---

## ⚙️ Configuration & API Reference

### Server Config

```javascript
PORT = 3000          // Default Server Port
MAX_CHARS = 2000     // Characters per chunk
DELIMITER = " ||| "  // Translation separator
MAX_LOG_SIZE = 100   // History limit

```

### 🛣 API Endpoints

| Endpoint | Method | Description |
| --- | --- | --- |
| `/get-vtt` | `GET` | **Main Engine.** Params: `url` (VTT link) & `lang` (target). |
| `/status` | `GET` | Check server health, uptime, and memory. |
| `/log` | `GET` | View the last 100 request activities. |
| `/jumlah-terjemah` | `GET` | Get total successful translation count. |
| `/developer` | `GET` | Developer information. |

### 🌍 Supported Languages

Indonesian (`id`), Javanese (`jw`), Sundanese (`su`), English (`en`), Malay (`ms`), Korean (`ko`), Arabic (`ar`), Spanish (`es`), French (`fr`), German (`de`), Russian (`ru`), Thai (`th`), Vietnamese (`vi`).

---

## 🧠 Workflow Logic

1. **Fetch:** Downloads VTT via Axios.
2. **Filter:** Separates timestamps from dialogue.
3. **Chunk:** Groups text (max 2000 chars) for API efficiency.
4. **Translate:** Processes chunks via `google-translate-api-x`.
5. **Re-sync:** Matches translated text back to original timestamps.
6. **Stream:** Pushes data to browser with a random delay (200–700ms) to mimic natural flow.

---

## ⚠️ Limitations & Security

* **Privacy:** No subtitles are stored on the server.
* **Auth:** No authentication (public access).
* **Dependency:** Highly dependent on Google Translate's availability.
* **Scale:** Best for personal tools or community projects, not high-traffic commercial use.

---

## 🧑‍💻 Developer & Support

* **Lead Dev:** ZertCihuy
* **GitHub:** [ZertCihuyy](https://github.com/ZertCihuyy)
* **Support:** [SociaBuzz Tribe](https://sociabuzz.com/zerty_/tribe)

---

**Would you like me to help you write the code for the `/status` or `/log` endpoint to make it even more robust?**
