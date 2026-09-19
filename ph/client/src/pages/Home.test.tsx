// @vitest-environment jsdom
import React from "react";
import "@testing-library/jest-dom/vitest";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RemainingTime, formatLicenseDuration } from "./Home";

describe("duration labels", () => {
  it("exibe 1 hora e mantém dias para durações antigas", () => {
    expect(formatLicenseDuration({ durationMinutes: 60, durationDays: 1 })).toBe("1 hora");
    expect(formatLicenseDuration({ durationMinutes: 5 * 60, durationDays: 1 })).toBe("5 horas");
    expect(formatLicenseDuration({ durationMinutes: 30 * 60, durationDays: 1 })).toBe("30 horas");
    expect(formatLicenseDuration({ durationMinutes: 1440, durationDays: 1 })).toBe("1 dia");
    expect(formatLicenseDuration({ durationDays: 30 })).toBe("30 dias");
  });
});

describe("RemainingTime", () => {
  afterEach(() => vi.useRealTimers());

  it("renderiza aguardando ativação para uma key ainda não usada", () => {
    render(<RemainingTime row={{ activatedAt: null, expiresAt: null, durationDays: 7 }} />);
    expect(screen.getByText("Aguardando ativação")).toBeInTheDocument();
  });

  it("renderiza expirada quando o vencimento já passou", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T13:00:00.000Z"));
    render(<RemainingTime row={{ activatedAt: "2026-08-27T12:00:00.000Z", expiresAt: "2026-08-27T13:00:00.000Z" }} />);
    expect(screen.getByText("Expirada")).toBeInTheDocument();
  });

  it("atualiza o texto após o intervalo de um minuto", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-27T12:00:00.000Z"));
    render(<RemainingTime row={{ activatedAt: "2026-08-27T12:00:00.000Z", expiresAt: "2026-08-27T12:02:00.000Z" }} />);
    expect(screen.getByText("Restam 0h 2min")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(60_000);
      vi.setSystemTime(new Date("2026-08-27T12:01:00.000Z"));
    });
    expect(screen.getByText("Restam 0h 1min")).toBeInTheDocument();
  });
});

describe("license creator label", () => {
  it("shows reseller name and email for searched license rows", async () => {
    const { licenseCreatorLabel } = await import("./Home");
    expect(licenseCreatorLabel({ creatorName: "Revendedor Um", creatorEmail: "revendedor@example.com" })).toBe("Revendedor Um · revendedor@example.com");
    expect(licenseCreatorLabel({ creatorEmail: "revendedor@example.com" })).toBe("revendedor@example.com");
    expect(licenseCreatorLabel({ creatorRole: "admin" })).toBe("Administrador");
  });
});
