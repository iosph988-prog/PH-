import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock("./db", () => ({ getDb }));

import { calculateActivationExpiry, createLicense, createLicenses, deleteExpiredLicenses, deleteLicense, evaluateLicenseAccess, generateRawKey, isLicenseGranted, isLicensePayload, mergeDeviceCounts, normalizeCustomKey, normalizeDurationDays, normalizeLicenseBatchCount, pauseAllLicenses, resetLicense, resumeAllLicenses, setLicenseStatus, validateCustomKeyRequest, validateLicense } from "./licenses";

describe("short alphanumeric key format", () => {
  it("generates EXTERNAL- plus 15 uppercase letters and numbers", () => {
    const key = generateRawKey();
    expect(key).toMatch(/^EXTERNAL-[A-Z0-9]{15}$/);
    expect(key).toHaveLength(24);
  });
});

describe("license activation duration", () => {
  it("starts the selected duration at first activation and clamps it to 1..30 days", () => {
    const activatedAt = new Date("2026-08-26T12:00:00.000Z");
    expect(normalizeDurationDays(1)).toBe(1);
    expect(normalizeDurationDays(30)).toBe(30);
    expect(normalizeDurationDays(31)).toBe(30);
    expect(calculateActivationExpiry(activatedAt, 7).toISOString()).toBe("2026-09-02T12:00:00.000Z");
  });
});

describe("license validation contract", () => {
  it("accepts the four required string fields", () => {
    expect(isLicensePayload({ key: "NX-12345678", deviceId: "device-1", packageName: "com.example.app", appVersion: "1.0" })).toBe(true);
  });

  it("rejects missing or blank fields", () => {
    expect(isLicensePayload({ key: "", deviceId: "device-1", packageName: "com.example.app", appVersion: "1.0" })).toBe(false);
    expect(isLicensePayload({ key: "NX-12345678", deviceId: "device-1", packageName: "com.example.app" })).toBe(false);
    expect(isLicensePayload(null)).toBe(false);
  });

  it("grants access only when valid is the boolean true", () => {
    expect(isLicenseGranted({ valid: true })).toBe(true);
    expect(isLicenseGranted({ valid: false })).toBe(false);
    expect(isLicenseGranted({ valid: "true" })).toBe(false);
    expect(isLicenseGranted({})).toBe(false);
  });

  it("rejects revoked, expired, and full licenses", () => {
    const now = new Date("2026-08-26T00:00:00.000Z");
    expect(evaluateLicenseAccess({ status: "revoked", expiresAt: null, deviceCount: 0, deviceLimit: 2, now }).code).toBe("revoked");
    expect(evaluateLicenseAccess({ status: "active", expiresAt: new Date("2026-08-25T00:00:00.000Z"), deviceCount: 0, deviceLimit: 2, now }).code).toBe("expired");
    expect(evaluateLicenseAccess({ status: "active", expiresAt: null, deviceCount: 2, deviceLimit: 2, now }).code).toBe("device_limit");
  });

  it("allows an active license with capacity", () => {
    expect(evaluateLicenseAccess({ status: "active", expiresAt: null, deviceCount: 0, deviceLimit: 1, now: new Date() })).toEqual({ valid: true, code: "valid", message: "Chave válida" });
  });
});

