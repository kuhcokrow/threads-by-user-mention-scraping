import { chromium } from "playwright";
import path from "path";

const SESSION_PATH = path.join(process.cwd(), "data", "session.json");

/**
 * Buka browser beneran (headless: false), biar kamu bisa login manual ke
 * akun Threads "buangan" kamu. Setelah login berhasil, tekan Enter di
 * terminal ini untuk simpan session cookie-nya.
 *
 * Usage: pnpm login-session
 */
async function main() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.threads.com/login");

  console.log("Silakan login manual di browser yang terbuka...");
  console.log("Setelah selesai login dan halaman utama Threads muncul, tekan Enter di sini.");

  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });

  await context.storageState({ path: SESSION_PATH });
  console.log(`Session tersimpan di: ${SESSION_PATH}`);

  await browser.close();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});