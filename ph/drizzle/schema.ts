import { index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "reseller"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const resellerInvitations = mysqlTable("reseller_invitations", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  displayName: varchar("displayName", { length: 160 }),
  status: mysqlEnum("status", ["pending", "accepted", "revoked"]).default("pending").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  acceptedAt: timestamp("acceptedAt"),
  revokedAt: timestamp("revokedAt"),
}, table => ({
  statusIdx: index("reseller_invitations_status_idx").on(table.status),
}));

export type ResellerInvitation = typeof resellerInvitations.$inferSelect;

export const licenseKeys = mysqlTable("license_keys", {
  id: int("id").autoincrement().primaryKey(),
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(),
  keyPrefix: varchar("keyPrefix", { length: 24 }).notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).default("active").notNull(),
  expiresAt: timestamp("expiresAt"),
  durationDays: int("durationDays").default(30).notNull(),
  durationMinutes: int("durationMinutes").default(43200).notNull(),
  activatedAt: timestamp("activatedAt"),
  deviceLimit: int("deviceLimit").default(1).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  revokedAt: timestamp("revokedAt"),
  pausedAt: timestamp("pausedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  statusIdx: index("license_keys_status_idx").on(table.status),
  expiresIdx: index("license_keys_expires_idx").on(table.expiresAt),
  activatedIdx: index("license_keys_activated_idx").on(table.activatedAt),
}));

export const licenseDevices = mysqlTable("license_devices", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId").notNull(),
  deviceId: varchar("deviceId", { length: 255 }).notNull(),
  packageName: varchar("packageName", { length: 255 }).notNull(),
  appVersion: varchar("appVersion", { length: 64 }).notNull(),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().onUpdateNow().notNull(),
}, table => ({
  licenseDeviceIdx: index("license_devices_license_idx").on(table.licenseId),
  deviceIdx: index("license_devices_device_idx").on(table.deviceId),
}));

export const licenseEvents = mysqlTable("license_events", {
  id: int("id").autoincrement().primaryKey(),
  licenseId: int("licenseId"),
  eventType: mysqlEnum("eventType", ["created", "validated", "rejected", "revoked", "reactivated", "device_linked"]).notNull(),
  deviceId: varchar("deviceId", { length: 255 }),
  packageName: varchar("packageName", { length: 255 }),
  appVersion: varchar("appVersion", { length: 64 }),
  ipAddress: varchar("ipAddress", { length: 64 }),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => ({
  licenseEventIdx: index("license_events_license_idx").on(table.licenseId),
  eventDateIdx: index("license_events_created_idx").on(table.createdAt),
}));

export type LicenseKey = typeof licenseKeys.$inferSelect;
export type LicenseDevice = typeof licenseDevices.$inferSelect;
export type LicenseEvent = typeof licenseEvents.$inferSelect;

export const scheduledJobs = mysqlTable("scheduled_jobs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  taskUid: varchar("taskUid", { length: 65 }).notNull().unique(),
  cronExpression: varchar("cronExpression", { length: 64 }).notNull(),
  callbackPath: varchar("callbackPath", { length: 160 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduledJob = typeof scheduledJobs.$inferSelect;

export const remotePatches = mysqlTable("remote_patches", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  game: varchar("game", { length: 64 }).notNull(),
  section: mysqlEnum("section", ["patches", "external"]).default("patches").notNull(),
  interfaceTab: varchar("interfaceTab", { length: 64 }),
  currentVersionId: int("currentVersionId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => ({ gameIdx: index("remote_patches_game_idx").on(table.game) }));

export const remotePatchVersions = mysqlTable("remote_patch_versions", {
  id: int("id").autoincrement().primaryKey(),
  patchId: int("patchId").notNull(),
  version: int("version").notNull(),
  fileName: varchar("fileName", { length: 180 }).notNull(),
  storageKey: varchar("storageKey", { length: 512 }).notNull(),
  sha256: varchar("sha256", { length: 64 }).notNull(),
  sizeBytes: int("sizeBytes").notNull(),
  status: mysqlEnum("status", ["draft", "published"]).default("published").notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  publishedAt: timestamp("publishedAt").defaultNow().notNull(),
}, table => ({ patchIdx: index("remote_patch_versions_patch_idx").on(table.patchId), statusIdx: index("remote_patch_versions_status_idx").on(table.status) }));

export type RemotePatch = typeof remotePatches.$inferSelect;
export type RemotePatchVersion = typeof remotePatchVersions.$inferSelect;
