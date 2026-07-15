import { ProxyIdentity } from "../domain/proxy-identity.entity";

export interface ProxyRepository {
  /** Ambil satu proxy yang tidak blocked dan cooldown-nya sudah lewat, paling lama tidak dipakai (round-robin) */
  getNextAvailable(): Promise<ProxyIdentity | null>;
  markSuccess(proxyId: string): Promise<void>;
  /** Tandai gagal; kalau failCount melewati threshold, set isBlocked + blockedUntil (cooldown) */
  markFailed(proxyId: string, cooldownMinutes: number): Promise<void>;
}
