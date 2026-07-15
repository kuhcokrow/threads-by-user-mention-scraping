import path from "path";
import { randomUUID } from "crypto";
import { readJsonFile, writeJsonFile } from "../infrastructure/json-store";
import { ProxyIdentity } from "../domain/proxy-identity.entity";

const FILE_PATH = path.join(process.cwd(), "data", "proxies.json");

/**
 * Usage: tsx src/scripts/add-proxy.ts <host> <port> <username> <password>
 */
async function main() {
  const [host, portStr, username, password] = process.argv.slice(2);
  if (!host || !portStr || !username || !password) {
    console.error("Usage: tsx src/scripts/add-proxy.ts <host> <port> <username> <password>");
    process.exit(1);
  }

  const proxies = await readJsonFile<ProxyIdentity[]>(FILE_PATH, []);

  const newProxy: ProxyIdentity = {
    id: randomUUID(),
    host,
    port: parseInt(portStr, 10),
    username,
    password,
    isBlocked: false,
    lastUsedAt: null,
    blockedUntil: null,
    successCount: 0,
    failCount: 0,
  };

  proxies.push(newProxy);
  await writeJsonFile(FILE_PATH, proxies);

  console.log(`Proxy ditambahkan: ${host}:${portStr} (id: ${newProxy.id})`);
  console.log(`Total proxy sekarang: ${proxies.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
