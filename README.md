# CIHUY SUB TRANSLET (OP VERSION)

![License: GPL v3](https://img.shields.io/badge/License-MIT-green.svg)

Versi **OP (Overpowered)** dari API Terjemahan Subtitle.
Semua "bloatware" (UI, Express, EJS, Cors, Axios, dan dependensi external lainnya) telah **DIBABAT HABIS**.

API ini beroperasi 100% "Bare-Metal" menggunakan Native `Fetch API` langsung ke backend translasi. 

> [!WARNING]
> **API ini sangat ringan dan cepat. Jika Anda mengirim request dalam jumlah massif (ribuan baris tanpa henti) dari IP yang sama (Localhost), IP Anda mungkin terkena Rate-Limit (Block sementara).**
> Solusi: Gunakan Cloudflare Workers (rekomendasi utama) karena request akan didistribusikan melalui ratusan IP Cloudflare!

## 🔥 Fitur Utama (OP Features)
- **Zero Dependencies**: Tidak butuh `google-translate-api-x` atau package npm apapun! (Ukuran super kecil).
- **Subtitle Array Preservation**: Jika Anda mengirim Array berisi baris-baris subtitle (seperti srt/vtt), susunan baris dan tag (`<i>`, `<b>`) akan lebih terjaga kerena diproses batch secara unik.
- **Support Cloudflare Workers**: Bisa dideploy langsung ke Cloudflare Workers hanya dengan *copy-paste* 1 file (`worker/index.js`).
- **Support Local/VPS**: Terdapat file `local.js` bawaan untuk Anda jalankan via Node.js secara instan tanpa framework.

---

## 🚀 1. Cara Menjalankan di Lokal (Localhost/VPS)

Pastikan Anda menggunakan Node.js v18 ke atas.
```bash
# Masuk ke folder proyek
cd CIHUY-SUB-TRANSLET

# Jalankan server
npm start
# ATAU
node local.js
```
Server akan menyala di `http://localhost:3000`.

---

## ☁️ 2. Cara Menjalankan di Cloudflare Workers (Tanpa Wrangler)

Kabar gembira, Anda tidak perlu menginstall Wrangler atau build tools apapun! File Worker sudah dirancang untuk langsung siap pakai (Copy-Paste).

1. Buka folder `src/` dan salin (copy) SELURUH isi dari file `index.js`.
2. Login ke [Dashboard Cloudflare](https://dash.cloudflare.com/) > **Workers & Pages**.
3. Klik **Create Application** > **Create Worker**.
4. Beri nama worker (misal: `cihuy-sub-api`).
5. Klik **Edit code**, Hapus semua kode bawaan, lalu **PASTE** kode dari `index.js` yang tadi disalin.
6. Klik **Deploy**! (Selesai).

---

## 💻 Dokumentasi Endpoint API

API ini tidak memiliki UI (Sesuai dengan standard OP Backend). Akses murni via HTTP Request.

### `POST /translate`

**1. Translate Text Biasa (String)**
```bash
curl -X POST http://localhost:3000/translate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world, this is OP", "to": "id"}'
```

**2. Translate Subtitle Batch (Array)**
*(Sangat disarankan untuk subtitle agar line tidak berantakan)*
```bash
curl -X POST http://localhost:3000/translate \
  -H "Content-Type: application/json" \
  -d '{
    "text": [
      "Hello!",
      "<i>How are you doing today?</i>",
      "Welcome to the show."
    ], 
    "to": "id"
  }'
```

**Response Format:**
```json
{
  "status": "success",
  "source_lang": "en",
  "target_lang": "id",
  "translated_data": [
    "Halo!",
    "<i>Bagaimana kabarmu hari ini?</i>",
    "Selamat datang di pertunjukan."
  ]
}
```

**Parameter Body:**
- `text` *(Wajib)* : Bisa berupa string kalimat tunggal, atau array string untuk banyak kalimat (batch/subtitle).
- `to` *(Opsional)* : Kode bahasa tujuan (contoh: `id` untuk Indonesia). Default: `en`.
- `from` *(Opsional)* : Kode bahasa asal. Biarkan `auto` jika ingin deteksi otomatis. Default: `auto`.

### `POST /translate-subtitle`
**(Fitur Spesial OP: Translate File Subtitle Utuh)**
Anda dapat mengirimkan isi file subtitle (VTT, SRT, atau ASS) secara utuh. API akan membongkar (parsing) file tersebut, menerjemahkan bagian dialognya secara *batch* agar sangat cepat, lalu merakitnya kembali ke format semula tanpa merusak *timestamp* atau baris konfigurasi!

**Contoh Request (VTT/SRT):**
```bash
curl -X POST http://localhost:3000/translate-subtitle \
  -H "Content-Type: application/json" \
  -d '{
    "type": "vtt",
    "content": "WEBVTT\n\n00:01.000 --> 00:04.000\nHello world!\n\n00:05.000 --> 00:09.000\nWelcome home.",
    "to": "id"
  }'
```

**Response:**
```json
{
  "status": "success",
  "translated_file": "WEBVTT\n\n00:01.000 --> 00:04.000\nHalo Dunia!\n\n00:05.000 --> 00:09.000\nSelamat datang di rumah."
}
```

*Tipe file yang didukung untuk `type`: `srt`, `vtt`, `ass`.*

### `GET /get-vtt`, `GET /get-srt`, `GET /get-ass`
**(Fitur Spesial OP: Proxy Translate URL Langsung)**
Jika Anda memiliki link subtitle mentah (misal dari server lain), Anda bisa menggunakan endpoint GET ini untuk langsung mendownload, menerjemahkan, dan mengembalikan file jadinya. Sangat cocok dipasang langsung ke Web Video Player!

**Contoh:**
```html
<track kind="subtitles" src="http://localhost:3000/get-vtt?url=https://domain.com/sub.vtt&to=id" srclang="id" label="Indonesia">
```

- Endpoint yang tersedia: `/get-vtt`, `/get-srt`, `/get-ass`
- Parameter Query: `url` (wajib), `to` (opsional, default: id), `from` (opsional, default: auto).
- Response: Raw Subtitle File (Bukan JSON).