describe("license activation flow", () => {
  it("activates on first validation, preserves expiry on second, and rejects after expiry", async () => {
    const state: any = { id: 9, status: "active", expiresAt: null, activatedAt: null, durationDays: 7, deviceLimit: 2 };
    const devices: any[] = [];
    const events: any[] = [];
    const query = (result: any) => { const chain: any = { limit: vi.fn().mockResolvedValue(result), then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) }; return { from: vi.fn(() => ({ where: vi.fn(() => chain) })) }; };
    const tx = {
      select: vi.fn()
        .mockImplementationOnce(() => query([state]))
        .mockImplementationOnce(() => query([]))
        .mockImplementationOnce(() => query([{ count: 0 }])),
      update: vi.fn(() => ({ set: vi.fn((values: any) => ({ where: vi.fn().mockImplementation(async () => { Object.assign(state, values); return [{ affectedRows: 1 }]; }) })) })),
      insert: vi.fn(() => ({ values: vi.fn().mockImplementation(async (value: any) => { devices.push(value); return [{ insertId: devices.length }]; }) })),
    };
    const db: any = {
      select: vi.fn(() => query([state])),
      transaction: vi.fn(async (callback: any) => callback(tx)),
      insert: vi.fn(() => ({ values: vi.fn().mockImplementation(async (value: any) => { events.push(value); return undefined; }) })),
      update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
    };
    getDb.mockResolvedValue(db);
    const first = await validateLicense({ key: "NX-12345678", deviceId: "device-a", packageName: "com.app", appVersion: "1" });
    expect(first.valid).toBe(true);
    expect(first.durationDays).toBe(7);
    expect(first.activatedAt).toBe(state.activatedAt.toISOString());
    expect(first.expiresAt).toBe(state.expiresAt.toISOString());
    expect(state.activatedAt).toBeInstanceOf(Date);
    expect(state.expiresAt).toEqual(calculateActivationExpiry(state.activatedAt, 7));
    const expiry = state.expiresAt;
    tx.select
      .mockImplementationOnce(() => query([state]))
      .mockImplementationOnce(() => query([devices[0]]));
    const second = await validateLicense({ key: "NX-12345678", deviceId: "device-a", packageName: "com.app", appVersion: "2" });
    expect(second.valid).toBe(true);
    expect(state.expiresAt).toBe(expiry);
    state.expiresAt = new Date(Date.now() - 1000);
    const expired = await validateLicense({ key: "NX-12345678", deviceId: "device-b", packageName: "com.app", appVersion: "2" });
    expect(expired).toMatchObject({ valid: false, code: "expired" });
  });

  it("returns activation metadata from the transaction on first validation", async () => {
    const initialState: any = { id: 11, status: "active", expiresAt: null, activatedAt: null, durationDays: 3, deviceLimit: 1 };
    const currentState: any = { ...initialState };
    const devices: any[] = [];
    const query = (result: any) => { const chain: any = { limit: vi.fn().mockResolvedValue(result), then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) }; return { from: vi.fn(() => ({ where: vi.fn(() => chain) })) }; };
    const tx: any = {
      select: vi.fn().mockImplementationOnce(() => query([currentState])).mockImplementationOnce(() => query([])).mockImplementationOnce(() => query([{ count: 0 }])) ,
      update: vi.fn(() => ({ set: vi.fn((values: any) => ({ where: vi.fn().mockImplementation(async () => { Object.assign(currentState, values); return [{ affectedRows: 1 }]; }) })) })),
      insert: vi.fn(() => ({ values: vi.fn().mockImplementation(async (value: any) => { devices.push(value); return [{ insertId: devices.length }]; }) })),
    };
    const db: any = { select: vi.fn(() => query([initialState])), transaction: vi.fn(async (callback: any) => callback(tx)), insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) };
    getDb.mockResolvedValue(db);
    const result = await validateLicense({ key: "NX-87654321", deviceId: "device-first", packageName: "com.app", appVersion: "1" });
    expect(result).toMatchObject({ valid: true, durationDays: 3, activatedAt: currentState.activatedAt.toISOString(), expiresAt: currentState.expiresAt.toISOString() });
    expect(initialState.activatedAt).toBeNull();
  });

  it("uses the already committed activation when the conditional update loses a race", async () => {
    const activatedAt = new Date("2026-10-01T12:00:00.000Z");
    const state: any = { id: 10, status: "active", activatedAt, expiresAt: calculateActivationExpiry(activatedAt, 7), durationDays: 7, deviceLimit: 1 };
    const query = (result: any) => { const chain: any = { limit: vi.fn().mockResolvedValue(result), then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) }; return { from: vi.fn(() => ({ where: vi.fn(() => chain) })) }; };
    const tx: any = { select: vi.fn().mockImplementationOnce(() => query([state])).mockImplementationOnce(() => query([])).mockImplementationOnce(() => query([{ count: 0 }])).mockImplementationOnce(() => query([{ activatedAt, expiresAt: state.expiresAt }])), update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 0 }]) })) })), insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) };
    const db: any = { select: vi.fn(() => query([state])), transaction: vi.fn(async (callback: any) => callback(tx)), insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) };
    getDb.mockResolvedValue(db);
    const result = await validateLicense({ key: "NX-12345678", deviceId: "device-race", packageName: "com.app", appVersion: "1" });
    expect(result.valid).toBe(true);
    expect(result.expiresAt).toBe(state.expiresAt.toISOString());
  });
});

