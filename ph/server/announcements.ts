import { sql } from "drizzle-orm";
import { getDb } from "./db";

export type AnnouncementInput = {
  announcement: string;
  url?: string | null;
  freeFireLogoUrl?: string | null;
  freeFireMaxLogoUrl?: string | null;
  textureBannerUrl?: string | null;
  targetResellerId?: number | null;
};

export async function ensureAnnouncementTable() {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS announcement (
    id INT NOT NULL PRIMARY KEY,
    announcement TEXT NOT NULL,
    url VARCHAR(512) NULL,
    freeFireLogoUrl VARCHAR(1024) NULL,
    freeFireMaxLogoUrl VARCHAR(1024) NULL,
    textureBannerUrl VARCHAR(2048) NULL,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    targetResellerId INT NULL
  )`));
  try { await db.execute(sql.raw("ALTER TABLE announcement ADD COLUMN targetResellerId INT NULL")); } catch { /* coluna já existe */ }
  try { await db.execute(sql.raw("ALTER TABLE announcement ADD COLUMN textureBannerUrl VARCHAR(2048) NULL")); } catch { /* coluna já existe */ }
}

export async function getAnnouncement(targetResellerId?: number | null) {
  await ensureAnnouncementTable();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.execute(sql.raw("SELECT id, announcement, url, freeFireLogoUrl, freeFireMaxLogoUrl, textureBannerUrl, targetResellerId, updatedAt FROM announcement WHERE id = 1 LIMIT 1"));
  const rows = (result as any)[0] as any[];
  const row = rows[0] ?? null;
  if (!row) return null;
  if (row.targetResellerId != null && Number(row.targetResellerId) !== Number(targetResellerId ?? 0)) return null;
  return row;
}

export async function updateAnnouncement(input: AnnouncementInput) {
  await ensureAnnouncementTable();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.execute(sql`INSERT INTO announcement (id, announcement, url, freeFireLogoUrl, freeFireMaxLogoUrl, textureBannerUrl, targetResellerId)
    VALUES (1, ${input.announcement.trim()}, ${input.url?.trim() || null}, ${input.freeFireLogoUrl?.trim() || null}, ${input.freeFireMaxLogoUrl?.trim() || null}, ${input.textureBannerUrl?.trim() || null}, ${input.targetResellerId ?? null})
    ON DUPLICATE KEY UPDATE announcement = VALUES(announcement), url = VALUES(url), freeFireLogoUrl = VALUES(freeFireLogoUrl), freeFireMaxLogoUrl = VALUES(freeFireMaxLogoUrl), textureBannerUrl = VALUES(textureBannerUrl), targetResellerId = VALUES(targetResellerId)`);
  return getAnnouncement(input.targetResellerId);
}
