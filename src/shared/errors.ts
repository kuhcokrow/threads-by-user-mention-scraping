export class AppError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource tidak ditemukan") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Input tidak valid") {
    super(message, 400);
  }
}

/** Semua proxy dalam pool sedang blocked/cooldown, tidak ada yang bisa dipakai */
export class NoAvailableProxyError extends AppError {
  constructor(message = "Tidak ada proxy yang tersedia saat ini") {
    super(message, 503);
  }
}

/** Scraper mendeteksi captcha, block page, atau selector tidak ditemukan */
export class ScrapeBlockedError extends AppError {
  constructor(message = "Scraping diblokir oleh target (captcha/rate-limit)") {
    super(message, 429);
  }
}
