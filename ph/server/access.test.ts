import { describe, expect, it } from "vitest";
import { hasAdminRole, hasStaffRole } from "./_core/trpc";
import { isLicenseGranted, isLicensePayload } from "./licenses";

describe("role access policy", () => {
  it("allows staff access only for admin and reseller", () => {
    expect(hasStaffRole("admin")).toBe(true);
    expect(hasStaffRole("reseller")).toBe(true);
    expect(hasStaffRole("user")).toBe(false);
    expect(hasStaffRole(undefined)).toBe(false);
  });

  it("allows admin-only operations only for admin", () => {
    expect(hasAdminRole("admin")).toBe(true);
    expect(hasAdminRole("reseller")).toBe(false);
    expect(hasAdminRole("user")).toBe(false);
    expect(hasAdminRole(null)).toBe(false);
  });
});

describe("public license validation contract", () => {
  it("keeps the endpoint payload public and grants only boolean true", () => {
    expect(isLicensePayload({ key: "NX-12345678", deviceId: "device-1", packageName: "com.example.app", appVersion: "1.0" })).toBe(true);
    expect(isLicenseGranted({ valid: true })).toBe(true);
    expect(isLicenseGranted({ valid: "true" })).toBe(false);
  });
});
