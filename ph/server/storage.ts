// Storage helpers for Railway Object Storage (S3-compatible), with Forge fallback.

import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ENV } from "./_core/env";

function getS3Config() {
  const endpoint = (process.env.AWS_ENDPOINT_URL || process.env.ENDPOINT || process.env.AWS_S3_ENDPOINT || "").trim();
  const bucket = (process.env.AWS_S3_BUCKET_NAME || process.env.BUCKET || process.env.AWS_BUCKET_NAME || "").trim();
  const region = (process.env.AWS_DEFAULT_REGION || process.env.REGION || process.env.AWS_REGION || "auto").trim();
  const accessKeyId = (process.env.AWS_ACCESS_KEY_ID || process.env.ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY || "").trim();
  const secretAccessKey = (process.env.AWS_SECRET_ACCESS_KEY || process.env.SECRET_ACCESS_KEY || process.env.AWS_SECRET_KEY || "").trim();
  const hasAnyRailwayConfig = Boolean(endpoint || bucket || accessKeyId || secretAccessKey);
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    if (hasAnyRailwayConfig) {
      console.error("[Storage] Railway S3 configuration incomplete", {
        endpoint: Boolean(endpoint),
        bucket: Boolean(bucket),
        accessKeyId: Boolean(accessKeyId),
        secretAccessKey: Boolean(secretAccessKey),
      });
    }
    return null;
  }
  return {
    bucket,
    client: new S3Client({
      endpoint,
      region,
      forcePathStyle: false,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) return null;
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const s3 = getS3Config();

  if (s3) {
    const body = typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
    await s3.client.send(
      new PutObjectCommand({
        Bucket: s3.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return { key, url: `/manus-storage/${key}` };
  }

  const forge = getForgeConfig();
  if (!forge) {
    throw new Error(
      "Storage config missing: configure Railway S3 variables or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }

  const presignUrl = new URL("v1/storage/presign/put", forge.forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forge.forgeKey}` },
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }

  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const s3 = getS3Config();
  if (s3) {
    return getSignedUrl(
      s3.client,
      new GetObjectCommand({ Bucket: s3.bucket, Key: key }),
      { expiresIn: 3600 },
    );
  }

  const forge = getForgeConfig();
  if (!forge) {
    throw new Error(
      "Storage config missing: configure Railway S3 variables or BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY",
    );
  }
  const getUrl = new URL("v1/storage/presign/get", forge.forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${forge.forgeKey}` },
  });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  if (!url) throw new Error("Forge returned empty signed URL");
  return url;
}
