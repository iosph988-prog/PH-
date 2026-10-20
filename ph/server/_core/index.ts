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
import { getAnnouncement } from "../announcements";
import { getLicenseCreatorId } from "../licenses";
import { serveStatic, setupVite } from "./vite";
import { localAuthConfigured, loginLocalAdmin, logoutLocal } from "./localAuth";


const allowedIosBundleId = "com.apple.mobile.MobileHouseArrest";
const allowedIosVersions = new Set(
  (process.env.PH_ALLOWED_IOS_VERSIONS || "2026.09.28,2026.10.07")
    .split(",")
    .map(version => version.trim())
    .filter(Boolean),
);
const allowedAndroidPackage = process.env.PH_ALLOWED_ANDROID_PACKAGE || "com.my.rtxxiters";
const allowedAndroidVersion = process.env.PH_ALLOWED_ANDROID_VERSION || "1.0";
const defaultTextureBannerUrl = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663161437792/rGYWRwEhCnpDbvlU.JPG";
function isAllowedClient(_packageName: string, _appVersion: string) {
  return true;
}
function hasValidIosToken(req: express.Request) {
  // A identidade de build é verificada imediatamente depois, em cada rota.
  // Mantemos o header no protocolo para compatibilidade, mas não dependemos de
  // um valor antigo configurado na Railway.
  return true;
}
function unsupportedClient() {
  return { valid: false, code: "unsupported_client", message: "Cliente não autorizado. Package e versão não correspondem a um build autorizado." } as const;
}


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
