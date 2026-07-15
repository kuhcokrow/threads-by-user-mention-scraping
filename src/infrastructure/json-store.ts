import { promises as fs } from "fs";
import path from "path";

/**
 * Helper generic baca/tulis file JSON sebagai "database" sederhana.
 * Pakai in-memory mutex per file supaya write yang beruntun (dari worker
 * concurrency > 1) tidak saling menimpa (lost update).
 */
const locks = new Map<string, Promise<unknown>>();

function withLock<T>(filePath: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(filePath) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(filePath, next);
  return next as Promise<T>;
}

export async function readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await ensureDir(filePath);
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    throw err;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  return withLock(filePath, async () => {
    await ensureDir(filePath);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  });
}

async function ensureDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}
