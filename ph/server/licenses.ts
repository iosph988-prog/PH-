import { createHash, randomInt } from "node:crypto";
import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { getDb } from "./db";
import { licenseDevices, licenseEvents, licenseKeys, users } from "../drizzle/schema";

export const isLicensePayload = (value: unknown): value is { key: string; deviceId: string; packageName: string; appVersion: string } => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return [candidate.key, candidate.deviceId, candidate.packageName, candidate.appVersion].every(item => typeof item === "string" && item.trim().length > 0);
};

export const isLicenseGranted = (response: { valid?: unknown }) => response.valid === true;

export function evaluateLicenseAccess(input: { status: "active" | "revoked"; expiresAt: Date | null; deviceCount: number; deviceLimit: number; now?: Date }) {
  const now = input.now ?? new Date();
  if (input.status !== "active") return invalidLicenseResponse("revoked", "Chave revogada");
  if (input.expiresAt && input.expiresAt <= now) return invalidLicenseResponse("expired", "Chave expirada");
  if (input.deviceCount >= input.deviceLimit) return invalidLicenseResponse("device_limit", "Limite de dispositivos atingido");
  return { valid: true, code: "valid", message: "Chave válida" } as const;
}

const hashKey = (value: string) => createHash("sha256").update(value.trim()).digest("hex");

export const LICENSE_SUPPORT_URL = "https://whatsapp.com/channel/0029VbD6Arm8kyyQAho7UP2t";
type InvalidLicenseCode = "service_unavailable" | "invalid_key" | "revoked" | "expired" | "device_limit";
const invalidLicenseResponse = (code: InvalidLicenseCode, message: string) => ({ valid: false, code, message, supportUrl: LICENSE_SUPPORT_URL } as const);

const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const KEY_SUFFIX_LENGTH = 15;

export function generateRawKey() {
  let suffix = "";
  for (let index = 0; index < KEY_SUFFIX_LENGTH; index += 1) suffix += KEY_ALPHABET[randomInt(KEY_ALPHABET.length)];
  return `NX-${suffix}`;
}

async function recordEvent(input: typeof licenseEvents.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(licenseEvents).values(input);
}

export const normalizeDurationDays = (days: number) => Math.max(1, Math.min(30, Math.trunc(days || 30)));
export const normalizeDurationMinutes = (minutes: number) => Math.max(60, Math.min(30 * 24 * 60, Math.trunc(minutes || 30 * 24 * 60)));
const resolveDurationMinutes = (durationMinutes?: number, durationDays?: number) => durationMinutes == null ? normalizeDurationDays(durationDays ?? 30) * 24 * 60 : normalizeDurationMinutes(durationMinutes);

export function normalizeCustomKey(value?: string) {
  const normalized = value?.trim().toUpperCase() ?? "";
  if (!normalized) return null;
  if (!/^[A-Z0-9_-]{4,64}$/.test(normalized)) throw new Error("A chave personalizada deve ter de 4 a 64 caracteres: letras, números, hífen ou sublinhado.");
  return normalized;
}

export function validateCustomKeyRequest(quantity: number, value?: string) {
  const normalized = normalizeCustomKey(value);
  if (quantity > 1 && normalized) throw new Error("A chave personalizada só pode ser usada quando a quantidade for 1.");
  return normalized;
}

export const calculateActivationExpiry = (activatedAt: Date, durationDays: number, durationMinutes?: number) => new Date(activatedAt.getTime() + resolveDurationMinutes(durationMinutes, durationDays) * 60 * 1000);

