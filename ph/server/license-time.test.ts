import { describe, expect, it } from "vitest";
import { calculateRemainingLicenseTime } from "../shared/license-time";
import { calculateActivationExpiry, normalizeDurationMinutes } from "./licenses";

describe("calculateRemainingLicenseTime", () => {
  const now = new Date("2026-08-27T12:00:00.000Z");

  it("calcula dias, horas e minutos restantes", () => {
    const result = calculateRemainingLicenseTime("2026-08-29T15:42:30.000Z", now);
    expect(result).toEqual({ expired: false, totalSeconds: 186150, days: 2, hours: 3, minutes: 42 });
  });

  it("arredonda para cima o segundo parcial e marca expiração no vencimento", () => {
    expect(calculateRemainingLicenseTime("2026-08-27T11:59:59.500Z", now)).toEqual({ expired: true, totalSeconds: 0, days: 0, hours: 0, minutes: 0 });
    expect(calculateRemainingLicenseTime("2026-08-27T12:00:00.001Z", now)?.totalSeconds).toBe(1);
  });

  it("calcula uma validade de exatamente 1 hora", () => {
    const activatedAt = new Date("2026-08-27T12:00:00.000Z");
    const expiresAt = calculateActivationExpiry(activatedAt, 1, 60);
    expect(expiresAt.toISOString()).toBe("2026-08-27T13:00:00.000Z");
    expect(normalizeDurationMinutes(60)).toBe(60);
    expect(normalizeDurationMinutes(0)).toBe(43200);
  });

  it("retorna nulo quando a licença ainda não tem expiração", () => {
    expect(calculateRemainingLicenseTime(null, now)).toBeNull();
    expect(calculateRemainingLicenseTime(undefined, now)).toBeNull();
  });
});
