/**
 * Downscale + re-encode an image in the browser before upload.
 *
 * Why: Vercel serverless rejects request bodies over ~4.5 MB, and without R2
 * configured the image is stored as base64 in the DB (×1.37 size) on the
 * question/exam row — which has a hard character cap. A phone photo straight
 * off the camera blows past both. We compress to a *byte budget* so the
 * resulting base64 is always safely under the column limit, stepping the
 * dimension and JPEG quality down until it fits.
 *
 * GIFs pass through untouched (re-encoding would kill the animation).
 */

// Keep the encoded result under this so base64 (~1.37×) stays well below the
// 3.5M-char column cap on imageUrl.
const TARGET_MAX_BYTES = 1_400_000;
const MAX_DIMENSION = 1600;
const MIN_DIMENSION = 700;
// Files already small enough and within dimensions are left alone.
const SKIP_BELOW_BYTES = 250_000;

export type CompressResult =
  | { ok: true; blob: Blob; changed: boolean }
  | { ok: false; reason: "undecodable" };

function canvasToBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

export async function compressImageDetailed(
  file: File
): Promise<CompressResult> {
  if (file.type === "image/gif") return { ok: true, blob: file, changed: false };

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    // Browser can't decode it here (common for HEIC outside Safari).
    return { ok: false, reason: "undecodable" };
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const baseScale = Math.min(1, MAX_DIMENSION / longest);
    if (baseScale === 1 && file.size <= SKIP_BELOW_BYTES) {
      return { ok: true, blob: file, changed: false };
    }

    // Try progressively smaller dimensions × lower quality until under budget.
    const dimSteps = [baseScale, baseScale * 0.8, baseScale * 0.62];
    const qualitySteps = [0.85, 0.72, 0.58];

    let best: Blob | null = null;
    for (const dim of dimSteps) {
      const w = Math.max(1, Math.round(bitmap.width * dim));
      const h = Math.max(1, Math.round(bitmap.height * dim));
      if (Math.max(w, h) < MIN_DIMENSION && best) break;

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff"; // flatten transparency for JPEG
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(bitmap, 0, 0, w, h);

      for (const q of qualitySteps) {
        const blob = await canvasToBlob(canvas, q);
        if (!blob) continue;
        best = blob;
        if (blob.size <= TARGET_MAX_BYTES) {
          return { ok: true, blob, changed: true };
        }
      }
    }

    if (best && best.size < file.size) {
      return { ok: true, blob: best, changed: true };
    }
    return { ok: true, blob: file, changed: false };
  } finally {
    bitmap.close();
  }
}

/** Back-compat thin wrapper — returns the blob, or the original on failure. */
export async function compressImage(file: File): Promise<Blob> {
  const r = await compressImageDetailed(file);
  return r.ok ? r.blob : file;
}
