import { promises as fs } from "fs";
import path from "path";

const RAW_COOKIES_PATH = path.join(process.cwd(), "data", "raw-cookies.json");
const SESSION_PATH = path.join(process.cwd(), "data", "session.json");

interface ExportedCookie {
  domain: string;
  name: string;
  path: string;
  value: string;
  expirationDate?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string | null;
  session?: boolean;
}

type PlaywrightSameSite = "Strict" | "Lax" | "None";

function normalizeSameSite(raw: string | null | undefined): PlaywrightSameSite {
  switch ((raw ?? "").toLowerCase()) {
    case "strict":
      return "Strict";
    case "no_restriction":
    case "none":
      return "None";
    case "lax":
    default:
      return "Lax";
  }
}

/**
 * Convert cookie hasil export dari browser extension (format lengkap dengan
 * domain/expirationDate/httpOnly dll) jadi storageState yang dipahami Playwright.
 *
 * Usage: pnpm build-session
 */
async function main() {
  const raw = JSON.parse(await fs.readFile(RAW_COOKIES_PATH, "utf-8")) as ExportedCookie[];

  if (raw.length === 0) {
    console.error("data/raw-cookies.json kosong. Isi dulu sesuai instruksi.");
    process.exit(1);
  }

  const cookies = raw
    // skip cookie session-only tanpa expiry jelas kayak "cb" dan "rur" -- tidak esensial buat auth
    .filter((c) => c.value && c.domain)
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || "/",
      expires: c.expirationDate ? Math.floor(c.expirationDate) : -1,
      httpOnly: c.httpOnly ?? false,
      secure: c.secure ?? true,
      sameSite: normalizeSameSite(c.sameSite),
    }));

  const storageState = { cookies, origins: [] };

  await fs.writeFile(SESSION_PATH, JSON.stringify(storageState, null, 2));
  console.log(`Session berhasil dibuat: ${SESSION_PATH}`);
  console.log(`Total cookie: ${cookies.length}`);
  console.log("Cookie yang tersimpan:", cookies.map((c) => c.name).join(", "));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});