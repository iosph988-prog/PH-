import { describe, expect, it } from "vitest";
import { createPatchDownloadToken, isRemotePatchUpload, isValidPatchFileName, parsePatchDownloadToken } from "./remotePatches";

describe("remote patch contract", () => {
  it("creates and parses a short-lived signed download token", () => {
    const token = createPatchDownloadToken({ versionId: 12, licenseHash: "a".repeat(64), deviceId: "device-1", packageName: "com.example.app", expiresAt: Date.now() + 60_000 });
    expect(parsePatchDownloadToken(token)).toMatchObject({ v: 12, l: "a".repeat(64), d: "device-1", p: "com.example.app" });
  });

  it("rejects tampered and expired tokens", () => {
    const valid = createPatchDownloadToken({ versionId: 12, licenseHash: "a".repeat(64), deviceId: "device-1", packageName: "com.example.app", expiresAt: Date.now() - 1 });
    expect(parsePatchDownloadToken(valid)).toBeNull();
    expect(parsePatchDownloadToken(`${valid}x`)).toBeNull();
  });

  it("accepts the real Free Fire MAX patch filenames", () => {
    expect(isValidPatchFileName("ALTO(3).3105")).toBe(true);
    expect(isValidPatchFileName("PEITO(3).3105")).toBe(true);
    expect(isValidPatchFileName("PESCOCO(3).3105")).toBe(true);
    expect(isValidPatchFileName("patch/evil.3105")).toBe(false);
    expect(isValidPatchFileName("patch.exe")).toBe(false);
  });

  it("accepts only complete patch upload payloads", () => {
    expect(isRemotePatchUpload({ slug: "hs-alto", title: "HS ALTO", game: "free-fire-max", fileName: "ALTO(3).3105", data: "AA==" })).toBe(true);
    expect(isRemotePatchUpload({ slug: "hs-alto", title: "HS ALTO", fileName: "ALTO(3).3105" })).toBe(false);
  });
});
