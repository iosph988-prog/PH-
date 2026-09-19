import { and, count, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, licenseDevices, licenseEvents, licenseKeys, resellerInvitations, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};
    let invitedReseller = false;
    if (user.email && user.openId !== ENV.ownerOpenId) {
      const pendingInvite = await db.select({ id: resellerInvitations.id }).from(resellerInvitations)
        .where(and(eq(resellerInvitations.email, user.email.trim().toLowerCase()), eq(resellerInvitations.status, "pending")))
        .limit(1);
      invitedReseller = pendingInvite.length > 0;
      if (invitedReseller) {
        values.role = "reseller";
        updateSet.role = "reseller";
      }
    }

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
    if (invitedReseller && user.email) {
      await db.update(resellerInvitations)
        .set({ status: "accepted", acceptedAt: new Date() })
        .where(and(eq(resellerInvitations.email, user.email.trim().toLowerCase()), eq(resellerInvitations.status, "pending")));
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

export const MAX_RESELLERS = 500;

export function calculateResellerCapacity(active: number, pending: number, limit = MAX_RESELLERS) {
  const normalizedActive = Math.max(0, Math.floor(active));
  const normalizedPending = Math.max(0, Math.floor(pending));
  const normalizedLimit = Math.max(0, Math.floor(limit));
  const total = normalizedActive + normalizedPending;
  return { active: normalizedActive, pending: normalizedPending, total, limit: normalizedLimit, available: Math.max(0, normalizedLimit - total) };
}

export async function getResellerCapacity() {
  const db = await getDb();
  if (!db) return calculateResellerCapacity(0, 0);
  const [activeRow] = await db.select({ total: count() }).from(users).where(eq(users.role, "reseller"));
  const [pendingRow] = await db.select({ total: count() }).from(resellerInvitations).where(eq(resellerInvitations.status, "pending"));
  return calculateResellerCapacity(Number(activeRow?.total ?? 0), Number(pendingRow?.total ?? 0));
}

export async function createResellerInvitation(input: { email: string; displayName?: string | null; createdBy: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error("E-mail obrigatório");
  const existingInvite = await db.select({ id: resellerInvitations.id }).from(resellerInvitations)
    .where(and(eq(resellerInvitations.email, email), eq(resellerInvitations.status, "pending"))).limit(1);
  if (existingInvite.length === 0) {
    const capacity = await getResellerCapacity();
    if (capacity.total >= MAX_RESELLERS) throw new Error(`Limite de ${MAX_RESELLERS} revendedores atingido`);
  }
  const result = await db.insert(resellerInvitations).values({
    email,
    displayName: input.displayName?.trim() || null,
    createdBy: input.createdBy,
    status: "pending",
  }).onDuplicateKeyUpdate({
    set: { displayName: input.displayName?.trim() || null, createdBy: input.createdBy, status: "pending", revokedAt: null, acceptedAt: null },
  });
  return { id: Number(result[0].insertId), email };
}

export async function listResellerInvitations() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resellerInvitations).orderBy(resellerInvitations.createdAt);
}

export async function revokeResellerInvitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(resellerInvitations).set({ status: "revoked", revokedAt: new Date() }).where(eq(resellerInvitations.id, id));
  return { success: true } as const;
}


export async function listResellers() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn })
    .from(users).where(eq(users.role, "reseller"));
}

export async function revokeResellerAccess(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(users).set({ role: "user" }).where(and(eq(users.id, id), eq(users.role, "reseller")));
  return { success: true } as const;
}

export async function removeResellerAndLicenses(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [reseller] = await db.select({ id: users.id, email: users.email }).from(users)
    .where(and(eq(users.id, id), eq(users.role, "reseller"))).limit(1);
  if (!reseller) throw new Error("Revendedor não encontrado ou já removido");
  const ownedLicenses = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(eq(licenseKeys.createdBy, id));
  const licenseIds = ownedLicenses.map(license => license.id);
  await db.transaction(async tx => {
    if (licenseIds.length > 0) {
      await tx.delete(licenseEvents).where(inArray(licenseEvents.licenseId, licenseIds));
      await tx.delete(licenseDevices).where(inArray(licenseDevices.licenseId, licenseIds));
      await tx.delete(licenseKeys).where(inArray(licenseKeys.id, licenseIds));
    }
    if (reseller.email) {
      await tx.update(resellerInvitations).set({ status: "revoked", revokedAt: new Date() })
        .where(and(eq(resellerInvitations.email, reseller.email), eq(resellerInvitations.status, "accepted")));
    }
    await tx.update(users).set({ role: "user" }).where(and(eq(users.id, id), eq(users.role, "reseller")));
  });
  return { success: true, deletedKeys: licenseIds.length } as const;
}
