export interface CreateClickInput {
  urlId: string;
  ipAddress: string;
  browser: string | null;
  referrer: string | null;
  os?: string | null;
  userAgent?: string | null;
  deviceType?: string | null;
}
