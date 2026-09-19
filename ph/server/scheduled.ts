import { eq } from "drizzle-orm";
import { scheduledJobs } from "../drizzle/schema";
import { getDb } from "./db";

export const CLEANUP_SCHEDULE = {
  name: "expired-license-cleanup",
  cronExpression: "0 * * * * *",
  callbackPath: "/api/scheduled/cleanupExpiredLicenses",
} as const;

export async function findScheduledJob(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const rows = await db.select().from(scheduledJobs).where(eq(scheduledJobs.taskUid, taskUid)).limit(1);
  return rows[0] ?? null;
}

export async function saveScheduledJob(input: {
  name: string;
  taskUid: string;
  cronExpression: string;
  callbackPath: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(scheduledJobs).values(input);
}