describe("one-hour license integration", () => {
  it("activates for exactly one hour and returns durationMinutes", async () => {
    const state: any = { id: 60, status: "active", expiresAt: null, activatedAt: null, durationDays: 1, durationMinutes: 60, deviceLimit: 1 };
    const devices: any[] = [];
    const query = (result: any) => { const chain: any = { limit: vi.fn().mockResolvedValue(result), then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) }; return { from: vi.fn(() => ({ where: vi.fn(() => chain) })) }; };
    const tx: any = {
      select: vi.fn().mockImplementationOnce(() => query([state])).mockImplementationOnce(() => query([])).mockImplementationOnce(() => query([{ count: 0 }])) ,
      update: vi.fn(() => ({ set: vi.fn((values: any) => ({ where: vi.fn().mockImplementation(async () => { Object.assign(state, values); return [{ affectedRows: 1 }]; }) })) })),
      insert: vi.fn(() => ({ values: vi.fn().mockImplementation(async (value: any) => { devices.push(value); return [{ insertId: devices.length }]; }) })),
    };
    const db: any = { select: vi.fn(() => query([state])), transaction: vi.fn(async (callback: any) => callback(tx)), insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) };
    getDb.mockResolvedValue(db);
    const result = await validateLicense({ key: "NX-ONE-HOUR", deviceId: "device-hour", packageName: "com.app", appVersion: "1" });
    expect(result).toMatchObject({ valid: true, durationMinutes: 60 });
    expect(state.expiresAt.getTime() - state.activatedAt.getTime()).toBe(60 * 60 * 1000);
    expect(devices).toHaveLength(1);
    state.expiresAt = new Date(Date.now() - 1_000);
    const expired = await validateLicense({ key: "NX-ONE-HOUR", deviceId: "device-hour-2", packageName: "com.app", appVersion: "1" });
    expect(expired).toMatchObject({ valid: false, code: "expired" });
  });
});

describe("global license pause", () => {
  it("pauses every active license in one transaction and audits each key", async () => {
    const activeRows = [{ id: 12 }, { id: 13 }];
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 2 }]) })) }));
    const insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
    const tx = { update, insert };
    const query = (result: any) => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(result) })) });
    const db = { select: vi.fn(() => query(activeRows)), transaction: vi.fn(async (callback: any) => callback(tx)) };
    getDb.mockResolvedValue(db);

    await expect(pauseAllLicenses()).resolves.toEqual({ success: true, paused: 2 });
    expect(update).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.results[0].value.values).toHaveBeenCalledWith([
      expect.objectContaining({ licenseId: 12, eventType: "revoked" }),
      expect.objectContaining({ licenseId: 13, eventType: "revoked" }),
    ]);
  });

  it("resumes only licenses marked by the global pause", async () => {
    const pausedRows = [{ id: 21 }];
    const update = vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ affectedRows: 1 }]) })) }));
    const insert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));
    const tx = { update, insert };
    const query = (result: any) => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue(result) })) });
    const db = { select: vi.fn(() => query(pausedRows)), transaction: vi.fn(async (callback: any) => callback(tx)) };
    getDb.mockResolvedValue(db);

    await expect(resumeAllLicenses()).resolves.toEqual({ success: true, resumed: 1 });
    expect(update).toHaveBeenCalledTimes(1);
    expect(insert.mock.results[0].value.values).toHaveBeenCalledWith([
      expect.objectContaining({ licenseId: 21, eventType: "reactivated" }),
    ]);
  });

  it("returns zero without writing when no active licenses exist", async () => {
    const db = { select: vi.fn(() => queryForEmptyRows()) };
    getDb.mockResolvedValue(db);
    await expect(pauseAllLicenses()).resolves.toEqual({ success: true, paused: 0 });
    expect(db.transaction).toBeUndefined();
  });
});

function queryForEmptyRows() {
  return { from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) };
}

