const express = require("express");
const cors = require("cors");
const translate = require("google-translate-api-x");
const axios = require("axios");

const app = express();
app.use(cors());

// --- KONFIGURASI ---
const PORT = process.env.PORT || 3000;
const MAX_CHARS = 1700; // Dikurangi sedikit untuk safety margin
const DELIMITER = " ||| ";
const SPLIT_REGEX = /\s*\|\|\|\s*/;
const MAX_LOG_SIZE = 100;

// --- USER & SOCIAL INFO (Ubah Di Sini) ---
const SOCIALS = {
    github: "https://github.com/ZertCihuyy",
    tiktok: "https://tiktok.com/@zertcihuy",
    support: "https://sociabuzz.com/zerty_/tribe", // Atau Saweria/Ko-fi
    instagram: "https://instagram.com/zrertcihuy"
};

// In-Memory Storage
let requestLogs = [];

// Daftar Bahasa
const LANGUAGES = {
  "id": "Indonesian", "en": "English", "ja": "Japanese", "ko": "Korean",
  "ms": "Malay", "zh-CN": "Chinese (S)", "ar": "Arabic", "es": "Spanish",
  "fr": "French", "ru": "Russian", "de": "German", "th": "Thai", "vi": "Vietnamese"
};

// --- SYSTEM LOGGER ---
const systemLog = (type, msg, details = null) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: type,
        message: msg,
        details: details
    };
    requestLogs.unshift(logEntry);
    if (requestLogs.length > MAX_LOG_SIZE) requestLogs.pop();
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- ROUTE 1: FRONTEND (UI BARU) ---
app.get("/", (req, res) => {
    let langOptions = Object.entries(LANGUAGES).map(([code, name]) => 
        `<option value="${code}" ${code === 'id' ? 'selected' : ''}>${name} (${code})</option>`
    ).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>VTT Subtitle Translator</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            :root { --primary: #00f2ff; --bg: #050505; --card: #111; --text: #fff; }
            body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', sans-serif; margin: 0; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            
            .container { background: rgba(20, 20, 20, 0.9); backdrop-filter: blur(10px); padding: 2rem; border: 1px solid #333; border-radius: 15px; width: 90%; max-width: 700px; box-shadow: 0 0 20px rgba(0, 242, 255, 0.1); }
            
            h2 { text-align: center; margin-bottom: 5px; color: var(--primary); text-transform: uppercase; letter-spacing: 2px; }
            p.subtitle { text-align: center; color: #888; margin-bottom: 2rem; font-size: 0.9rem; }
            
            .input-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9rem; color: #ccc; }
            input, select { width: 100%; padding: 12px; background: #222; border: 1px solid #444; color: #fff; border-radius: 8px; box-sizing: border-box; outline: none; transition: 0.3s; }
            input:focus, select:focus { border-color: var(--primary); box-shadow: 0 0 5px rgba(0, 242, 255, 0.3); }
            
            button { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; font-size: 1rem; }
            .btn-primary { background: var(--primary); color: #000; margin-top: 10px; }
            .btn-primary:hover { background: #00c8d4; transform: translateY(-2px); }
            .btn-secondary { background: #333; color: #fff; margin-top: 10px; display: inline-block; width: 48%; }
            .btn-secondary:hover { background: #444; }

            /* Output Area */
            .output-area { margin-top: 20px; display: none; border-top: 1px solid #333; padding-top: 20px; }
            textarea { width: 100%; height: 250px; background: #000; border: 1px solid #333; color: #0f0; padding: 10px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 0.85rem; resize: vertical; box-sizing: border-box; }
            
            /* Footer Socials */
            .footer { margin-top: 30px; text-align: center; padding-top: 20px; border-top: 1px solid #222; }
            .social-links { margin-top: 10px; display: flex; justify-content: center; gap: 15px; }
            .social-links a { color: #888; font-size: 1.5rem; transition: 0.3s; text-decoration: none; }
            .social-links a:hover { color: var(--primary); transform: scale(1.1); }
            
            /* Loading Spinner */
            .loader { display: none; margin: 10px auto; border: 4px solid #333; border-top: 4px solid var(--primary); border-radius: 50%; width: 20px; height: 20px; animation: spin 1s linear infinite; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body>

        <div class="container">
            <h2><i class="fas fa-language"></i> VTT Translator</h2>
            <p class="subtitle">AI Powered Subtitle Translation Engine</p>

            <div class="input-group">
                <label>VTT File URL</label>
                <input type="text" id="urlInput" placeholder="https://example.com/sub.vtt">
            </div>

            <div class="input-group">
                <label>Target Language</label>
                <select id="langInput">${langOptions}</select>
            </div>

            <button class="btn-primary" id="processBtn" onclick="processTranslation()">
                <span id="btnText">TRANSLATE NOW</span>
                <div class="loader" id="btnLoader"></div>
            </button>

            <div class="output-area" id="outputArea">
                <label>Result Preview</label>
                <textarea id="resultBox" readonly placeholder="Translation will appear here..."></textarea>
                <div style="display: flex; justify-content: space-between; margin-top: 10px;">
                    <button class="btn-secondary" onclick="copyText()"><i class="fas fa-copy"></i> Copy Text</button>
                    <button class="btn-secondary" onclick="downloadText()"><i class="fas fa-download"></i> Download .vtt</button>
                </div>
            </div>

            <div class="footer">
                <small>Developed by <b>ZertCihuy</b></small>
                <div class="social-links">
                    <a href="${SOCIALS.github}" target="_blank" title="GitHub"><i class="fab fa-github"></i></a>
                    <a href="${SOCIALS.instagram}" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="${SOCIALS.tiktok}" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>
                    <a href="${SOCIALS.support}" target="_blank" title="Support Me"><i class="fas fa-coffee"></i></a>
                </div>
            </div>
        </div>

        <script>
            let currentLang = 'en';

            async function processTranslation() {
                const url = document.getElementById('urlInput').value.trim();
                const lang = document.getElementById('langInput').value;
                currentLang = lang;

                if(!url) return alert("Please enter a valid VTT URL");

                // UI State: Loading
                const btn = document.getElementById('processBtn');
                const btnText = document.getElementById('btnText');
                const loader = document.getElementById('btnLoader');
                const outputArea = document.getElementById('outputArea');
                
                btn.disabled = true;
                btnText.style.display = 'none';
                loader.style.display = 'block';
                outputArea.style.display = 'none';

                try {
                    // Fetch ke server kita (bukan open window baru)
                    const response = await fetch(\`/get-vtt?url=\${encodeURIComponent(url)}&lang=\${lang}\`);
                    const data = await response.json();

                    if (!data.success) throw new Error(data.message || "Failed to translate");

                    // Tampilkan Hasil
                    document.getElementById('resultBox').value = data.content;
                    outputArea.style.display = 'block';
                    
                } catch (err) {
                    alert("Error: " + err.message);
                } finally {
                    // Reset UI
                    btn.disabled = false;
                    btnText.style.display = 'inline';
                    loader.style.display = 'none';
                }
            }

            function copyText() {
                const copyText = document.getElementById("resultBox");
                copyText.select();
                copyText.setSelectionRange(0, 99999); 
                navigator.clipboard.writeText(copyText.value);
                alert("Copied to clipboard!");
            }

            function downloadText() {
                const text = document.getElementById("resultBox").value;
                const blob = new Blob([text], { type: "text/vtt" });
                const anchor = document.createElement("a");
                anchor.href = URL.createObjectURL(blob);
                anchor.download = \`translated_\${currentLang}.vtt\`;
                anchor.click();
                URL.revokeObjectURL(anchor.href);
            }
        </script>
    </body>
    </html>`;
    res.send(htmlContent);
});

// --- ROUTE 2: API PROCESSOR (Modifikasi: Return JSON, Bukan File Stream) ---
app.get("/get-vtt", async (req, res) => {
    const { url, lang = "en" } = req.query;
    const reqId = Date.now();

    if (!url) return res.status(400).json({ success: false, message: "URL Required" });

    systemLog("INFO", `Processing request`, { id: reqId, url, target: lang });

    try {
        // 1. Fetch File
        const response = await axios.get(url, { 
            timeout: 30000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        const lines = response.data.split(/\r?\n/);
        let chunks = [];
        let currentChunkText = "";
        let currentChunkIndices = [];

        // 2. Chunking Logic
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Deteksi dialog (Bukan timestamp, bukan nomor, bukan header)
            const isDialog = line && !line.startsWith("WEBVTT") && !line.includes("-->") && isNaN(line) && !line.startsWith("NOTE");

            if (isDialog) {
                if ((currentChunkText + DELIMITER + line).length > MAX_CHARS) {
                    chunks.push({ text: currentChunkText, indices: [...currentChunkIndices] });
                    currentChunkText = line;
                    currentChunkIndices = [i];
                } else {
                    currentChunkText += (currentChunkText ? DELIMITER : "") + line;
                    currentChunkIndices.push(i);
                }
            }
        }
        if (currentChunkText) chunks.push({ text: currentChunkText, indices: [...currentChunkIndices] });

        // 3. Translate Logic
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const resG = await translate(chunk.text, { to: lang });
                const translatedParts = resG.text.split(SPLIT_REGEX);

                if (translatedParts.length === chunk.indices.length) {
                    translatedParts.forEach((text, idx) => {
                        lines[chunk.indices[idx]] = text.trim(); // Replace baris asli dengan terjemahan
                    });
                }
            } catch (err) {
                systemLog("WARN", `Chunk translation failed`, { chunkIndex: i });
            }
            await delay(300); // Anti-ban delay
        }

        systemLog("SUCCESS", `Finished`, { id: reqId });

        // 4. Return JSON (Agar tidak auto download di browser)
        res.json({
            success: true,
            lang: lang,
            content: lines.join("\n")
        });

    } catch (error) {
        systemLog("ERROR", "Fatal Error", { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- ROUTE 3: STATUS ---
app.get("/status", (req, res) => {
    res.json({ status: "active", logs: requestLogs.length, mem: process.memoryUsage().rss });
});

app.listen(PORT, () => {
    process.stdout.write('\x1Bc'); 
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;