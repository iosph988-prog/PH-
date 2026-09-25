import { createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { remotePatchVersions, remotePatches, licenseKeys } from "../drizzle/schema";
import { getDb } from "./db";
import { storagePut, storageGetSignedUrl } from "./storage";
import { validateLicense } from "./licenses";

const tokenSecret = () => process.env.JWT_SECRET || "development-only-secret";
const hash = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const encode = (value: string) => Buffer.from(value, "utf8").toString("base64url");
const decode = (value: string) => Buffer.from(value, "base64url").toString("utf8");

function signToken(payload: string) { return hash(`${payload}.${tokenSecret()}`); }

export function createPatchDownloadToken(input: { versionId: number; licenseHash: string; deviceId: string; packageName: string; expiresAt?: number }) {
  const payload = JSON.stringify({ v: input.versionId, l: input.licenseHash, d: input.deviceId, p: input.packageName, e: input.expiresAt ?? Date.now() + 5 * 60 * 1000 });
  const encoded = encode(payload);
  return `${encoded}.${signToken(encoded)}`;
}

export function parsePatchDownloadToken(token: string) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = signToken(encoded);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(decode(encoded)) as { v: number; l: string; d: string; p: string; e: number };
    if (!Number.isInteger(payload.v) || !payload.l || !payload.d || !payload.p || !Number.isFinite(payload.e) || payload.e <= Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function isValidPatchFileName(value: string) {
  const fileName = value.normalize("NFC").trim();
  const hasUnsafePathChars = fileName.split("").some(character => character === "/" || character === "\\" || character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);
  return fileName.length >= 1 && fileName.length <= 180 && /\.3105$/i.test(fileName) && !hasUnsafePathChars;
}

export function isRemotePatchUpload(value: unknown): value is { slug: string; title: string; game: string; fileName: string; data: string } {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return [candidate.slug, candidate.title, candidate.game, candidate.fileName, candidate.data].every(item => typeof item === "string" && item.trim().length > 0);
}

export type PatchSection = "patches" | "external";

const normalizeSection = (value: string | undefined): PatchSection => value === "external" ? "external" : "patches";
const normalizeGame = (value: string) => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  return normalized === "freefire" || normalized === "free-fire" ? "free-fire" : "free-fire-max";
};
const normalizeInterfaceTab = (value: string | null | undefined) => value?.trim().toUpperCase() || null;

let patchSchemaReady: Promise<void> | null = null;
async function ensurePatchSchema() {
  if (!patchSchemaReady) {
    patchSchemaReady = (async () => {
      const db = await getDb();
      if (!db) return;
      const [columns] = await db.execute(sql.raw("SHOW COLUMNS FROM remote_patches")) as any;
      const existing = new Set((columns as any[]).map(column => String(column.Field || column.field)));
      if (!existing.has("section")) await db.execute(sql.raw("ALTER TABLE remote_patches ADD COLUMN section ENUM('patches','external') NOT NULL DEFAULT 'patches'"));
      if (!existing.has("interfaceTab")) await db.execute(sql.raw("ALTER TABLE remote_patches ADD COLUMN interfaceTab VARCHAR(64) NULL"));
    })().catch(error => { patchSchemaReady = null; throw error; });
  }
  return patchSchemaReady;
}

async function createVersion(input: { patchId: number; createdBy: number; slug: string; fileName: string; data: Buffer; status?: "draft" | "published" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const latest = (await db.select({ version: remotePatchVersions.version }).from(remotePatchVersions).where(eq(remotePatchVersions.patchId, input.patchId)).orderBy(desc(remotePatchVersions.version)).limit(1))[0];
  const version = Number(latest?.version ?? 0) + 1;
  const digest = hash(input.data);
  const uploaded = await storagePut(`remote-patches/${input.slug}/v${version}`, input.data, "application/octet-stream");
  const inserted = await db.insert(remotePatchVersions).values({ patchId: input.patchId, version, fileName: input.fileName, storageKey: uploaded.key, sha256: digest, sizeBytes: input.data.length, status: input.status ?? "published", createdBy: input.createdBy });
  return { versionId: Number(inserted[0].insertId), version, sha256: digest, sizeBytes: input.data.length };
}

export async function publishRemotePatch(input: { createdBy: number; slug: string; title: string; game: string; fileName: string; data: Buffer; section?: PatchSection; interfaceTab?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await ensurePatchSchema();
  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim();
  const game = normalizeGame(input.game);
  const fileName = input.fileName.trim();
  const section = normalizeSection(input.section);
  const interfaceTab = normalizeInterfaceTab(input.interfaceTab);
  if (!/^[a-z0-9][a-z0-9_-]{2,95}$/.test(slug)) throw new Error("Slug inválido");
  if (!title || title.length > 160 || !isValidPatchFileName(fileName)) throw new Error("Nome ou título inválido");
  if (section === "external" && (!interfaceTab || interfaceTab.length > 64)) throw new Error("A aba do Online separado é obrigatória");
  if (input.data.length === 0 || input.data.length > 50 * 1024 * 1024) throw new Error("O arquivo deve ter entre 1 byte e 50 MB");

  const existing = (await db.select().from(remotePatches).where(eq(remotePatches.slug, slug)).limit(1))[0];
  const patchId = existing?.id ?? Number((await db.insert(remotePatches).values({ slug, title, game, section, interfaceTab, createdBy: input.createdBy }).$returningId())[0]?.id);
  if (!patchId) throw new Error("Não foi possível criar o patch");
  const created = await createVersion({ patchId, createdBy: input.createdBy, slug, fileName, data: input.data });
  await db.update(remotePatches).set({ title, game, section, interfaceTab, currentVersionId: created.versionId }).where(eq(remotePatches.id, patchId));
  return { patchId, ...created, slug, fileName, section, interfaceTab };
}

export async function listRemotePatches(section?: PatchSection, includeInactive = false) {
  const db = await getDb();
  if (!db) return [];
  await ensurePatchSchema();
  const filters = includeInactive ? [] : [eq(remotePatchVersions.status, "published")];
  if (section === "external") filters.push(or(eq(remotePatches.section, "external"), isNotNull(remotePatches.interfaceTab))!);
  else if (section) filters.push(eq(remotePatches.section, normalizeSection(section)));
  const rows = await db.select({ patch: remotePatches, version: remotePatchVersions }).from(remotePatches).innerJoin(remotePatchVersions, eq(remotePatchVersions.id, remotePatches.currentVersionId)).where(and(...filters)).orderBy(remotePatches.game, remotePatches.slug);
  return rows.map(({ patch, version }) => ({ id: patch.id, slug: patch.slug, title: patch.title, game: patch.game, section: patch.section, interfaceTab: patch.interfaceTab, versionId: version.id, version: version.version, fileName: version.fileName, sha256: version.sha256, sizeBytes: version.sizeBytes, status: version.status, publishedAt: version.publishedAt }));
}

export async function updateRemotePatch(input: { id: number; updatedBy: number; title?: string; game?: string; fileName?: string; data?: Buffer; interfaceTab?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await ensurePatchSchema();
  const patch = (await db.select().from(remotePatches).where(eq(remotePatches.id, input.id)).limit(1))[0];
  if (!patch) throw new Error("Patch não encontrado");
  const title = input.title?.trim() || patch.title;
  const game = input.game ? normalizeGame(input.game) : patch.game;
  const interfaceTab = input.interfaceTab === undefined ? patch.interfaceTab : normalizeInterfaceTab(input.interfaceTab);
  if (!title || title.length > 160) throw new Error("Título inválido");
  if (patch.section === "external" && !interfaceTab) throw new Error("A aba do Online separado é obrigatória");
  let currentVersionId = patch.currentVersionId;
  if (input.data) {
    const fileName = input.fileName?.trim() || "updated.3105";
    if (!isValidPatchFileName(fileName) || input.data.length > 50 * 1024 * 1024) throw new Error("Arquivo .3105 inválido");
    const created = await createVersion({ patchId: patch.id, createdBy: input.updatedBy, slug: patch.slug, fileName, data: input.data });
    currentVersionId = created.versionId;
  }
  await db.update(remotePatches).set({ title, game, interfaceTab, currentVersionId }).where(eq(remotePatches.id, patch.id));
  return { success: true, id: patch.id, versionId: currentVersionId } as const;
}

export async function setRemotePatchStatus(input: { id: number; status: "published" | "draft" }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const patch = (await db.select({ currentVersionId: remotePatches.currentVersionId }).from(remotePatches).where(eq(remotePatches.id, input.id)).limit(1))[0];
  if (!patch?.currentVersionId) throw new Error("Patch não encontrado");
  await db.update(remotePatchVersions).set({ status: input.status }).where(eq(remotePatchVersions.id, patch.currentVersionId));
  return { success: true, status: input.status } as const;
}

export async function listRemotePatchesForLicense(input: { key: string; deviceId: string; packageName: string; appVersion: string; baseUrl: string; section?: PatchSection }) {
  const validation = await validateLicense(input);
  if (!validation.valid) return validation;
  const catalog = await listRemotePatches(input.section);
  const licenseHash = hash(input.key.trim());
  const externalTab = (value: string | null) => {
    const normalized = String(value || "").trim().toUpperCase();
    return ({ MIRA: "aim", AIM: "aim", "FUNÇÕES": "aim", FUNCTIONS: "aim", ESP: "esp", GERAL: "general", GENERAL: "general", "EXTRAS/FERRAMENTAS": "general", EXTRAS: "general", FERRAMENTAS: "general", TOOLS: "general", "RAIO-X": "xray", XRAY: "xray", OUTROS: "other", OTHER: "other", PERFIL: "profile", PROFILE: "profile" } as Record<string, string>)[normalized] || "other";
  };
  return { ...validation, patches: catalog.map(patch => {
    const rawGame = String(patch.game || "").trim().toLowerCase();
    const gameBase = rawGame.startsWith("online-") ? rawGame.split(":")[0] : (rawGame === "free-fire" || rawGame === "freefire" ? "online-free-fire" : "online-free-fire-max");
    const game = patch.section === "external" || patch.interfaceTab
      ? `${gameBase}:${externalTab(patch.interfaceTab)}`
      : patch.game;
    return { ...patch, game, downloadUrl: `${input.baseUrl}/api/patches/download?v=${patch.versionId}&t=${encodeURIComponent(createPatchDownloadToken({ versionId: patch.versionId, licenseHash, deviceId: input.deviceId, packageName: input.packageName }))}` };
  }) };
}

export async function getAuthorizedPatchUrl(token: string) {
  const payload = parsePatchDownloadToken(token);
  if (!payload) return null;
  const db = await getDb();
  if (!db) return null;
  const license = (await db.select({ id: licenseKeys.id, expiresAt: licenseKeys.expiresAt }).from(licenseKeys).where(and(eq(licenseKeys.keyHash, payload.l), eq(licenseKeys.status, "active"))).limit(1))[0];
  if (!license || (license.expiresAt && license.expiresAt <= new Date())) return null;
  const version = (await db.select().from(remotePatchVersions).where(and(eq(remotePatchVersions.id, payload.v), eq(remotePatchVersions.status, "published"))).limit(1))[0];
  if (!version) return null;
  return storageGetSignedUrl(version.storageKey);
}


export { hash };
