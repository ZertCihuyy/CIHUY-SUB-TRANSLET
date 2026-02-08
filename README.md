# CIHUY-SUB-TRANSLET

CIHUY-SUB-TRANSLET adalah server berbasis **Node.js + Express** yang digunakan untuk menerjemahkan subtitle **VTT** secara otomatis menggunakan **google-translate-api-x**, dengan sistem **chunking** dan **streaming real-time** ke browser.

Project ini dibuat untuk memudahkan proses translate subtitle tanpa merusak timestamp.

---

## ✨ Fitur Utama

- 🔥 Translate subtitle VTT otomatis
- ⚡ Streaming hasil terjemahan secara real-time
- 🧩 Sistem chunking (aman dari limit Google Translate)
- 🕒 Timestamp subtitle tetap utuh
- 📊 Statistik & monitoring server
- 🌐 UI web langsung dari server
- 📝 Log request (max 100 log terakhir)

---

## 🧑‍💻 Developer

- **Nama**: ZertCihuy  
- **GitHub**: https://github.com/ZertCihuyy  

---

## 🧰 Teknologi

- Node.js
- Express.js
- Axios
- CORS
- google-translate-api-x
- HTML + CSS (Inline UI)

---

## ⚙️ Konfigurasi

```js
PORT = 3000
MAX_CHARS = 2000
DELIMITER = " ||| "
MAX_LOG_SIZE = 100
````

---

## 🚀 Cara Menjalankan

### 1. Install Dependency

```bash
npm install express cors axios google-translate-api-x
```

### 2. Jalankan Server

```bash
node server.js
```

### 3. Buka Browser

```text
http://localhost:3000
```

---

## 🌐 Route Frontend

### GET `/`

Menampilkan UI web untuk:

* Input link subtitle VTT
* Pilih bahasa tujuan
* Proses translate otomatis

Bahasa yang didukung:

* Indonesia (`id`)
* Jawa (`jw`)
* Sunda (`su`)
* Inggris (`en`)
* Melayu (`ms`)
* Korea (`ko`)
* Arab (`ar`)
* Spanyol (`es`)
* Prancis (`fr`)
* Jerman (`de`)
* Rusia (`ru`)
* Thailand (`th`)
* Vietnam (`vi`)

---

## 🔌 Route API & Informasi

### GET `/log`

Menampilkan log request terakhir.

**Response**

```json
{
  "total_logs": 10,
  "logs": []
}
```

---

### GET `/status`

Cek status server.

**Response**

```json
{
  "status": "Online 🟢",
  "uptime": "120 detik",
  "memory_usage": "45 MB",
  "timestamp": "2026-02-08T00:00:00Z"
}
```

---

### GET `/jumlah-terjemah`

Menampilkan total subtitle yang berhasil diterjemahkan.

```json
{
  "total_terjemahan_sukses": 25
}
```

Alias:

* `/Jumlah-terjema`

---

### GET `/power`

Menampilkan engine translator.

```
google-translate-api-x
```

---

### GET `/developer`

Menampilkan nama developer.

```
ZertCihuy
```

---

## 🧠 Route Utama (Translate Engine)

### GET `/get-vtt`

#### Parameter

| Nama | Wajib | Deskripsi                     |
| ---- | ----- | ----------------------------- |
| url  | ✅     | Link file `.vtt`              |
| lang | ❌     | Bahasa tujuan (default: `id`) |

#### Contoh Request

```
/get-vtt?url=https://example.com/sub.vtt&lang=id
```

---

## 🔄 Alur Proses Translate

1. Fetch file VTT via Axios
2. Pisahkan per baris
3. Deteksi dialog (tanpa timestamp)
4. Gabungkan dialog ke chunk (max 2000 karakter)
5. Translate per chunk
6. Pisahkan hasil translate
7. Kembalikan ke baris asli
8. Streaming hasil ke browser
9. Delay random (200–700 ms)
10. Update counter sukses

---

## ⚠️ Error Handling

* Semua error dicatat ke sistem log
* Output error tetap dikirim ke browser
* Timeout fetch: **30 detik**

---

## 🔐 Keamanan & Batasan

* Tidak menyimpan subtitle
* Tidak ada autentikasi
* Bergantung pada Google Translate
* Tidak disarankan untuk traffic besar

---

## ☕ Support

Jika project ini membantu kamu, bisa support di:

* [https://sociabuzz.com/zerty_/tribe](https://sociabuzz.com/zerty_/tribe)

---

## 📜 Lisensi & Kredit

Powered by:
**google-translate-api-x**

Developed by:
**ZertCihuy**

---

## ⭐ Catatan

Project ini cocok untuk:

* Subtitle komunitas
* Tools personal
* Eksperimen subtitle streaming

Tidak disarankan untuk penggunaan komersial skala besar.

---

