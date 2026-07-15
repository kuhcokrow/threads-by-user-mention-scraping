import path from "path";
import { ProxyIdentity } from "../domain/proxy-identity.entity";
import { ProxyRepository } from "./proxy.repository.interface";
import { readJsonFile, writeJsonFile } from "../infrastructure/json-store";

const FILE_PATH = path.join(process.cwd(), "data", "proxies.json");
const FAIL_THRESHOLD = 3;

export class JsonProxyRepository implements ProxyRepository {
  private async load(): Promise<ProxyIdentity[]> {
    return readJsonFile<ProxyIdentity[]>(FILE_PATH, []);
  }

  private async save(proxies: ProxyIdentity[]): Promise<void> {
    await writeJsonFile(FILE_PATH, proxies);
  }

  async getNextAvailable(): Promise<ProxyIdentity | null> {
    const proxies = await this.load();
    const now = Date.now();

    const available = proxies
      .filter((p) => !p.isBlocked && (!p.blockedUntil || new Date(p.blockedUntil).getTime() <= now))
      .sort((a, b) => {
        const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
        const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
        return aTime - bTime; // round-robin: paling lama tidak dipakai duluan
      });

    const proxy = available[0];
    if (!proxy) return null;

    proxy.lastUsedAt = new Date();
    await this.save(proxies);
    return proxy;
  }

  async markSuccess(proxyId: string): Promise<void> {
    const proxies = await this.load();
    const proxy = proxies.find((p) => p.id === proxyId);
    if (!proxy) return;
    proxy.successCount += 1;
    proxy.failCount = 0;
    await this.save(proxies);
  }

  async markFailed(proxyId: string, cooldownMinutes: number): Promise<void> {
    const proxies = await this.load();
    const proxy = proxies.find((p) => p.id === proxyId);
    if (!proxy) return;

    proxy.failCount += 1;
    if (proxy.failCount >= FAIL_THRESHOLD) {
      proxy.blockedUntil = new Date(Date.now() + cooldownMinutes * 60_000);
      proxy.failCount = 0;
    }
    await this.save(proxies);
  }
}