describe("device count mapping", () => {
  it("associates grouped device counts with the correct license and defaults missing links to zero", () => {
    const rows = [{ id: 101, keyPrefix: "NX-A" }, { id: 202, keyPrefix: "NX-B" }, { id: 303, keyPrefix: "NX-C" }];
    expect(mergeDeviceCounts(rows, [{ licenseId: "202", deviceCount: "2" }, { licenseId: 101, deviceCount: 1 }])).toEqual([
      { id: 101, keyPrefix: "NX-A", deviceCount: 1 },
      { id: 202, keyPrefix: "NX-B", deviceCount: 2 },
      { id: 303, keyPrefix: "NX-C", deviceCount: 0 },
    ]);
  });
});

describe("custom license keys", () => {
  it("normalizes an optional custom key and rejects unsafe formats", () => {
    expect(normalizeCustomKey(" phzinfd ")).toBe("PHZINFD");
    expect(normalizeCustomKey("   ")).toBeNull();
    expect(() => normalizeCustomKey("key with spaces")).toThrow("4 a 64 caracteres");
    expect(() => normalizeCustomKey("ab")).toThrow("4 a 64 caracteres");
    expect(() => validateCustomKeyRequest(2, "PHZINFD")).toThrow("quantidade for 1");
    expect(validateCustomKeyRequest(50, undefined)).toBeNull();
  });

  it("stores the normalized custom key only as a hash and returns it once", async () => {
    const values = vi.fn().mockResolvedValueOnce([{ insertId: 77 }]).mockResolvedValueOnce(undefined);
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })),
      insert: vi.fn(() => ({ values })),
    };
    getDb.mockResolvedValue(db);
    const result = await createLicense({ createdBy: 7, deviceLimit: 1, durationDays: 3, customKey: " phzinfd " });
    expect(result.key).toBe("PHZINFD");
    expect(values.mock.calls[0][0].keyHash).toHaveLength(64);
    expect(values.mock.calls[0][0]).not.toHaveProperty("key");
  });

  it("persists a one-hour duration without starting its expiry", async () => {
    const values = vi.fn().mockResolvedValueOnce([{ insertId: 78 }]).mockResolvedValueOnce(undefined);
    const db = { insert: vi.fn(() => ({ values })) };
    getDb.mockResolvedValue(db);
    const result = await createLicense({ createdBy: 7, deviceLimit: 1, durationDays: 1, durationMinutes: 60 });
    const inserted = values.mock.calls[0][0];
    expect(result.id).toBe(78);
    expect(inserted.durationMinutes).toBe(60);
    expect(inserted.durationDays).toBe(1);
    expect(inserted.expiresAt).toBeNull();
  });

  it("rejects a duplicate custom key before inserting", async () => {
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 12 }]) })) })) })), insert: vi.fn() };
    getDb.mockResolvedValue(db);
    await expect(createLicense({ createdBy: 7, deviceLimit: 1, customKey: "PHZINFD" })).rejects.toThrow("já existe");
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("device limit and expired cleanup", () => {
  it("clamps new device limits to 2000", async () => {
    const values = vi.fn().mockResolvedValueOnce([{ insertId: 99 }]);
    const db = { insert: vi.fn(() => ({ values })) };
    getDb.mockResolvedValue(db);
    await createLicense({ createdBy: 7, deviceLimit: 5000, durationDays: 1 });
    expect(values.mock.calls[0][0].deviceLimit).toBe(2000);
  });

  it("deletes expired licenses and dependent rows, while remaining safe when rerun", async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const tx = { delete: vi.fn(() => ({ where: deleteWhere })) };
    const db = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([{ id: 12 }, { id: 13 }]) })) })),
      transaction: vi.fn(async callback => callback(tx)),
    };
    getDb.mockResolvedValue(db);
    expect(await deleteExpiredLicenses(new Date("2026-08-27T00:00:00.000Z"))).toEqual({ deleted: 2 });
    expect(tx.delete).toHaveBeenCalledTimes(3);
    const emptyDb = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn().mockResolvedValue([]) })) })) };
    getDb.mockResolvedValue(emptyDb);
    expect(await deleteExpiredLicenses()).toEqual({ deleted: 0 });
  });
});

