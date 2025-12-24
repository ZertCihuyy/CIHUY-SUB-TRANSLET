const express = require("express");
const cors = require("cors");
const translate = require("google-translate-api-x");
const axios = require("axios");

const app = express();
app.use(cors());

// --- KONFIGURASI ---
const PORT = process.env.PORT || 3000;
const MAX_CHARS = 2000; // Kapasitas Chunk
const DELIMITER = " ||| ";
const SPLIT_REGEX = /\s*\|\|\|\s*/;
const MAX_LOG_SIZE = 100; // Batas simpan log

// --- GLOBAL VARIABLES (Untuk Statistik) ---
let requestLogs = [];
let totalTranslatedCount = 0;

// --- INFO SOSIAL MEDIA ---
const SOCIALS = {
    github: "https://github.com/ZertCihuyy",
    tiktok: "https://tiktok.com/@zertcihuy",
    support: "https://sociabuzz.com/zerty_/tribe",
    instagram: "https://instagram.com/zrertcihuy"
};

// --- HELPER FUNCTIONS ---
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const systemLog = (type, msg, details = null) => {
    const logEntry = {
        time: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        type: type,
        message: msg,
        details: details
    };
    // Masukkan ke array paling atas
    requestLogs.unshift(logEntry);
    // Hapus log lama jika kepenuhan
    if (requestLogs.length > MAX_LOG_SIZE) requestLogs.pop();
};