export async function createLicense(input: { createdBy: number; deviceLimit: number; durationDays?: number; durationMinutes?: number; expiresAt?: Date | null; customKey?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const customKey = validateCustomKeyRequest(1, input.customKey);
  const rawKey = customKey ?? generateRawKey();
  const keyHash = hashKey(rawKey);
  if (customKey) {
    const existing = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(eq(licenseKeys.keyHash, keyHash)).limit(1);
    if (existing.length > 0) throw new Error("Essa chave personalizada já existe.");
  }
  const keyPrefix = rawKey.slice(0, 11);
  const inserted = await db.insert(licenseKeys).values({
    keyHash,
    keyPrefix,
    status: "active",
    deviceLimit: Math.max(1, Math.min(2000, Math.trunc(input.deviceLimit))),
    durationDays: Math.max(1, Math.ceil(resolveDurationMinutes(input.durationMinutes, input.durationDays) / (24 * 60))),
    durationMinutes: resolveDurationMinutes(input.durationMinutes, input.durationDays),
    expiresAt: input.expiresAt ?? null,
    createdBy: input.createdBy,
  });
  const licenseId = Number(inserted[0].insertId);
  await recordEvent({ licenseId, eventType: "created", metadata: JSON.stringify({ deviceLimit: input.deviceLimit, custom: Boolean(customKey) }) });
  return { id: licenseId, key: rawKey, keyPrefix };
}

export const normalizeLicenseBatchCount = (count: number) => Math.max(1, Math.min(50, Math.trunc(count)));

export async function createLicenses(input: { createdBy: number; count: number; deviceLimit: number; durationDays?: number; durationMinutes?: number; expiresAt?: Date | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const count = normalizeLicenseBatchCount(input.count);
  const deviceLimit = Math.max(1, Math.min(2000, Math.trunc(input.deviceLimit)));
  const keys = await db.transaction(async tx => {
    const created = [];
    for (let index = 0; index < count; index += 1) {
      const rawKey = generateRawKey();
      const inserted = await tx.insert(licenseKeys).values({
        keyHash: hashKey(rawKey),
        keyPrefix: rawKey.slice(0, 11),
        status: "active",
        deviceLimit,
        durationDays: Math.max(1, Math.ceil(resolveDurationMinutes(input.durationMinutes, input.durationDays) / (24 * 60))),
        durationMinutes: resolveDurationMinutes(input.durationMinutes, input.durationDays),
        expiresAt: input.expiresAt ?? null,
        createdBy: input.createdBy,
      });
      const licenseId = Number(inserted[0].insertId);
      await tx.insert(licenseEvents).values({ licenseId, eventType: "created", metadata: JSON.stringify({ deviceLimit }) });
      created.push({ id: licenseId, key: rawKey, keyPrefix: rawKey.slice(0, 11) });
    }
    return created;
  });
  return { keys };
}

export function mergeDeviceCounts<T extends { id: number }>(rows: T[], counts: Array<{ licenseId: number | string; deviceCount: number | string }>) {
  const countByLicense = new Map(counts.map(row => [Number(row.licenseId), Number(row.deviceCount)]));
  return rows.map(row => ({ ...row, deviceCount: countByLicense.get(Number(row.id)) ?? 0 }));
}

export async function listLicenses(search?: string, ownerId?: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    id: licenseKeys.id,
    keyPrefix: licenseKeys.keyPrefix,
    status: licenseKeys.status,
    expiresAt: licenseKeys.expiresAt,
    activatedAt: licenseKeys.activatedAt,
    durationDays: licenseKeys.durationDays,
    durationMinutes: licenseKeys.durationMinutes,
    deviceLimit: licenseKeys.deviceLimit,
    createdAt: licenseKeys.createdAt,
    revokedAt: licenseKeys.revokedAt,
    pausedAt: licenseKeys.pausedAt,
    creatorId: users.id,
    creatorName: users.name,
    creatorEmail: users.email,
    creatorRole: users.role,
  }).from(licenseKeys).leftJoin(users, eq(users.id, licenseKeys.createdBy)).where(and(
    search ? sql`${licenseKeys.keyPrefix} like ${`%${search}%`}` : undefined,
    ownerId ? eq(licenseKeys.createdBy, ownerId) : undefined,
  )).orderBy(desc(licenseKeys.createdAt));
  if (rows.length === 0) return [];
  const counts = await db.select({
    licenseId: licenseDevices.licenseId,
    deviceCount: sql<number>`count(*)`,
  }).from(licenseDevices).where(inArray(licenseDevices.licenseId, rows.map(row => row.id))).groupBy(licenseDevices.licenseId);
  return mergeDeviceCounts(rows, counts);
}

async function assertLicenseOwnership(id: number, ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const target = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(and(eq(licenseKeys.id, id), ownerId ? eq(licenseKeys.createdBy, ownerId) : undefined)).limit(1);
  if (target.length === 0) throw new Error("Licença não encontrada");
  return db;
}

export async function resetLicense(id: number, ownerId?: number) {
  const db = await assertLicenseOwnership(id, ownerId);
  await db.transaction(async tx => {
    await tx.delete(licenseDevices).where(eq(licenseDevices.licenseId, id));
    await tx.update(licenseKeys).set({ status: "active", activatedAt: null, expiresAt: null, revokedAt: null }).where(eq(licenseKeys.id, id));
    await tx.insert(licenseEvents).values({ licenseId: id, eventType: "reactivated", metadata: JSON.stringify({ action: "reset" }) });
  });
  return { success: true } as const;
}

