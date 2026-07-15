import { ProxyConnectionConfig } from "../domain/proxy-identity.entity";
import { ProxyRepository } from "../repository/proxy.repository.interface";
import { NoAvailableProxyError } from "../shared/errors";

export class ProxyPoolService {
  constructor(private readonly proxyRepo: ProxyRepository) {}

  /**
   * Ambil proxy berikutnya yang tersedia. Melempar NoAvailableProxyError
   * kalau semua proxy sedang blocked/cooldown -- caller (job processor)
   * yang menentukan retry/backoff-nya, bukan tanggung jawab service ini.
   */
  async acquire(): Promise<{ proxyId: string; config: ProxyConnectionConfig }> {
    const proxy = await this.proxyRepo.getNextAvailable();
    if (!proxy) {
      throw new NoAvailableProxyError();
    }
    return {
      proxyId: proxy.id,
      config: {
        server: `http://${proxy.host}:${proxy.port}`,
        username: proxy.username,
        password: proxy.password,
      },
    };
  }

  async reportSuccess(proxyId: string): Promise<void> {
    await this.proxyRepo.markSuccess(proxyId);
  }

  async reportFailure(proxyId: string, cooldownMinutes = 15): Promise<void> {
    await this.proxyRepo.markFailed(proxyId, cooldownMinutes);
  }
}
