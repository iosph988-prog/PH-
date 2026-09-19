import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { deleteExpiredLicenses, validateLicense } from "../licenses";
import { findScheduledJob } from "../scheduled";
import { sdk } from "./sdk";
import { getAuthorizedPatchUrl, listRemotePatchesForLicense } from "../remotePatches";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/license/validate", async (req, res) => {
    const { key, device_id: deviceId, package: packageName, app_version: appVersion } = req.body ?? {};
    if (typeof key !== "string" || typeof deviceId !== "string" || typeof packageName !== "string" || typeof appVersion !== "string" || !key.trim() || !deviceId.trim() || !packageName.trim() || !appVersion.trim()) {
      return res.status(400).json({ valid: false, code: "invalid_request", message: "Campos obrigatórios: key, device_id, package e app_version" });
    }
    try {
      const result = await validateLicense({ key, deviceId, packageName, appVersion, ipAddress: req.ip });
      return res.status(200).json(result);
    } catch (error) {
      console.error("[License API] Validation failed", error);
      return res.status(503).json({ valid: false, code: "service_unavailable", message: "Serviço temporariamente indisponível" });
    }
  });

  app.post("/api/patches/catalog", async (req, res) => {
    const { key, device_id: deviceId, package: packageName, app_version: appVersion } = req.body ?? {};
    if ([key, deviceId, packageName, appVersion].some(value => typeof value !== "string" || !value.trim())) {
      return res.status(400).json({ valid: false, code: "invalid_request", message: "Campos obrigatórios: key, device_id, package e app_version" });
    }
    try {
      const forwardedProto = String(req.headers["x-forwarded-proto"] || req.protocol).split(",")[0];
      const baseUrl = `${forwardedProto}://${req.get("host")}`;
      const result = await listRemotePatchesForLicense({ key, deviceId, packageName, appVersion, baseUrl });
      return res.status(result.valid ? 200 : 403).json(result);
    } catch (error) {
      console.error("[Patch API] Catalog failed", error);
      return res.status(503).json({ valid: false, code: "service_unavailable", message: "Serviço temporariamente indisponível" });
    }
  });
  app.post("/api/scheduled/cleanupExpiredLicenses", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ ok: false, error: "cron-only" });
      const job = await findScheduledJob(user.taskUid);
      if (!job) return res.status(200).json({ ok: true, skipped: "orphan" });
      const result = await deleteExpiredLicenses();
      return res.status(200).json({ ok: true, deleted: result.deleted });
    } catch (error) {
      console.error("[Scheduled cleanup] Failed", error);
      return res.status(500).json({ ok: false, error: String(error), timestamp: new Date().toISOString() });
    }
  });

  app.get("/api/patches/download", async (req, res) => {
    const token = typeof req.query.t === "string" ? req.query.t : "";
    const url = await getAuthorizedPatchUrl(token);
    if (!url) return res.status(403).json({ valid: false, code: "download_forbidden", message: "Download não autorizado" });
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.redirect(307, url);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