export async function deleteLicense(id: number, ownerId?: number) {
  const db = await assertLicenseOwnership(id, ownerId);
  await db.transaction(async tx => {
    await tx.delete(licenseEvents).where(eq(licenseEvents.licenseId, id));
    await tx.delete(licenseDevices).where(eq(licenseDevices.licenseId, id));
    await tx.delete(licenseKeys).where(eq(licenseKeys.id, id));
  });
  return { success: true } as const;
}

/** Remove somente licenças ativas cujo prazo já terminou; segura para reexecução. */
export async function deleteExpiredLicenses(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const expired = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(and(
    eq(licenseKeys.status, "active"),
    lte(licenseKeys.expiresAt, now),
  ));
  if (expired.length === 0) return { deleted: 0 } as const;
  const ids = expired.map(row => row.id);
  await db.transaction(async tx => {
    await tx.delete(licenseEvents).where(inArray(licenseEvents.licenseId, ids));
    await tx.delete(licenseDevices).where(inArray(licenseDevices.licenseId, ids));
    await tx.delete(licenseKeys).where(inArray(licenseKeys.id, ids));
  });
  return { deleted: ids.length } as const;
}

export async function pauseAllLicenses() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const active = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(eq(licenseKeys.status, "active"));
  if (active.length === 0) return { success: true, paused: 0 } as const;
  const ids = active.map(row => row.id);
  const now = new Date();
  await db.transaction(async tx => {
    await tx.update(licenseKeys).set({ status: "revoked", revokedAt: now, pausedAt: now }).where(eq(licenseKeys.status, "active"));
    await tx.insert(licenseEvents).values(ids.map(licenseId => ({ licenseId, eventType: "revoked" as const, metadata: JSON.stringify({ action: "pause_all" }) })));
  });
  return { success: true, paused: ids.length } as const;
}

export async function resumeAllLicenses() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const paused = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(and(eq(licenseKeys.status, "revoked"), sql`${licenseKeys.pausedAt} IS NOT NULL`));
  if (paused.length === 0) return { success: true, resumed: 0 } as const;
  const ids = paused.map(row => row.id);
  await db.transaction(async tx => {
    await tx.update(licenseKeys).set({ status: "active", revokedAt: null, pausedAt: null }).where(and(eq(licenseKeys.status, "revoked"), sql`${licenseKeys.pausedAt} IS NOT NULL`));
    await tx.insert(licenseEvents).values(ids.map(licenseId => ({ licenseId, eventType: "reactivated" as const, metadata: JSON.stringify({ action: "resume_all" }) })));
  });
  return { success: true, resumed: ids.length } as const;
}

export async function setLicenseStatus(id: number, status: "active" | "revoked", ownerId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const target = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(and(eq(licenseKeys.id, id), ownerId ? eq(licenseKeys.createdBy, ownerId) : undefined)).limit(1);
  if (target.length === 0) throw new Error("Licença não encontrada");
  await db.update(licenseKeys).set({ status, revokedAt: status === "revoked" ? new Date() : null }).where(eq(licenseKeys.id, id));
  await recordEvent({ licenseId: id, eventType: status === "revoked" ? "revoked" : "reactivated" });
  return { success: true };
}

export async function getLicenseDetails(id: number, ownerId?: number) {
  const db = await getDb();
  if (!db) return { devices: [], events: [] };
  const owned = await db.select({ id: licenseKeys.id, createdBy: licenseKeys.createdBy }).from(licenseKeys).where(and(eq(licenseKeys.id, id), ownerId ? eq(licenseKeys.createdBy, ownerId) : undefined)).limit(1);
  if (owned.length === 0) return { devices: [], events: [] };
  const devices = await db.select().from(licenseDevices).where(eq(licenseDevices.licenseId, id)).orderBy(desc(licenseDevices.lastSeenAt));
  const events = await db.select().from(licenseEvents).where(eq(licenseEvents.licenseId, id)).orderBy(desc(licenseEvents.createdAt)).limit(40);
  const creator = (await db.select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.id, owned[0].createdBy)).limit(1))[0] ?? null;
  return { devices, events, creator };
}

export async function getLicenseEvents(limit = 40, ownerId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (!ownerId) return db.select().from(licenseEvents).orderBy(desc(licenseEvents.createdAt)).limit(limit);
  const owned = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(eq(licenseKeys.createdBy, ownerId));
  if (owned.length === 0) return [];
  return db.select().from(licenseEvents).where(inArray(licenseEvents.licenseId, owned.map(row => row.id))).orderBy(desc(licenseEvents.createdAt)).limit(limit);
}

