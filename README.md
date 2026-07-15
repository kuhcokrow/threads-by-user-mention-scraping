# Threads Mention Scraper

Service untuk memantau postingan yang mention keyword/akun tertentu di Threads, pakai Playwright + proxy rotation + job queue. Penyimpanan data pakai **file JSON** (tanpa database) -- cocok untuk MVP/testing, tapi perlu diganti ke database beneran (Postgres/Mongo) kalau volume data sudah besar, karena tiap write nge-rewrite seluruh file.

## ⚠️ Catatan penting

- Scraping Threads **melanggar Terms of Service** Meta. Tidak ada jaminan legal, dan akun/proxy bisa kena block sewaktu-waktu.
- Scraper **tidak** parsing DOM/HTML. Dia buka halaman search Threads lewat Playwright, lalu intercept response GraphQL (`BarcelonaSearchResultsRefetchableQuery`, endpoint `/graphql/query`) yang dikirim halaman itu sendiri untuk render hasil pencarian, dan parse JSON-nya langsung. Ini lebih tahan terhadap perubahan struktur DOM, tapi tetap bisa berubah kalau Meta ganti nama query / shape response — lihat `src/scraper/threads-response.types.ts` & `src/scraper/selectors.ts`.
- Hanya post yang benar-benar mention keyword (dicek dari `text_fragments` bertipe `mention`, bukan sekadar keyword nongol di teks) yang disimpan.
- Butuh **session login** supaya hasil search tidak kosong/dibatasi (lihat bagian Session di bawah). Tanpa session, scraper tetap jalan tapi mode anonim dan sering gagal capture response.
- Kalau tidak ada response GraphQL yang ter-capture sama sekali (kemungkinan kena consent wall / app-install redirect / captcha), scraper otomatis simpan screenshot (`debug-*.png`) dan log info halaman ke console untuk debugging, lalu melempar `ScrapeBlockedError`.
- File JSON (`data/mentions.json`, `data/proxies.json`, `data/session.json`) di-lock secara in-memory per proses. Kalau API server & worker jalan sebagai proses terpisah (memang begitu desainnya) dan keduanya nulis ke file yang sama bersamaan, ada risiko race condition kecil. Untuk skala kecil ini biasanya tidak masalah, tapi kalau makin serius, migrasi ke database (schema Prisma bisa ditambahkan lagi nanti tanpa mengubah usecase/controller, karena sudah pakai repository interface).
- Folder `data/` di-gitignore seluruhnya — proxy, session, dan hasil scraping tidak pernah ke-commit.

## Setup

```bash
pnpm install
pnpm exec playwright install chromium
cp .env.example .env   # isi REDIS_URL kalau bukan default
```

Tambahkan proxy ke pool (wajib sebelum trigger scraping):

```bash
pnpm add-proxy -- <host> <port> <username> <password>
# contoh:
pnpm add-proxy -- proxy.iproyal.com 12321 myuser mypass
```

Bisa dipanggil berkali-kali untuk menambahkan beberapa proxy sekaligus.

## Session login

Search Threads jauh lebih reliable kalau request-nya dikirim dari session yang sudah login. Ada dua cara isi `data/session.json`:

**Opsi A -- login manual lewat browser yang dibuka Playwright:**

```bash
pnpm login-session
```

Browser (non-headless) akan terbuka ke halaman login Threads. Login manual pakai akun "buangan" (bukan akun utama, karena risiko block), lalu tekan Enter di terminal untuk simpan cookie ke `data/session.json`.

**Opsi B -- import cookie hasil export dari browser extension:**

1. Export cookie domain `threads.com` (mis. pakai extension "Cookie Editor") ke `data/raw-cookies.json`.
2. Jalankan:
   ```bash
   pnpm build-session
   ```
   Ini convert format cookie tersebut jadi `storageState` yang dipahami Playwright dan simpan ke `data/session.json`.

Kalau `data/session.json` tidak ada, scraper tetap jalan tapi anonim (tanpa login) dan akan print warning di log.

## Menjalankan

Butuh Redis jalan (untuk job queue), lalu 2 proses terpisah:

```bash
# Terminal 1 -- API server
pnpm dev

# Terminal 2 -- worker yang benar-benar melakukan scraping
pnpm worker:dev
```

## API

**Trigger scraping (enqueue job, async -- butuh worker jalan):**
```
POST /mentions/scrape
Body: { "keyword": "namabrand" }
-> 202 { message, jobId }
```

**Trigger scraping langsung (sinkron, tanpa lewat queue/worker):**
```
POST /mentions/scrape-now
Body: { "keyword": "namabrand" }
-> 200 { message, postsFound, proxyId }
```
Berguna untuk testing cepat, tapi request akan nge-block sampai scraping selesai (bisa puluhan detik) -- untuk pemakaian rutin tetap disarankan pakai `/mentions/scrape` + worker.

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
├── scraper/          # Playwright scraping (intercept GraphQL search) + proxy pool + response types
├── queue/             # BullMQ queue & worker
├── delivery/http/     # Express controller & routes
├── infrastructure/    # json-store, redis connection
├── scripts/            # CLI helper (add-proxy, login-session, build-session)
└── shared/             # error classes, middleware
data/
├── mentions.json      # hasil scraping (auto-generated)
├── session.json        # cookie login Threads (dibuat via login-session/build-session)
└── proxies.json        # pool proxy (isi manual via add-proxy)
```

## Next steps yang perlu kamu lakukan

1. Isi pool proxy pakai `pnpm add-proxy` dan buat session login (`pnpm login-session` atau `pnpm build-session`) sebelum trigger job pertama.
2. Kalau `friendlyNameMatch`/shape response di `threads-response.types.ts` sudah tidak cocok (Meta ganti query GraphQL), update `selectors.ts` dan types-nya sesuai response terbaru -- cek lewat DevTools tab Network.
3. Tambahkan scheduler (mis. BullMQ repeatable job) kalau mau scraping berkala otomatis, bukan cuma manual trigger.
4. Kalau data makin banyak dan file JSON mulai lambat/berat, migrasi ke database -- tinggal buat implementasi repository baru, usecase & controller tidak perlu diubah.