// --- ROUTE 1: FRONTEND (UI) ---
app.get("/", (req, res) => {
    // Daftar Bahasa (Termasuk Jawa)
    const langs = {
        "id": "Indonesia", 
        "jw": "Jawa", // FIXXED
        "su": "Sunda",
        "en": "Inggris", 
        "ms": "Melayu", 
        "ko": "Korea", 
        "ar": "Arab", 
        "es": "Spanyol", 
        "fr": "Prancis", 
        "de": "Jerman", 
        "ru": "Rusia", 
        "th": "Thailand", 
        "vi": "Vietnam"
    };
    
    let langOptions = Object.entries(langs).map(([code, name]) => 
        `<option value="${code}">${name}</option>`
    ).join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CIHUY-SUB | VTT Tools</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
        <style>
            body { 
                background: url('https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop') no-repeat center center fixed; 
                background-size: cover; margin: 0; min-height: 100vh; font-family: 'Segoe UI', sans-serif;
                display: flex; align-items: center; justify-content: center; color: #fff;
            }
            .overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: -1; }
            .box { 
                background: rgba(30, 30, 30, 0.6); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
                padding: 40px; border-radius: 20px; width: 90%; max-width: 480px; 
                border: 1px solid rgba(255, 255, 255, 0.1); text-align: center;
                box-shadow: 0 0 50px rgba(0, 242, 255, 0.1);
            }
            h2 { margin: 0; color: #fff; font-size: 2.5rem; letter-spacing: 1px; font-weight: 800; text-transform: uppercase; }
            h2 span { color: #00f2ff; }
            p { color: #aaa; margin-top: 5px; font-size: 0.95rem; }
            
            .input-wrapper { text-align: left; margin-top: 25px; }
            label { font-size: 0.85rem; color: #ddd; font-weight: 600; margin-left: 5px; }
            
            input, select { 
                width: 100%; padding: 14px; margin-top: 8px; background: rgba(0,0,0,0.3); 
                border: 1px solid #444; color: #fff; border-radius: 12px; box-sizing: border-box; 
                font-size: 1rem; transition: 0.3s;
            }
            input:focus, select:focus { border-color: #00f2ff; outline: none; background: rgba(0,0,0,0.5); }
            
            button { 
                width: 100%; padding: 16px; margin-top: 25px;
                background: linear-gradient(135deg, #00f2ff, #00a8ff); 
                color: #000; font-weight: bold; cursor: pointer; border: none; 
                border-radius: 12px; font-size: 1.1rem; transition: 0.2s; 
                box-shadow: 0 5px 15px rgba(0, 242, 255, 0.2);
            }
            button:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 242, 255, 0.4); }
            
            .footer { margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }
            .credits { font-size: 0.75rem; color: #666; line-height: 1.6; }
            .credits b { color: #888; }

            .socials { margin-top: 15px; display: flex; justify-content: center; gap: 15px; }
            .socials a { color: #888; font-size: 1.3rem; transition: 0.3s; }
            .socials a:hover { color: #00f2ff; transform: scale(1.1); }
        </style>
    </head>
    <body>
        <div class="overlay"></div>
        <div class="box">
            <h2>CIHUY<span>-SUB</span></h2>
            <p>Jagonya Translate Subtitle Ngebut ⚡</p>
            
            <div class="input-wrapper">
                <label>Link File VTT</label>
                <input type="text" id="urlInput" placeholder="Tempel link VTT di sini...">
            </div>

            <div class="input-wrapper">
                <label>Mau Bahasa Apa?</label>
                <select id="langInput">${langOptions}</select>
            </div>

            <button onclick="start()">GAS TERJEMAHKAN 🚀</button>

            <div class="footer">
                <div class="credits">
                    Powered by <b>google-translate-api-x</b><br>
                    Developed by <b style="color:#00f2ff">ZertCihuy</b>
                </div>
                <div class="socials">
                    <a href="${SOCIALS.github}" target="_blank"><i class="fab fa-github"></i></a>
                    <a href="${SOCIALS.tiktok}" target="_blank"><i class="fab fa-tiktok"></i></a>
                    <a href="${SOCIALS.instagram}" target="_blank"><i class="fab fa-instagram"></i></a>
                    <a href="${SOCIALS.support}" target="_blank"><i class="fas fa-coffee"></i></a>
                </div>
            </div>
        </div>
        <script>
            function start() {
                const url = document.getElementById('urlInput').value.trim();
                const lang = document.getElementById('langInput').value;
                if(!url) return alert("Eits, link VTT-nya belum diisi bang!");
                
                // Langsung gas redirect
                window.location.href = \`/get-vtt?url=\${encodeURIComponent(url)}&lang=\${lang}\`;
            }
        </script>
    </body>
    </html>`;
    res.send(htmlContent);
});

// --- ROUTE KHUSUS (SESUAI REQUEST) ---

// 1. /log -> Melihat riwayat request
app.get("/log", (req, res) => {
    res.json({
        total_logs: requestLogs.length,
        logs: requestLogs
    });
});

// 2. /status -> Cek kesehatan server
app.get("/status", (req, res) => {
    const mem = process.memoryUsage();
    res.json({
        status: "Online 🟢",
        uptime: Math.floor(process.uptime()) + " detik",
        memory_usage: Math.round(mem.rss / 1024 / 1024) + " MB",
        timestamp: new Date().toISOString()
    });
});

// 3. /Jumlah-terjema -> Total request yang sukses
app.get("/jumlah-terjemah", (req, res) => {
    res.json({
        total_terjemahan_sukses: totalTranslatedCount
    });
});
// Alias jika user typo sesuai request
app.get("/Jumlah-terjema", (req, res) => {
    res.json({ total_terjemahan_sukses: totalTranslatedCount });
});

// 4. /power -> Nama Paket
app.get("/power", (req, res) => {
    res.send("google-translate-api-x");
});

// 5. /developer -> Nama Developer
app.get("/developer", (req, res) => {
    res.send("ZertCihuy");
});


// --- ROUTE 2: BACKEND PROCESSOR (Main VTT Logic) ---
app.get("/get-vtt", async (req, res) => {
    const { url, lang = "id" } = req.query;

    if (!url) return res.status(400).send("Waduh, parameter URL-nya ketinggalan!");

    // Catat Log
    systemLog("INFO", "New Request", { url, lang });

    // Setup Header untuk Streaming Text
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Transfer-Encoding", "chunked");

    try {
        // 1. Fetch Full Content
        const response = await axios.get(url, { 
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 30000 
        });

        const lines = response.data.split(/\r?\n/);
        
        // --- LOGIKA CHUNKING ---
        let chunks = [];
        let currentChunkText = "";
        let currentChunkIndices = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Cek apakah ini dialog (bukan timestamp/header)
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
        // Push sisa chunk terakhir
        if (currentChunkText) {
            chunks.push({ text: currentChunkText, indices: [...currentChunkIndices] });
        }

        // --- PROSES TRANSLATE & STREAMING ---
        let lastPrintedIndex = -1;

        // Kirim Header VTT dulu
        for(let i=0; i<lines.length; i++) {
            if(lines[i].startsWith("WEBVTT") || lines[i].startsWith("NOTE")) {
                res.write(lines[i] + "\n");
                lastPrintedIndex = i;
            } else {
                break; // Stop pas ketemu timestamp
            }
        }

        // Loop Translate per Chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            try {
                // Translate
                const resG = await translate(chunk.text, { to: lang });
                const translatedParts = resG.text.split(SPLIT_REGEX);

                // Update array baris asli
                if (translatedParts.length === chunk.indices.length) {
                    translatedParts.forEach((text, idx) => {
                        lines[chunk.indices[idx]] = text.trim();
                    });
                }
            } catch (err) {
                systemLog("WARN", "Translate Fail", { msg: err.message });
            }

            // --- FLUSH KE BROWSER ---
            const maxIndexInChunk = chunk.indices[chunk.indices.length - 1];
            
            for (let k = lastPrintedIndex + 1; k <= maxIndexInChunk; k++) {
                if (lines[k] !== undefined) {
                    res.write(lines[k] + "\n");
                }
            }
            lastPrintedIndex = maxIndexInChunk;

            // Delay biar smooth & aman
            const randomDelay = Math.floor(Math.random() * 500) + 200;
            await delay(randomDelay);
        }

        // Kirim sisa baris footer (kalo ada)
        for (let k = lastPrintedIndex + 1; k < lines.length; k++) {
            if (lines[k] !== undefined) res.write(lines[k] + "\n");
        }

        // Sukses, tambah counter
        totalTranslatedCount++;
        systemLog("SUCCESS", "Done", { lang });
        res.end(); 

    } catch (error) {
        systemLog("ERROR", "Fatal", { msg: error.message });
        res.write("\n\nERROR: Gagal memproses, cek URL-nya bang. " + error.message);
        res.end();
    }
});

app.listen(PORT, () => {
    // Membersihkan layar terminal
    process.stdout.write('\x1Bc'); 
    console.log(`run in port ${PORT}`);
});

module.exports = app;