export async function validateLicense(input: { key: string; deviceId: string; packageName: string; appVersion: string; ipAddress?: string }) {
  const db = await getDb();
  if (!db) return invalidLicenseResponse("service_unavailable", "Serviço temporariamente indisponível");
  const now = new Date();
  const keyHash = hashKey(input.key);
  const found = await db.select().from(licenseKeys).where(eq(licenseKeys.keyHash, keyHash)).limit(1);
  const license = found[0];
  if (!license) {
    await recordEvent({ eventType: "rejected", deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion, ipAddress: input.ipAddress, metadata: JSON.stringify({ code: "invalid_key" }) });
    return invalidLicenseResponse("invalid_key", "Chave inválida");
  }
  if (license.status !== "active") {
    await recordEvent({ licenseId: license.id, eventType: "rejected", deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion, ipAddress: input.ipAddress, metadata: JSON.stringify({ code: "revoked" }) });
    return invalidLicenseResponse("revoked", "Chave revogada");
  }
  if (license.expiresAt && license.expiresAt <= now) {
    await recordEvent({ licenseId: license.id, eventType: "rejected", deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion, ipAddress: input.ipAddress, metadata: JSON.stringify({ code: "expired" }) });
    return invalidLicenseResponse("expired", "Chave expirada");
  }
  const validation = await db.transaction(async tx => {
    const currentRows = await tx.select().from(licenseKeys).where(eq(licenseKeys.id, license.id)).limit(1);
    const current = currentRows[0];
    if (!current || current.status !== "active") return { ok: false as const, code: "revoked" as const };
    if (current.expiresAt && current.expiresAt <= now) return { ok: false as const, code: "expired" as const };
    const linked = await tx.select().from(licenseDevices).where(and(eq(licenseDevices.licenseId, current.id), eq(licenseDevices.deviceId, input.deviceId))).limit(1);
    if (linked.length === 0) {
      const countRows = await tx.select({ count: sql<number>`count(*)` }).from(licenseDevices).where(eq(licenseDevices.licenseId, current.id));
      if (Number(countRows[0]?.count ?? 0) >= current.deviceLimit) return { ok: false as const, code: "device_limit" as const };
      if (!current.activatedAt && !current.expiresAt) {
        const expiresAt = calculateActivationExpiry(now, current.durationDays, current.durationMinutes);
        const activationResult: any = await tx.update(licenseKeys).set({ activatedAt: now, expiresAt }).where(and(eq(licenseKeys.id, current.id), isNull(licenseKeys.activatedAt), isNull(licenseKeys.expiresAt)));
        const affectedRows = Number(activationResult?.[0]?.affectedRows ?? activationResult?.affectedRows ?? 0);
        if (affectedRows === 1) {
          current.activatedAt = now;
          current.expiresAt = expiresAt;
        } else {
          const refreshed = (await tx.select({ activatedAt: licenseKeys.activatedAt, expiresAt: licenseKeys.expiresAt }).from(licenseKeys).where(eq(licenseKeys.id, current.id)).limit(1))[0];
          current.activatedAt = refreshed?.activatedAt ?? current.activatedAt;
          current.expiresAt = refreshed?.expiresAt ?? current.expiresAt;
        }
      }
      await tx.insert(licenseDevices).values({ licenseId: current.id, deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion });
        return { ok: true as const, linked: true as const, activatedAt: current.activatedAt, expiresAt: current.expiresAt };
    }
    await tx.update(licenseDevices).set({ packageName: input.packageName, appVersion: input.appVersion, lastSeenAt: now }).where(eq(licenseDevices.id, linked[0].id));
    return { ok: true as const, linked: false as const, activatedAt: current.activatedAt, expiresAt: current.expiresAt };
  });
  if (!validation.ok) {
    await recordEvent({ licenseId: license.id, eventType: "rejected", deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion, ipAddress: input.ipAddress, metadata: JSON.stringify({ code: validation.code }) });
    return validation.code === "device_limit"
      ? invalidLicenseResponse("device_limit", "Limite de dispositivos atingido")
      : validation.code === "expired"
        ? invalidLicenseResponse("expired", "Chave expirada")
        : invalidLicenseResponse("revoked", "Chave revogada");
  }
  if (validation.linked) await recordEvent({ licenseId: license.id, eventType: "device_linked", deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion, ipAddress: input.ipAddress });
  await recordEvent({ licenseId: license.id, eventType: "validated", deviceId: input.deviceId, packageName: input.packageName, appVersion: input.appVersion, ipAddress: input.ipAddress });
  return {
    valid: true,
    code: "valid",
    message: "Chave válida",
    expiresAt: validation.expiresAt?.toISOString() ?? null,
    activatedAt: validation.activatedAt?.toISOString() ?? null,
    durationDays: license.durationDays,
    durationMinutes: license.durationMinutes,
    deviceLimit: license.deviceLimit,
  } as const;
}