describe("license administration", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates a raw key once and stores only its hash and prefix", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 42 }]);
    const db = { insert: vi.fn(() => ({ values })) };
    getDb.mockResolvedValue(db);
    const result = await createLicense({ createdBy: 7, deviceLimit: 2, expiresAt: null });
    expect(result.id).toBe(42);
    expect(result.key).toMatch(/^EXTERNAL-[A-Z0-9_-]+$/);
    expect(values).toHaveBeenCalled();
    const firstInsert = values.mock.calls[0][0];
    expect(firstInsert.keyHash).toHaveLength(64);
    expect(firstInsert.keyHash).not.toBe(result.key);
    expect(firstInsert.keyPrefix).toBe(result.key.slice(0, 11));
  });

  it("resets a key by clearing devices and activation state", async () => {
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const tx = { delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })), update: vi.fn(() => ({ set })), insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) };
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 42 }]) })) })) })), transaction: vi.fn(async callback => callback(tx)) };
    getDb.mockResolvedValue(db);
    await resetLicense(42);
    expect(tx.delete).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({ status: "active", activatedAt: null, expiresAt: null, revokedAt: null });
  });

  it("deletes a key and its dependent records only after ownership is confirmed", async () => {
    const tx = { delete: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) };
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 42 }]) })) })) })), transaction: vi.fn(async callback => callback(tx)) };
    getDb.mockResolvedValue(db);
    await deleteLicense(42, 7);
    expect(tx.delete).toHaveBeenCalledTimes(3);
  });

  it("records revoke and reactivate transitions", async () => {
    const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([{ id: 42 }]) })) })) })), update: vi.fn(() => ({ set })), insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })) };
    getDb.mockResolvedValue(db);
    await setLicenseStatus(42, "revoked");
    await setLicenseStatus(42, "active");
    expect(set).toHaveBeenNthCalledWith(1, expect.objectContaining({ status: "revoked", revokedAt: expect.any(Date) }));
    expect(set).toHaveBeenNthCalledWith(2, { status: "active", revokedAt: null });
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  it("generates a requested batch and clamps it to 500 items", async () => {
    const values = vi.fn().mockResolvedValue([{ insertId: 42 }]);
    const tx = { insert: vi.fn(() => ({ values })) };
    const db = { transaction: vi.fn(async callback => callback(tx)) };
    getDb.mockResolvedValue(db);
    const batch = await createLicenses({ createdBy: 7, count: 52, deviceLimit: 1, expiresAt: null });
    expect(batch.keys).toHaveLength(52);
    expect(new Set(batch.keys.map(item => item.key)).size).toBe(52);
    expect(values).toHaveBeenCalledTimes(104);
    expect(values.mock.calls[0][0].keyHash).toHaveLength(64);
    expect(values.mock.calls[0][0]).not.toHaveProperty("key");
    expect(normalizeLicenseBatchCount(0)).toBe(1);
    expect(normalizeLicenseBatchCount(500)).toBe(500);
    expect(normalizeLicenseBatchCount(501)).toBe(500);
  });

  it("rolls back the whole batch when one insert fails", async () => {
    const persisted: unknown[] = [];
    const values = vi.fn()
      .mockImplementationOnce(async value => { persisted.push(value); return [{ insertId: 1 }]; })
      .mockRejectedValueOnce(new Error("duplicate hash"));
    const tx = { insert: vi.fn(() => ({ values })) };
    const db = { transaction: vi.fn(async callback => { try { const result = await callback(tx); return result; } catch (error) { persisted.length = 0; throw error; } }) };
    getDb.mockResolvedValue(db);
    await expect(createLicenses({ createdBy: 7, count: 2, deviceLimit: 1, expiresAt: null })).rejects.toThrow("duplicate hash");
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(persisted).toHaveLength(0);
  });

  it("rejects status changes for a license outside the reseller scope", async () => {
    const db = { select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) })) })) };
    getDb.mockResolvedValue(db);
    await expect(setLicenseStatus(99, "revoked", 7)).rejects.toThrow("Licença não encontrada");
  });
});

describe("invalid license support link", () => {
  it("returns the WhatsApp support URL for an unknown key", async () => {
    const chain: any = { limit: vi.fn().mockResolvedValue([]), then: (resolve: any, reject: any) => Promise.resolve([]).then(resolve, reject) };
    const db: any = {
      select: vi.fn(() => ({ from: vi.fn(() => ({ where: vi.fn(() => chain) })) })),
      insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
    };
    getDb.mockResolvedValue(db);
    const result = await validateLicense({ key: "NX-REMOVED-KEY", deviceId: "device-support", packageName: "com.app", appVersion: "1" });
    expect(result).toMatchObject({ valid: false, code: "invalid_key", supportUrl: "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t" });
  });
});
