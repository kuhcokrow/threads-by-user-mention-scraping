export interface ProxyIdentity {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  isBlocked: boolean;
  lastUsedAt?: Date | null;
  blockedUntil?: Date | null;
  successCount: number;
  failCount: number;
}

/** Format siap pakai untuk Playwright launch options */
export interface ProxyConnectionConfig {
  server: string; // contoh: "http://host:port"
  username: string;
  password: string;
}
