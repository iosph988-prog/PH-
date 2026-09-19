import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router, staffProcedure } from "./_core/trpc";
import { consumeResellerCredits, createResellerInvitation, getResellerCapacity, listResellerInvitations, listResellers, removeResellerAndLicenses, revokeResellerAccess, revokeResellerInvitation } from "./db";
import { createLicense, createLicenses, deleteLicense, getLicenseDetails, getLicenseEvents, listLicenses, pauseAllLicenses, resetLicense, resumeAllLicenses, setLicenseStatus, validateCustomKeyRequest, validateLicense } from "./licenses";
import { isValidPatchFileName, listRemotePatches, publishRemotePatch, setRemotePatchStatus, updateRemotePatch } from "./remotePatches";
import { getAnnouncement, updateAnnouncement } from "./announcements";
import { createLocalReseller, logoutLocal } from "./_core/localAuth";

const licenseInput = z.object({
  key: z.string().trim().min(8).max(200),
  device_id: z.string().trim().min(3).max(255),
  package: z.string().trim().min(1).max(255),
  app_version: z.string().trim().min(1).max(64),
});

export const appRouter = router({
  system: systemRouter,
  announcement: router({
    get: publicProcedure.query(() => getAnnouncement()),
    update: adminProcedure.input(z.object({ announcement: z.string().trim().max(5000), url: z.string().trim().max(512).nullable().optional(), freeFireLogoUrl: z.string().trim().max(1024).nullable().optional(), freeFireMaxLogoUrl: z.string().trim().max(1024).nullable().optional() })).mutation(({ input }) => updateAnnouncement(input)),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      logoutLocal(ctx.req, ctx.res);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  patches: router({
    list: adminProcedure.input(z.object({ section: z.enum(["patches", "external"]).optional() }).optional()).query(({ input }) => listRemotePatches(input?.section, true)),
    publish: adminProcedure.input(z.object({ slug: z.string().trim().min(3).max(96), title: z.string().trim().min(1).max(160), game: z.string().trim().min(1).max(64), section: z.enum(["patches", "external"]).default("patches"), interfaceTab: z.string().trim().max(64).optional(), fileName: z.string().trim().refine(isValidPatchFileName, "Nome de arquivo .3105 inválido"), dataBase64: z.string().min(1).max(70_000_000) })).mutation(async ({ input, ctx }) => publishRemotePatch({ createdBy: ctx.user.id, slug: input.slug, title: input.title, game: input.game, section: input.section, interfaceTab: input.interfaceTab, fileName: input.fileName, data: Buffer.from(input.dataBase64, "base64") })),
    edit: adminProcedure.input(z.object({ id: z.number().int().positive(), title: z.string().trim().min(1).max(160).optional(), game: z.string().trim().min(1).max(64).optional(), interfaceTab: z.string().trim().max(64).nullable().optional(), fileName: z.string().trim().refine(isValidPatchFileName, "Nome de arquivo .3105 inválido").optional(), dataBase64: z.string().min(1).max(70_000_000).optional() })).mutation(({ input, ctx }) => updateRemotePatch({ id: input.id, updatedBy: ctx.user.id, title: input.title, game: input.game, interfaceTab: input.interfaceTab, fileName: input.fileName, data: input.dataBase64 ? Buffer.from(input.dataBase64, "base64") : undefined })),
    activate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => setRemotePatchStatus({ id: input.id, status: "published" })),
    deactivate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => setRemotePatchStatus({ id: input.id, status: "draft" })),
  }),
  licenses: router({
    list: staffProcedure.input(z.object({ search: z.string().optional() }).optional()).query(({ input, ctx }) => listLicenses(input?.search, ctx.user.role === "reseller" ? ctx.user.id : undefined)),
    events: staffProcedure.query(({ ctx }) => getLicenseEvents(40, ctx.user.role === "reseller" ? ctx.user.id : undefined)),
    details: staffProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input, ctx }) => getLicenseDetails(input.id, ctx.user.role === "reseller" ? ctx.user.id : undefined)),
    // A chave bruta só é retornada aqui, dentro de adminProcedure, uma única vez.
    create: staffProcedure.input(z.object({ quantity: z.number().int().min(1).max(50).default(1), deviceLimit: z.number().int().min(1).max(2000), durationDays: z.number().int().min(1).max(30).default(30), durationMinutes: z.number().int().min(60).max(43200).optional(), customKey: z.string().trim().max(64).optional() })).mutation(async ({ input, ctx }) => {
      if (ctx.user.role === "reseller") await consumeResellerCredits(ctx.user.id, input.quantity);
      const normalizedCustomKey = validateCustomKeyRequest(input.quantity, input.customKey);
      if (input.quantity === 1) {
        const result = await createLicense({ createdBy: ctx.user.id, deviceLimit: input.deviceLimit, durationDays: input.durationDays, durationMinutes: input.durationMinutes, customKey: normalizedCustomKey ?? undefined });
        return { keys: [result], key: result.key };
      }
      const result = await createLicenses({ createdBy: ctx.user.id, count: input.quantity, deviceLimit: input.deviceLimit, durationDays: input.durationDays, durationMinutes: input.durationMinutes });
      return { ...result, key: result.keys[0]?.key ?? null };
    }),
    reset: staffProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => resetLicense(input.id, ctx.user.role === "reseller" ? ctx.user.id : undefined)),
    delete: staffProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input, ctx }) => deleteLicense(input.id, ctx.user.role === "reseller" ? ctx.user.id : undefined)),
    revoke: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => setLicenseStatus(input.id, "revoked")),
    reactivate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => setLicenseStatus(input.id, "active")),
    pauseAll: adminProcedure.mutation(() => pauseAllLicenses()),
    resumeAll: adminProcedure.mutation(() => resumeAllLicenses()),
    invitations: router({
      createAccount: adminProcedure.input(z.object({ username: z.string().trim().min(3).max(64), password: z.string().min(6).max(200), credits: z.number().int().min(0).max(100000), expiresAt: z.string().datetime().nullable().optional(), name: z.string().trim().max(160).optional() })).mutation(({ input }) => createLocalReseller({ username: input.username, password: input.password, credits: input.credits, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, name: input.name })),
      list: adminProcedure.query(() => listResellerInvitations()),
      active: adminProcedure.query(() => listResellers()),
      capacity: adminProcedure.query(() => getResellerCapacity()),
      create: adminProcedure.input(z.object({ email: z.string().email().max(320), displayName: z.string().trim().max(160).optional() })).mutation(({ input, ctx }) => createResellerInvitation({ email: input.email, displayName: input.displayName, createdBy: ctx.user.id })),
      revoke: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => revokeResellerInvitation(input.id)),
      revokeAccess: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => revokeResellerAccess(input.id)),
      remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => removeResellerAndLicenses(input.id)),
    }),
    // Endpoint público retorna somente o resultado da validação; nunca retorna chave ou hash.
    validate: publicProcedure.input(licenseInput).mutation(({ input, ctx }) => validateLicense({ key: input.key, deviceId: input.device_id, packageName: input.package, appVersion: input.app_version, ipAddress: ctx.req.ip })),
  }),
});

export type AppRouter = typeof appRouter;
