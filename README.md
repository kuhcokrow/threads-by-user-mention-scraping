# Threads Mention Scraper

Service untuk memantau postingan yang mention keyword/akun tertentu di Threads, pakai Playwright + proxy rotation + job queue. Penyimpanan data pakai **file JSON** (tanpa database) -- cocok untuk MVP/testing, tapi perlu diganti ke database beneran (Postgres/Mongo) kalau volume data sudah besar, karena tiap write nge-rewrite seluruh file.

## ⚠️ Catatan penting

- Scraping Threads **melanggar Terms of Service** Meta. Tidak ada jaminan legal, dan akun/proxy bisa kena block sewaktu-waktu.
- Selector di `src/scraper/selectors.ts` adalah **placeholder** — cek ulang struktur DOM asli lewat DevTools sebelum dipakai, dan siap-siap update berkala karena Threads bisa ganti struktur tanpa pemberitahuan.
- File JSON (`data/mentions.json`, `data/proxies.json`) di-lock secara in-memory per proses. Kalau API server & worker jalan sebagai proses terpisah (memang begitu desainnya) dan keduanya nulis ke file yang sama bersamaan, ada risiko race condition kecil. Untuk skala kecil ini biasanya tidak masalah, tapi kalau makin serius, migrasi ke database (schema Prisma bisa ditambahkan lagi nanti tanpa mengubah usecase/controller, karena sudah pakai repository interface).

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # isi REDIS_URL kalau bukan default
```

Tambahkan proxy ke pool (wajib sebelum trigger scraping):

```bash
npm run add-proxy -- <host> <port> <username> <password>
# contoh:
npm run add-proxy -- proxy.iproyal.com 12321 myuser mypass
```

Bisa dipanggil berkali-kali untuk menambahkan beberapa proxy sekaligus.

## Menjalankan

Butuh Redis jalan (untuk job queue), lalu 2 proses terpisah:

```bash
# Terminal 1 -- API server
npm run dev

# Terminal 2 -- worker yang benar-benar melakukan scraping
npm run worker:dev
```

## API

**Trigger scraping (enqueue job, async):**
```
POST /mentions/scrape
Body: { "keyword": "namabrand" }
-> 202 { message, jobId }
```

**Ambil hasil scraping:**
```
GET /mentions?keyword=namabrand&page=1&pageSize=20
-> { data: [...], pagination: {...} }
```

Data mentah tersimpan di `data/mentions.json`, bisa dibuka manual juga kalau perlu.

## Struktur

```
src/
├── domain/          # entity murni
├── usecase/         # business logic
├── repository/       # interface + implementasi JSON file
├── scraper/          # Playwright scraping + proxy pool
├── queue/             # BullMQ queue & worker
├── delivery/http/     # Express controller & routes
├── infrastructure/    # json-store, redis connection
├── scripts/            # CLI helper (add-proxy)
└── shared/             # error classes, middleware
data/
├── mentions.json      # hasil scraping (auto-generated)
└── proxies.json        # pool proxy (isi manual via add-proxy)
```

## Next steps yang perlu kamu lakukan

1. Inspect halaman search Threads manual, update `selectors.ts` dengan selector asli.
2. Isi pool proxy pakai `npm run add-proxy` sebelum trigger job pertama.
3. Tambahkan scheduler (mis. BullMQ repeatable job) kalau mau scraping berkala otomatis, bukan cuma manual trigger.
4. Kalau data makin banyak dan file JSON mulai lambat/berat, migrasi ke database -- tinggal buat implementasi repository baru, usecase & controller tidak perlu diubah.
