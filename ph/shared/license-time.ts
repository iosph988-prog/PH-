export type RemainingLicenseTime = {
  expired: boolean;
  totalSeconds: number;
  days: number;
  hours: number;
  minutes: number;
};

export function calculateRemainingLicenseTime(expiresAt: Date | string | null | undefined, now = new Date()): RemainingLicenseTime | null {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  const current = now.getTime();
  if (!Number.isFinite(expires) || !Number.isFinite(current)) return null;
  const totalSeconds = Math.max(0, Math.ceil((expires - current) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { expired: totalSeconds === 0, totalSeconds, days, hours, minutes };
}
