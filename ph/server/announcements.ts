import { sql } from "drizzle-orm";
import { getDb } from "./db";

export type AnnouncementInput = {
  announcement: string;
  url?: string | null;
  freeFireLogoUrl?: string | null;
  freeFireMaxLogoUrl?: string | null;
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
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`));
}

export async function getAnnouncement() {
  await ensureAnnouncementTable();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const result = await db.execute(sql.raw("SELECT id, announcement, url, freeFireLogoUrl, freeFireMaxLogoUrl, updatedAt FROM announcement WHERE id = 1 LIMIT 1"));
  const rows = (result as any)[0] as any[];
  return rows[0] ?? null;
}

export async function updateAnnouncement(input: AnnouncementInput) {
  await ensureAnnouncementTable();
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.execute(sql`INSERT INTO announcement (id, announcement, url, freeFireLogoUrl, freeFireMaxLogoUrl)
    VALUES (1, ${input.announcement.trim()}, ${input.url?.trim() || null}, ${input.freeFireLogoUrl?.trim() || null}, ${input.freeFireMaxLogoUrl?.trim() || null})
    ON DUPLICATE KEY UPDATE announcement = VALUES(announcement), url = VALUES(url), freeFireLogoUrl = VALUES(freeFireLogoUrl), freeFireMaxLogoUrl = VALUES(freeFireMaxLogoUrl)`);
  return getAnnouncement();
}
