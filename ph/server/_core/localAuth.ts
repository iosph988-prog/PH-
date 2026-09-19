import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import { eq } from "drizzle-orm";
import { users } from "../../drizzle/schema";
import { getDb } from "../db";

const scrypt = promisify(scryptCallback);
export const LOCAL_SESSION_COOKIE = "license_atelier_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const tokenSecret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || "change-this-session-secret";
const adminEmail = () => (process.env.ADMIN_EMAIL || "").trim().toLowerCase();

function cookieOptions(req: Request) {
  const forwarded = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0].trim();
  return { httpOnly: true, sameSite: "lax" as const, secure: forwarded === "https", path: "/" };
}

function sign(payload: string) { return createHmac("sha256", tokenSecret()).update(payload).digest("base64url"); }
function hashOpenId(email: string) { return createHmac("sha256", tokenSecret()).update(`local-admin:${email}`).digest("hex").slice(0, 60); }

async function verifyPassword(password: string, encoded: string) {
  const [scheme, saltHex, hashHex] = encoded.split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const derived = Buffer.from(await scrypt(password, Buffer.from(saltHex, "hex"), 64) as Buffer);
  const expected = Buffer.from(hashHex, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

async function getOrCreateAdmin() {
  const email = adminEmail();
  if (!email) throw new Error("ADMIN_EMAIL não configurado");
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const openId = hashOpenId(email);
  const existing = (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
  if (existing) return existing;
  await db.insert(users).values({ openId, name: "Administrador", email, loginMethod: "local", role: "admin" });
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function loginLocalAdmin(req: Request, res: Response, emailInput: string, password: string) {
  const email = emailInput.trim().toLowerCase();
  if (!email || email !== adminEmail()) return false;
  const encodedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!encodedHash || !(await verifyPassword(password, encodedHash))) return false;
  const user = await getOrCreateAdmin();
  if (!user) return false;
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ uid: user.id, exp: expiresAt }), "utf8").toString("base64url");
  res.cookie(LOCAL_SESSION_COOKIE, `${payload}.${sign(payload)}`, { ...cookieOptions(req), maxAge: SESSION_TTL_MS });
  return true;
}

export async function getLocalUser(req: Request) {
  const token = parseCookieHeader(req.headers.cookie ?? "")[LOCAL_SESSION_COOKIE];
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signature !== sign(payload)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { uid: number; exp: number };
    if (!Number.isInteger(parsed.uid) || parsed.exp <= Date.now()) return null;
    const db = await getDb();
    if (!db) return null;
    return (await db.select().from(users).where(eq(users.id, parsed.uid)).limit(1))[0] ?? null;
  } catch { return null; }
}

export function logoutLocal(req: Request, res: Response) { res.clearCookie(LOCAL_SESSION_COOKIE, cookieOptions(req)); }

export function localAuthConfigured() { return Boolean(adminEmail() && process.env.ADMIN_PASSWORD_HASH); }
