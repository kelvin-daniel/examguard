/**
 * Pluggable object storage.
 *
 * If R2_ENDPOINT + R2_ACCESS_KEY_ID + R2_SECRET_ACCESS_KEY + R2_BUCKET +
 * R2_PUBLIC_URL are all set, uploads go to Cloudflare R2 (or any other
 * S3-compatible store) and we store the public URL in the DB.
 *
 * If any of those are missing, we just pass through the original base64
 * data URL — works for local dev and small-scale early production
 * (Turso comfortably holds a few hundred MB of base64 evidence).
 *
 * Migration is therefore non-destructive: the DB column already accepts
 * either a full data URL or an https URL, and `<img src>` handles both.
 */

import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

type R2Config = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

let _config: R2Config | null | undefined;
let _client: S3Client | null = null;

function config(): R2Config | null {
  if (_config !== undefined) return _config;
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;
  if (
    !endpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicUrl
  ) {
    _config = null;
    return null;
  }
  _config = { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl };
  return _config;
}

function client(): S3Client | null {
  if (_client) return _client;
  const c = config();
  if (!c) return null;
  _client = new S3Client({
    region: "auto",
    endpoint: c.endpoint,
    credentials: {
      accessKeyId: c.accessKeyId,
      secretAccessKey: c.secretAccessKey,
    },
  });
  return _client;
}

export function isRemoteStorageEnabled() {
  return config() !== null;
}

/**
 * Strip the data-URL prefix and return { mime, buffer }. Returns null if
 * the input isn't a data URL.
 */
function decodeDataUrl(
  dataUrl: string
): { mime: string; buffer: Buffer } | null {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return {
    mime: m[1],
    buffer: Buffer.from(m[2], "base64"),
  };
}

function extFromMime(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

/**
 * Upload a base64 data URL (or raw buffer) and return a URL the browser can
 * fetch. If R2 isn't configured, returns the original data URL unchanged.
 */
export async function uploadDataUrl(
  dataUrl: string,
  prefix = "evidence"
): Promise<string> {
  const c = client();
  if (!c) return dataUrl;
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return dataUrl; // not a data URL, leave it alone

  const cfg = config()!;
  const key = `${prefix}/${randomUUID()}.${extFromMime(decoded.mime)}`;

  try {
    await c.send(
      new PutObjectCommand({
        Bucket: cfg.bucket,
        Key: key,
        Body: decoded.buffer,
        ContentType: decoded.mime,
      })
    );
    return `${cfg.publicUrl.replace(/\/$/, "")}/${key}`;
  } catch (e) {
    console.error("[storage] R2 upload failed, falling back to data URL:", e);
    return dataUrl;
  }
}

/**
 * Upload raw bytes (used by question image upload from multipart form data).
 */
export async function uploadBuffer(
  buffer: Buffer,
  mime: string,
  prefix = "uploads"
): Promise<{ url: string; storedRemotely: boolean }> {
  const c = client();
  if (!c) {
    // Fall back to base64 data URL embedded in the response
    const dataUrl = `data:${mime};base64,${buffer.toString("base64")}`;
    return { url: dataUrl, storedRemotely: false };
  }
  const cfg = config()!;
  const key = `${prefix}/${randomUUID()}.${extFromMime(mime)}`;
  await c.send(
    new PutObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
    })
  );
  return {
    url: `${cfg.publicUrl.replace(/\/$/, "")}/${key}`,
    storedRemotely: true,
  };
}

/**
 * Best-effort delete — silently no-op if R2 isn't configured or the URL
 * isn't ours. We never block the request on a delete failure.
 */
export async function deleteByUrl(url: string | null): Promise<void> {
  if (!url) return;
  const cfg = config();
  if (!cfg) return; // base64 lives in the DB; deleting the row is enough
  const prefix = cfg.publicUrl.replace(/\/$/, "") + "/";
  if (!url.startsWith(prefix)) return; // not one of ours
  const key = url.slice(prefix.length);
  const c = client();
  if (!c) return;
  try {
    await c.send(new DeleteObjectCommand({ Bucket: cfg.bucket, Key: key }));
  } catch (e) {
    console.warn("[storage] delete failed:", e);
  }
}
