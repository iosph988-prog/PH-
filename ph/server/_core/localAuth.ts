import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { eq, or, sql } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

const scrypt = promisify(scryptCallback);
export const LOCAL_SESSION_COOKIE = "license_atelier_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const tokenSecret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || "change-this-session-secret";
const adminEmail = () => (process.env.ADMIN_EMAIL || "iosph988@gmail.com").trim().toLowerCase();

async function ensureResellerColumns(db: any) {
  for (const statement of [
    "ALTER TABLE users ADD COLUMN username varchar(64) NULL",
    "ALTER TABLE users ADD COLUMN passwordHash varchar(255) NULL",
    "ALTER TABLE users ADD COLUMN credits int NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN resellerExpiresAt timestamp NULL",
  ]) { try { await db.execute(sql.raw(statement)); } catch { /* already exists */ } }
}
function cookieOptions(req: Request) { const forwarded = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0].trim(); return { httpOnly: true, sameSite: "lax" as const, secure: forwarded === "https", path: "/" }; }
function sign(payload: string) { return createHmac("sha256", tokenSecret()).update(payload).digest("base64url"); }
function hashOpenId(value: string) { return createHmac("sha256", tokenSecret()).update(`local:${value}`).digest("hex").slice(0, 60); }
async function verifyPassword(password: string, encoded: string) { const [scheme, saltHex, hashHex] = encoded.split("$"); if (scheme !== "scrypt" || !saltHex || !hashHex) return false; const derived = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), 64) as Buffer); const expected = Buffer.from(hashHex, "hex"); return expected.length === derived.length && timingSafeEqual(expected, derived); }
export async function hashLocalPassword(password: string) { const salt = randomBytes(16); const derived = Buffer.from(await scrypt(password, salt, 64) as Buffer); return `scrypt$${salt.toString("hex")}$${derived.toString("hex")}`; }
function verifyPlainPassword(password: string, configured: string) { const received = Buffer.from(password, "utf8"); const expected = Buffer.from(configured, "utf8"); return received.length === expected.length && timingSafeEqual(received, expected); }

async function getOrCreateAdmin() {
  const email = adminEmail(); const db = await getDb(); if (!db) throw new Error("Database unavailable"); await ensureResellerColumns(db);
  const openId = hashOpenId(`admin:${email}`); const existing = (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
  if (existing) { if (existing.role !== "admin") await db.update(users).set({ role: "admin", email, name: existing.name || "Administrador", loginMethod: "local" }).where(eq(users.id, existing.id)); return (await db.select().from(users).where(eq(users.id, existing.id)).limit(1))[0]; }
  await db.insert(users).values({ openId, name: "Administrador", email, loginMethod: "local", role: "admin" });
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function loginLocalAdmin(req: Request, res: Response, identifierInput: string, password: string) {
  const identifier = identifierInput.trim().toLowerCase(); if (!identifier || !password) return false; const db = await getDb(); if (!db) return false; await ensureResellerColumns(db);
  let user: any;
  if (identifier === adminEmail()) { const encodedHash = process.env.ADMIN_PASSWORD_HASH; const configuredPassword = process.env.ADMIN_PASSWORD; const ok = configuredPassword ? verifyPlainPassword(password, configuredPassword) : Boolean(encodedHash && await verifyPassword(password, encodedHash)); if (!ok) return false; user = await getOrCreateAdmin(); }
  else { user = (await db.select().from(users).where(or(eq(users.username, identifier), eq(users.email, identifier))).limit(1))[0]; if (!user || user.role !== "reseller" || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) return false; if (user.resellerExpiresAt && new Date(user.resellerExpiresAt) <= new Date()) return false; }
  if (!user) return false; const expiresAt = Date.now() + SESSION_TTL_MS; const payload = Buffer.from(JSON.stringify({ uid: user.id, exp: expiresAt }), "utf8").toString("base64url"); res.cookie(LOCAL_SESSION_COOKIE, `${payload}.${sign(payload)}`, { ...cookieOptions(req), maxAge: SESSION_TTL_MS }); return true;
}

export async function getLocalUser(req: Request) {
  const token = parseCookieHeader(req.headers.cookie ?? "")[LOCAL_SESSION_COOKIE]; if (!token) return null; const [payload, signature] = token.split("."); if (!payload || !signature || signature !== sign(payload)) return null;
  try { const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid: number; exp: number }; if (!Number.isInteger(parsed.uid) || parsed.exp <= Date.now()) return null; const db = await getDb(); if (!db) return null; await ensureResellerColumns(db); const user = (await db.select().from(users).where(eq(users.id, parsed.uid)).limit(1))[0] ?? null; if (user?.role === "reseller" && user.resellerExpiresAt && new Date(user.resellerExpiresAt) <= new Date()) return null; return user; } catch { return null; }
}
export function logoutLocal(req: Request, res: Response) { const cookies = parseCookieHeader(req.headers.cookie ?? ""); if (cookies[LOCAL_SESSION_COOKIE]) res.clearCookie(LOCAL_SESSION_COOKIE, cookieOptions(req)); }
export function localAuthConfigured() { return Boolean(adminEmail() && (process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD)); }
export async function createLocalReseller(input: { username: string; password: string; credits: number; expiresAt: Date | null; name?: string }) {
  const db = await getDb(); if (!db) throw new Error("Database unavailable"); await ensureResellerColumns(db); const username = input.username.trim().toLowerCase(); const validUsername = /^[a-z0-9._-]{3,64}$/.test(username); const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username); if (!validUsername && !validEmail) throw new Error("Usuário ou e-mail inválido"); if (input.password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres"); const existing = await db.select({ id: users.id }).from(users).where(or(eq(users.username, username), eq(users.email, username))).limit(1); if (existing.length) throw new Error("Esse usuário já existe"); const result = await db.insert(users).values({ openId: hashOpenId(`reseller:${username}`), username, passwordHash: await hashLocalPassword(input.password), name: input.name?.trim() || username, loginMethod: "local", role: "reseller", credits: Math.max(0, Math.trunc(input.credits)), resellerExpiresAt: input.expiresAt }); return { id: Number(result[0].insertId), username };
}
